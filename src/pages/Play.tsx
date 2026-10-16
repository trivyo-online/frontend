import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Leaderboard } from '../components/Charts'
import { NetBanner, StatusPill } from '../components/Console'
import { QuestionCard } from '../components/QuestionCard'
import { Button, Notice } from '../components/UI'
import { asFrame, localDeadline, playerSocketUrl, roomInfo, type BoardEntry } from '../lib/api'
import { navigate } from '../lib/router'
import { useCountdown } from '../lib/useCountdown'
import { useSocket } from '../lib/useSocket'

interface Live {
  no: number
  total: number
  text: string
  options: string[]
  seconds: number
  deadline: number
}

function clock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Play({ params }: { params: URLSearchParams }) {
  const room = (params.get('room') ?? '').toUpperCase()
  const name = params.get('name') ?? ''

  const [roomName, setRoomName] = useState('')
  const [startsAt, setStartsAt] = useState(0)
  const [q, setQ] = useState<Live | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(null)
  const [answerIdx, setAnswerIdx] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [board, setBoard] = useState<BoardEntry[]>([])
  const [ended, setEnded] = useState(false)
  const [gone, setGone] = useState('')
  const [problem, setProblem] = useState('')
  // An answer the server hasn't acknowledged yet; resent after a reconnect.
  const pending = useRef<{ questionno: number; choice: number } | null>(null)
  const qRef = useRef<Live | null>(null)
  qRef.current = q

  const onMessage = useCallback((data: unknown) => {
    const f = asFrame(data)
    if (!f) return
    switch (f.type) {
      case 'welcome':
        setRoomName(f.room.name)
        setStartsAt(f.room.startsat ?? 0)
        setScore(f.score ?? 0)
        setBoard(f.leaderboard)
        setGone('')
        break
      case 'room':
        setStartsAt(f.room.startsat ?? 0)
        break
      case 'question':
        setStartsAt(0)
        // A rejoin re-sends the open question; keep local state if it's the same one.
        if (qRef.current?.no !== f.questionno) {
          setPicked(null)
          setResult(null)
          setAnswerIdx(null)
          setProblem('')
          if (pending.current?.questionno !== f.questionno) pending.current = null
        }
        setQ({ no: f.questionno, total: f.total, text: f.question.Question, options: f.question.Options, seconds: f.question.Eachquestiontime, deadline: localDeadline(f) })
        break
      case 'result':
        if (pending.current?.questionno === f.questionno) pending.current = null
        if (qRef.current?.no === f.questionno) {
          setPicked(f.choice)
          setResult({ correct: f.correct, points: f.points })
          if (f.correct) setAnswerIdx(f.choice)
        }
        setScore(f.score)
        break
      case 'reveal':
        if (qRef.current?.no === f.questionno) setAnswerIdx(f.correctoption)
        break
      case 'leaderboard':
        setBoard(f.entries)
        break
      case 'end':
        setBoard(f.leaderboard)
        setEnded(true)
        break
      case 'reset':
        // The host cleared the room; the socket closes and we rejoin a fresh lobby.
        pending.current = null
        setQ(null)
        setPicked(null)
        setResult(null)
        setAnswerIdx(null)
        setScore(0)
        setBoard([])
        setStartsAt(0)
        setProblem(f.message ? 'The host reset the room. You’re back in the lobby with a fresh score.' : '')
        break
      case 'error':
        if (f.code === 'late' || f.code === 'closed' || f.code === 'invalid') pending.current = null
        if (f.code === 'late') setProblem('That one arrived after time ran out.')
        else if (f.code !== 'duplicate') setProblem(f.message)
        break
    }
  }, [])

  const url = useMemo(() => (room && name && !ended && !gone ? playerSocketUrl(room, name) : null), [room, name, ended, gone])
  const { status, attempt, send } = useSocket(url, onMessage, () => {
    // Back online: replay an answer that may have been lost on the way.
    if (pending.current) window.setTimeout(() => pending.current && send({ type: 'answer', ...pending.current }), 300)
  })
  const left = useCountdown(q?.deadline ?? 0)
  const toStart = useCountdown(startsAt)

  // If reconnecting keeps failing, ask the API why instead of retrying forever.
  useEffect(() => {
    if (status !== 'reconnecting' && status !== 'error') return
    if (status === 'reconnecting' && attempt < 2) return
    let live = true
    roomInfo(room)
      .then((i) => {
        if (!live) return
        if (i.finished && !i.live) {
          setGone('This quiz has ended.')
          navigate('ranks', { room })
        } else if (!i.live) setGone('This room isn’t live any more.')
        else if (status === 'error') setGone(`Couldn’t join. Is “${name}” already playing here on another device? Try another name.`)
      })
      .catch((e) => live && (e as { status?: number }).status === 404 && setGone(`No room with code ${room}.`))
    return () => {
      live = false
    }
  }, [status, attempt, room, name])

  const answer = useCallback(
    (i: number) => {
      if (!q || picked !== null || left <= 0) return
      setPicked(i)
      pending.current = { questionno: q.no, choice: i }
      send({ type: 'answer', questionno: q.no, choice: i }) // if offline, onOpen resends it
    },
    [q, picked, left, send],
  )

  if (!room || !name) {
    return (
      <section className="screen center">
        <div className="panel narrow">
          <Notice tone="error">Missing room code or name.</Notice>
          <Button onClick={() => navigate('join')}>Back to join</Button>
        </div>
      </section>
    )
  }

  const rank = board.find((e) => e.userid.toLowerCase() === name.toLowerCase())?.rank
  const waitingAck = picked !== null && picked >= 0 && !result

  return (
    <section className="screen stage">
      <NetBanner status={status} attempt={attempt} />
      <div className="stage-head">
        <div>
          <p className="mono dim">{roomName || 'ROOM'}</p>
          <h1 className="display h2 code-display">{room}</h1>
        </div>
        <div className="stage-meta mono">
          <span>
            <strong>{name}</strong>
          </span>
          <span>
            SCORE <strong className="score-chip">{score}</strong>
          </span>
          {rank && <span>RANK #{rank}</span>}
          <StatusPill status={ended ? 'closed' : status} />
        </div>
      </div>

      <div className="stage-grid">
        <div>
          {gone ? (
            <div className="waiting">
              <h2 className="display h2">SIGNAL LOST</h2>
              <Notice tone="error">{gone}</Notice>
              <div className="actions">
                <Button onClick={() => navigate('join', { room })}>Back to join</Button>
                <Button icon={false} onClick={() => navigate('ranks', { room })}>
                  Results
                </Button>
              </div>
            </div>
          ) : ended ? (
            <div className="sheet">
              <p className="mono dim">FINAL STANDINGS</p>
              <h2 className="display score">
                {score}
                <span className="mono dim"> PTS{rank ? ` · #${rank}` : ''}</span>
              </h2>
              <Leaderboard entries={board} me={name} />
              <div className="actions">
                <Button onClick={() => navigate('ranks', { room })}>See the charts</Button>
                <Button icon={false} onClick={() => navigate('join')}>
                  Join another room
                </Button>
              </div>
            </div>
          ) : q ? (
            <>
              <QuestionCard
                index={q.no}
                total={q.total}
                question={q.text}
                options={q.options}
                selected={picked ?? (left <= 0 ? -1 : null)}
                correct={answerIdx}
                secondsLeft={left}
                seconds={q.seconds}
                onSelect={answer}
              />
              <p className="mono status-line" aria-live="polite">
                {result
                  ? result.correct
                    ? `■ CORRECT · +${result.points} PTS`
                    : '□ NOT THIS TIME'
                  : waitingAck
                    ? status === 'open'
                      ? 'LOCKED IN…'
                      : 'SAVED · SENDING WHEN YOU’RE BACK ONLINE'
                    : left <= 0
                      ? 'TIME UP'
                      : 'PICK ONE · KEYS 1–4'}
              </p>
            </>
          ) : (
            <div className="waiting">
              <span className="pulse" aria-hidden="true" />
              <h2 className="display h2">{startsAt && toStart > 0 ? `STARTS IN ${clock(toStart * 1000)}` : status === 'open' ? 'STAND BY' : 'TUNING IN'}</h2>
              <p className="lede">
                {status === 'open'
                  ? startsAt
                    ? 'You’re in the lobby. The quiz starts by itself; keep this page open.'
                    : 'You’re in. The first question appears here when your host starts.'
                  : 'Opening a line to the room…'}
              </p>
            </div>
          )}
          {problem && !gone && <Notice tone="error">{problem}</Notice>}
        </div>
        {!ended && !gone && (
          <div className="console pad">
            <p className="mono field-label">LIVE RANKING</p>
            <Leaderboard entries={board} me={name} compact />
          </div>
        )}
      </div>
    </section>
  )
}
