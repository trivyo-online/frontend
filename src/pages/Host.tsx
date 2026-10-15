import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import { Console, StatusPill } from '../components/Console'
import { Button, Field, Notice, SectionHead } from '../components/UI'
import { addQuestion, createEvent, hostSocketUrl, type AnswerMessage, type QuestionInput } from '../lib/api'
import { DEFAULT_SECONDS } from '../lib/questions'
import { useSocket } from '../lib/useSocket'

type Tab = 'event' | 'questions' | 'live'
type Msg = { tone: 'ok' | 'error' | 'info'; text: string } | null

const TABS: { key: Tab; n: string; label: string }[] = [
  { key: 'event', n: '01', label: 'Event' },
  { key: 'questions', n: '02', label: 'Questions' },
  { key: 'live', n: '03', label: 'Go live' },
]

const LETTERS = ['A', 'B', 'C', 'D']

function isAnswer(d: unknown): d is AnswerMessage {
  return !!d && typeof d === 'object' && 'ans' in d && 'userid' in d && 'questionno' in d
}

export function Host() {
  const [tab, setTab] = useState<Tab>('event')
  const [hostid, setHostid] = useState('')
  const [roomid, setRoomid] = useState('')
  const [questions, setQuestions] = useState<QuestionInput[]>([])

  return (
    <section className="screen stage">
      <div className="stage-head">
        <SectionHead marker="C" title={<>HOST<br />CONSOLE</>} />
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'is-active' : ''}`} onClick={() => setTab(t.key)}>
              <span className="mono dim">{t.n}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'event' && <EventForm hostid={hostid} setHostid={setHostid} roomid={roomid} setRoomid={setRoomid} next={() => setTab('questions')} />}
      {tab === 'questions' && <QuestionForm roomid={roomid} setRoomid={setRoomid} questions={questions} onAdded={(q) => setQuestions((l) => [...l, q])} />}
      {tab === 'live' && <LiveRoom hostid={hostid} setHostid={setHostid} roomid={roomid} setRoomid={setRoomid} questions={questions} />}
    </section>
  )
}

function EventForm(props: { hostid: string; setHostid: (v: string) => void; roomid: string; setRoomid: (v: string) => void; next: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const res = await createEvent({ Nameofroom: name, DateofQuiz: date, StartTime: time, HostID: props.hostid })
      setMsg({ tone: 'ok', text: `Event saved (record ${res.id}). Grab the 8-character room code from the database and enter it below to add questions.` })
    } catch (err) {
      setMsg({ tone: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="sheet" onSubmit={submit}>
      <div className="form-grid two">
        <Field label="EVENT NAME" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday Night Quiz" required />
        <Field label="HOST ID" value={props.hostid} onChange={(e) => props.setHostid(e.target.value)} placeholder="host-handle" required />
        <Field label="DATE" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Field label="START TIME" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div className="actions">
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create event'}</Button>
        <Field label="ROOM CODE" value={props.roomid} onChange={(e) => props.setRoomid(e.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={8} className="input code" />
        <Button type="button" icon={false} onClick={props.next} disabled={!props.roomid}>Next →</Button>
      </div>
    </form>
  )
}

function QuestionForm({ roomid, setRoomid, questions, onAdded }: { roomid: string; setRoomid: (v: string) => void; questions: QuestionInput[]; onAdded: (q: QuestionInput) => void }) {
  const [text, setText] = useState('')
  const [opts, setOpts] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState(0)
  const [secs, setSecs] = useState(DEFAULT_SECONDS)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const q: QuestionInput = { Question: text.trim(), Options: opts.map((o) => o.trim()), Correctoption: String(correct), Eachquestiontime: secs }
    setBusy(true)
    setMsg(null)
    try {
      await addQuestion(roomid, q)
      onAdded(q)
      setText('')
      setOpts(['', '', '', ''])
      setCorrect(0)
      setMsg({ tone: 'ok', text: `Question ${questions.length + 1} added to ${roomid}.` })
    } catch (err) {
      setMsg({ tone: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stage-grid">
      <form className="sheet" onSubmit={submit}>
        <div className="form-grid two">
          <Field label="ROOM CODE" value={roomid} onChange={(e) => setRoomid(e.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={8} required className="input code" />
          <Field label="SECONDS" type="number" min={5} max={120} value={secs} onChange={(e) => setSecs(Number(e.target.value))} />
        </div>
        <label className="field-row">
          <span className="mono field-label">QUESTION</span>
          <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Which band sits between 8 and 13 Hz?" required />
        </label>
        <fieldset className="opt-grid">
          <legend className="mono field-label">OPTIONS · MARK THE CORRECT ONE</legend>
          {opts.map((o, i) => (
            <div key={i} className={`opt-input ${correct === i ? 'is-correct' : ''}`}>
              <label className="opt-radio" title="Correct answer">
                <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} />
                <span>{LETTERS[i]}</span>
              </label>
              <input className="input" value={o} onChange={(e) => setOpts((l) => l.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`Option ${LETTERS[i]}`} required aria-label={`Option ${LETTERS[i]}`} />
            </div>
          ))}
        </fieldset>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button type="submit" disabled={busy || !roomid}>{busy ? 'Adding…' : 'Add question'}</Button>
      </form>

      <div className="console">
        <div className="console-head mono">
          <span>THIS SESSION</span>
          <span className="dim">{questions.length} ADDED</span>
        </div>
        <ol className="qlist">
          {questions.length === 0 && <li className="dim mono">— nothing yet —</li>}
          {questions.map((q, i) => (
            <li key={i}>
              <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
              <span>{q.Question}</span>
              <span className="mono">■ {q.Options[Number(q.Correctoption)]}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function LiveRoom({ hostid, setHostid, roomid, setRoomid, questions }: { hostid: string; setHostid: (v: string) => void; roomid: string; setRoomid: (v: string) => void; questions: QuestionInput[] }) {
  const [live, setLive] = useState(false)
  const [answers, setAnswers] = useState<AnswerMessage[]>([])
  const [sent, setSent] = useState<number | null>(null)

  const url = useMemo(() => (live && hostid && roomid ? hostSocketUrl(hostid, roomid) : null), [live, hostid, roomid])

  // Players' frames are relayed to the host; echo answers back on the host
  // socket, which is the channel the backend grades (HReadPump).
  const sendRef = useRef<(p: unknown) => boolean>(() => false)
  const onMessage = useCallback((data: unknown) => {
    if (!isAnswer(data)) return
    setAnswers((a) => [data, ...a].slice(0, 100))
    sendRef.current(data)
  }, [])
  const { status, log, send } = useSocket(url, onMessage)
  sendRef.current = send

  const broadcast = (i: number) => {
    const q = questions[i]
    if (send({ type: 'question', roomid, questionno: String(i), question: q })) setSent(i)
  }

  const tally = answers.reduce<Record<string, number>>((m, a) => ((m[a.userid] = (m[a.userid] ?? 0) + 1), m), {})

  return (
    <div className="stage-grid">
      <div className="sheet">
        <div className="form-grid two">
          <Field label="HOST ID" value={hostid} onChange={(e) => setHostid(e.target.value)} disabled={live} placeholder="host-handle" />
          <Field label="ROOM CODE" value={roomid} onChange={(e) => setRoomid(e.target.value.toUpperCase())} disabled={live} maxLength={8} className="input code" placeholder="AB12CD34" />
        </div>
        <div className="actions">
          <Button variant={live ? 'ghost' : 'solid'} onClick={() => setLive((v) => !v)} disabled={!hostid || !roomid}>
            {live ? 'End broadcast' : 'Go live'}
          </Button>
          <StatusPill status={status} />
        </div>
        <Notice>Share the room code and your host ID with players. They can join once the status reads OPEN.</Notice>

        {questions.length > 0 && (
          <>
            <p className="mono field-label">PUSH A QUESTION</p>
            <ol className="qlist push">
              {questions.map((q, i) => (
                <li key={i}>
                  <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
                  <span>{q.Question}</span>
                  <button className={`mini ${sent === i ? 'is-on' : ''}`} onClick={() => broadcast(i)} disabled={status !== 'open'}>
                    {sent === i ? 'ON AIR' : 'SEND'}
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}

        <p className="mono field-label">ANSWERS IN · {answers.length}</p>
        <ul className="leader">
          {Object.entries(tally).length === 0 && <li className="dim mono">— waiting for players —</li>}
          {Object.entries(tally)
            .sort((a, b) => b[1] - a[1])
            .map(([u, n]) => (
              <li key={u}>
                <span>{u}</span>
                <span className="mono">{n} ANS</span>
              </li>
            ))}
        </ul>
      </div>
      <Console log={log} />
    </div>
  )
}
