import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Console, StatusPill } from '../components/Console'
import { QuestionCard } from '../components/QuestionCard'
import { Button, Notice } from '../components/UI'
import { parseQuestion, playerSocketUrl, type AnswerMessage, type QuestionInput } from '../lib/api'
import { DEFAULT_SECONDS } from '../lib/questions'
import { navigate } from '../lib/router'
import { useSocket } from '../lib/useSocket'

type Live = QuestionInput & { index: number }

export function Play({ params }: { params: URLSearchParams }) {
  const roomid = params.get('roomid') ?? ''
  const hostid = params.get('hostid') ?? ''
  const userid = params.get('userid') ?? ''
  const valid = Boolean(roomid && hostid && userid)

  const [question, setQuestion] = useState<Live | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [left, setLeft] = useState(DEFAULT_SECONDS)
  const seen = useRef(0)

  const onMessage = useCallback((data: unknown) => {
    const q = parseQuestion(data)
    if (!q) return
    setQuestion({ ...q, index: q.index ?? seen.current })
    seen.current += 1
    setPicked(null)
    setLeft(q.Eachquestiontime ?? DEFAULT_SECONDS)
  }, [])

  const url = useMemo(() => (valid ? playerSocketUrl(roomid, hostid, userid) : null), [valid, roomid, hostid, userid])
  const { status, log, send } = useSocket(url, onMessage)

  useEffect(() => {
    if (!question || picked !== null || left <= 0) return
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [question, picked, left])

  const answer = useCallback(
    (i: number) => {
      if (!question || picked !== null || left <= 0) return
      setPicked(i)
      const msg: AnswerMessage = { roomid, userid, questionno: String(question.index), ans: question.Options[i] }
      send(msg)
    },
    [question, picked, left, roomid, userid, send],
  )

  if (!valid) {
    return (
      <section className="screen center">
        <div className="panel narrow">
          <Notice tone="error">Missing room code, host ID or name.</Notice>
          <Button onClick={() => navigate('join')}>Back to join</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="screen stage">
      <div className="stage-head">
        <div>
          <p className="mono dim">ROOM</p>
          <h1 className="display h2 code-display">{roomid}</h1>
        </div>
        <div className="stage-meta mono">
          <span>
            PLAYER <strong>{userid}</strong>
          </span>
          <StatusPill status={status} />
        </div>
      </div>

      <div className="stage-grid">
        <div>
          {question ? (
            <QuestionCard
              index={question.index}
              question={question.Question}
              options={question.Options}
              selected={picked ?? (left <= 0 ? -1 : null)}
              secondsLeft={left}
              seconds={question.Eachquestiontime ?? DEFAULT_SECONDS}
              onSelect={answer}
            />
          ) : (
            <div className="waiting">
              <span className="pulse" aria-hidden="true" />
              <h2 className="display h2">{status === 'open' ? 'STAND BY' : status === 'connecting' ? 'TUNING IN' : 'NO SIGNAL'}</h2>
              <p className="lede">
                {status === 'open'
                  ? 'You’re in. The next question appears here the moment your host sends it.'
                  : status === 'connecting'
                    ? 'Opening a line to the room…'
                    : 'Couldn’t reach the room. Check the code and host ID, and make sure the host has gone live.'}
              </p>
              {status !== 'open' && status !== 'connecting' && <Button onClick={() => navigate('join')}>Try again</Button>}
            </div>
          )}
          {picked !== null && picked >= 0 && <p className="mono dim status-line">ANSWER SENT · WAITING FOR NEXT QUESTION</p>}
          {question && picked === null && left <= 0 && <p className="mono dim status-line">TIME UP</p>}
        </div>
        <Console log={log} />
      </div>
    </section>
  )
}
