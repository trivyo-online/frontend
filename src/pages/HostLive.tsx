import { useCallback, useEffect, useMemo, useState } from 'react'
import { Distribution, Leaderboard, StatTile } from '../components/Charts'
import { Console, NetBanner, StatusPill } from '../components/Console'
import { SharePanel } from '../components/Share'
import { Button, Notice, SectionHead } from '../components/UI'
import { asFrame, getEvent, resetEvent, hostSocketUrl, type BoardEntry, type EventDoc, type RoomSummary } from '../lib/api'
import { navigate } from '../lib/router'
import { useCountdown } from '../lib/useCountdown'
import { useSession } from '../lib/useSession'
import { useSocket } from '../lib/useSocket'

interface Open {
  no: number
  deadline: number
}

export function HostLive({ params }: { params: URLSearchParams }) {
  const session = useSession()
  const room = (params.get('room') ?? '').toUpperCase()
  const [event, setEvent] = useState<EventDoc | null>(null)
  const [summary, setSummary] = useState<RoomSummary | null>(null)
  const [err, setErr] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [open, setOpen] = useState<Open | null>(null)
  const [counts, setCounts] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [board, setBoard] = useState<BoardEntry[]>([])
  const [ended, setEnded] = useState(false)
  const [notice, setNotice] = useState('')
  const [info, setInfo] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (!session) {
      navigate('admin')
      return
    }
    getEvent(room)
      .then((r) => setEvent(r.event))
      .catch((e) => setErr((e as Error).message))
  }, [room, session])

  const onMessage = useCallback((data: unknown) => {
    const f = asFrame(data)
    if (!f) return
    switch (f.type) {
      case 'welcome':
        setBoard(f.leaderboard)
        setSummary(f.room)
        // Reconnected mid-question: pick up where the room is.
        if (f.state) {
          setOpen({ no: f.state.questionno, deadline: Date.now() + f.state.secondsleft * 1000 })
          setRevealed(f.state.revealed)
          if (f.state.stats) setCounts(f.state.stats.counts)
        }
        break
      case 'room':
        setSummary(f.room)
        break
      case 'players':
        setPlayers(f.players.slice().sort((a, b) => a.localeCompare(b)))
        break
      case 'question':
        setOpen({ no: f.questionno, deadline: Date.now() + Math.max(0, f.deadline - f.now) })
        setCounts(new Array(f.question.Options.length).fill(0))
        setRevealed(false)
        setSummary((s) => (s ? { ...s, startsat: undefined } : s))
        break
      case 'answer':
        setCounts((c) => c.map((n, i) => (i === f.choice ? n + 1 : n)))
        break
      case 'hostboard':
        setBoard(f.entries)
        break
      case 'reveal':
        setRevealed(true)
        if (f.stats) setCounts(f.stats.counts)
        break
      case 'end':
        setBoard(f.leaderboard)
        setEnded(true)
        break
      case 'reset':
        if (f.room) setSummary(f.room)
        setOpen(null)
        setCounts([])
        setRevealed(false)
        setBoard([])
        setNotice('')
        setInfo(`Players reset: ${f.players ?? 0} removed, ${f.answers ?? 0} answers cleared.`)
        break
      case 'error':
        setNotice(f.message)
        break
    }
  }, [])

  const url = useMemo(() => (event && session && !ended ? hostSocketUrl(room, session.token) : null), [event, session, room, ended])
  const { status, attempt, log, send } = useSocket(url, onMessage)
  const left = useCountdown(open?.deadline ?? 0)
  const toStart = useCountdown(summary?.startsat ?? 0)

  const total = summary?.questioncount ?? event?.Questions.length ?? 0
  const q = open ? event?.Questions[open.no] : undefined
  const nextNo = open ? open.no + 1 : 0
  const nextQ = event?.Questions[nextNo]
  const answered = counts.reduce((a, b) => a + b, 0)
  const auto = !!summary?.auto

  const cmd = (payload: object) => {
    setNotice('')
    setInfo('')
    if (!send(payload)) setNotice('Not connected; try again in a moment.')
  }

  const confirmReset = () =>
    window.confirm('Reset players? Everyone is removed, all answers for this test are cleared and the room goes back to its lobby.')

  // While connected the host socket resets the live room; after the test has
  // ended (socket closed) the API clears it and we reopen the lobby.
  const resetPlayers = async () => {
    if (!confirmReset()) return
    if (!ended) {
      cmd({ type: 'reset' })
      return
    }
    setNotice('')
    setResetting(true)
    try {
      const r = await resetEvent(room)
      setBoard([])
      setPlayers([])
      setOpen(null)
      setCounts([])
      setRevealed(false)
      setEnded(false)
      setInfo(`Players reset: ${r.players} removed, ${r.answers} answers cleared.`)
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setResetting(false)
    }
  }

  if (err) {
    return (
      <section className="screen center">
        <div className="panel narrow">
          <Notice tone="error">{err}</Notice>
          <Button onClick={() => navigate('admin')}>Back to events</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="screen stage">
      <NetBanner status={status} attempt={attempt} />
      <div className="stage-head">
        <div>
          <button className="mini" onClick={() => navigate('admin')}>
            ← EVENTS
          </button>
          <SectionHead marker="C" title={event?.Nameofroom ?? 'LOADING…'} />
        </div>
        <div className="stage-meta mono">
          {auto && (
            <span className="pill pill-open">
              <i />
              AUTO-RUN
            </span>
          )}
          <StatusPill status={ended ? 'closed' : status} />
        </div>
      </div>

      <div className="tiles">
        <StatTile label="PLAYERS" value={players.length} />
        <StatTile label="QUESTION" value={open ? `${open.no + 1}/${total}` : `0/${total}`} />
        <StatTile label="ANSWERS IN" value={open ? `${answered}/${players.length}` : '—'} />
        <StatTile label={summary?.startsat && !open ? 'STARTS IN' : 'TIME LEFT'} value={summary?.startsat && !open ? `${toStart}s` : open && !revealed ? `${left}s` : '—'} />
      </div>

      <div className="stage-grid">
        <div className="sheet">
          {ended ? (
            <>
              <p className="mono field-label">FINAL STANDINGS</p>
              <Leaderboard entries={board} />
              <div className="actions">
                <Button onClick={() => navigate('ranks', { room })}>Open results & charts</Button>
                <Button icon={false} onClick={resetPlayers} disabled={resetting} title="Clear players and answers so the test can run again">
                  {resetting ? 'Resetting…' : 'Reset players'}
                </Button>
                <Button icon={false} onClick={() => navigate('admin')}>
                  Back to events
                </Button>
              </div>
              {notice && <Notice tone="error">{notice}</Notice>}
            </>
          ) : (
            <>
              {q ? (
                <div className="now">
                  <p className="mono dim">
                    ON AIR · Q.{String(open!.no + 1).padStart(2, '0')}
                  </p>
                  <h2 className="display qtext">{q.Question}</h2>
                  <Distribution stat={{ options: q.Options, counts, correctoption: Number(q.Correctoption), total: answered }} reveal={revealed} />
                </div>
              ) : (
                <SharePanel room={room} />
              )}

              {notice && <Notice tone="error">{notice}</Notice>}
              {info && <Notice tone="ok">{info}</Notice>}

              <div className="actions">
                {!auto && nextQ && (
                  <Button variant="solid" onClick={() => cmd({ type: 'question', questionno: nextNo })} disabled={status !== 'open'}>
                    {open ? `Next · Q${nextNo + 1}` : 'Start test'}
                  </Button>
                )}
                {!auto && open && !revealed && (
                  <Button icon={false} onClick={() => cmd({ type: 'reveal' })} disabled={status !== 'open'}>
                    Reveal answer
                  </Button>
                )}
                {auto ? (
                  <Button icon={false} onClick={() => cmd({ type: 'manual' })} disabled={status !== 'open'}>
                    Take manual control
                  </Button>
                ) : (
                  <Button icon={false} onClick={() => cmd({ type: 'auto', delay: open ? 0 : 5 })} disabled={status !== 'open' || !nextQ} title="Runs each question for its timer, reveals, then moves on">
                    {open ? 'Auto-run the rest' : 'Auto-run (starts in 5s)'}
                  </Button>
                )}
                <Button icon={false} onClick={() => window.confirm('End the test for everyone?') && cmd({ type: 'end' })} disabled={status !== 'open'}>
                  End test
                </Button>
                <Button icon={false} onClick={resetPlayers} disabled={status !== 'open'} title="Remove every player and clear their answers, back to the lobby">
                  Reset players
                </Button>
              </div>

              {nextQ && !auto && (
                <p className="mono dim small">
                  UP NEXT · {nextQ.Question} · ANSWER {String.fromCharCode(65 + Number(nextQ.Correctoption))}
                </p>
              )}
            </>
          )}
        </div>

        <div className="side">
          {open && !ended && (
            <div className="console pad">
              <SharePanel room={room} />
            </div>
          )}
          <div className="console pad">
            <p className="mono field-label">LIVE RANKING</p>
            <Leaderboard entries={board.slice(0, 10)} compact />
          </div>
          <div className="console pad">
            <p className="mono field-label">IN THE ROOM · {players.length}</p>
            <ul className="chips">
              {players.length === 0 && <li className="mono dim">— nobody yet —</li>}
              {players.slice(0, 120).map((p) => (
                <li key={p} className="tag">
                  <i />
                  {p}
                </li>
              ))}
              {players.length > 120 && <li className="mono dim">+{players.length - 120} MORE</li>}
            </ul>
          </div>
          <details className="console">
            <summary className="console-head mono">SIGNAL LOG</summary>
            <Console log={log} title="FRAMES" />
          </details>
        </div>
      </div>
    </section>
  )
}
