import { useCallback, useEffect, useRef, useState } from 'react'
import { SharePanel } from '../components/Share'
import { Button, Field, Notice, SectionHead } from '../components/UI'
import { getEvent, saveEvent, type Question } from '../lib/api'
import { DEFAULT_SECONDS, PRACTICE_BANK } from '../lib/questions'
import { navigate } from '../lib/router'
import { useSession } from '../lib/useSession'

const LETTERS = 'ABCDEF'
const MAX_OPTIONS = 6

type Draft = Question & { key: number }

let nextKey = 1
const withKey = (q: Question): Draft => ({ ...q, Options: [...q.Options], key: nextKey++ })
/** ISO instant → value for <input type="datetime-local"> in local time. */
function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const blank = (): Draft => withKey({ Question: '', Options: ['', '', '', ''], Correctoption: '0', Eachquestiontime: DEFAULT_SECONDS })

export function Editor({ params }: { params: URLSearchParams }) {
  const session = useSession()
  const room = (params.get('room') ?? '').toUpperCase()
  const [loaded, setLoaded] = useState(false)
  const [live, setLive] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [schedule, setSchedule] = useState('')
  const [autoStart, setAutoStart] = useState(false)
  const [qs, setQs] = useState<Draft[]>([])
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const cards = useRef<Record<number, HTMLElement | null>>({})

  useEffect(() => {
    if (!session) {
      navigate('admin')
      return
    }
    getEvent(room)
      .then(({ event, live }) => {
        setName(event.Nameofroom)
        setDate(event.DateofQuiz)
        setTime(event.StartTime)
        setSchedule(toLocalInput(event.ScheduledAt))
        setAutoStart(!!event.AutoStart)
        setQs(event.Questions.map(withKey))
        setLive(live)
        setLoaded(true)
      })
      .catch((e) => setMsg({ tone: 'error', text: (e as Error).message }))
  }, [room, session])

  const touch = () => {
    setDirty(true)
    setMsg(null)
  }
  const update = (key: number, patch: Partial<Question>) => {
    setQs((l) => l.map((q) => (q.key === key ? { ...q, ...patch } : q)))
    touch()
  }
  const setOption = (key: number, i: number, v: string) => {
    setQs((l) => l.map((q) => (q.key === key ? { ...q, Options: q.Options.map((o, k) => (k === i ? v : o)) } : q)))
    touch()
  }
  const addOption = (key: number) => {
    setQs((l) => l.map((q) => (q.key === key && q.Options.length < MAX_OPTIONS ? { ...q, Options: [...q.Options, ''] } : q)))
    touch()
  }
  const removeOption = (key: number, i: number) => {
    setQs((l) =>
      l.map((q) => {
        if (q.key !== key || q.Options.length <= 2) return q
        const c = Number(q.Correctoption)
        const nc = c === i ? 0 : c > i ? c - 1 : c
        return { ...q, Options: q.Options.filter((_, k) => k !== i), Correctoption: String(nc) }
      }),
    )
    touch()
  }
  const move = (idx: number, d: -1 | 1) => {
    setQs((l) => {
      const j = idx + d
      if (j < 0 || j >= l.length) return l
      const n = l.slice()
      ;[n[idx], n[j]] = [n[j], n[idx]]
      return n
    })
    touch()
  }
  const add = (q: Draft = blank()) => {
    setQs((l) => [...l, q])
    touch()
    requestAnimationFrame(() => cards.current[q.key]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const duplicate = (idx: number) => {
    setQs((l) => [...l.slice(0, idx + 1), withKey(l[idx]), ...l.slice(idx + 1)])
    touch()
  }
  const remove = (key: number) => {
    setQs((l) => l.filter((q) => q.key !== key))
    touch()
  }
  const sample = () => {
    const used = new Set(qs.map((q) => q.Question))
    const pick = PRACTICE_BANK.find((q) => !used.has(q.Question))
    if (pick) add(withKey({ ...pick, Eachquestiontime: DEFAULT_SECONDS }))
  }

  const save = useCallback(async () => {
    setBusy(true)
    setMsg(null)
    try {
      const Questions = qs.map(({ key: _key, ...q }) => ({ ...q, Eachquestiontime: q.Eachquestiontime ? Number(q.Eachquestiontime) : undefined }))
      const at = schedule ? new Date(schedule) : null
      if (autoStart && (!at || at.getTime() < Date.now())) throw new Error('Pick a start time in the future for auto-start.')
      const r = await saveEvent(room, {
        Nameofroom: name,
        // Keep the plain date/time fields in step with the schedule for display.
        DateofQuiz: at ? schedule.slice(0, 10) : date,
        StartTime: at ? schedule.slice(11, 16) : time,
        Questions,
        ScheduledAt: at ? at.toISOString() : null,
        AutoStart: autoStart && !!at,
      })
      setQs(r.event.Questions.map(withKey))
      setDirty(false)
      setMsg({ tone: 'ok', text: `Saved ${r.event.Questions.length} questions.${live ? ' The live room picked up the changes.' : ''}` })
    } catch (e) {
      setMsg({ tone: 'error', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }, [qs, room, name, date, time, live, schedule, autoStart])

  // Ctrl/Cmd+S saves; warn before leaving with unsaved edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty && !busy) save()
      }
    }
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [dirty, busy, save])

  if (!loaded) {
    return (
      <section className="screen center">
        <div className="panel narrow">{msg ? <Notice tone="error">{msg.text}</Notice> : <p className="mono dim">LOADING {room}…</p>}</div>
      </section>
    )
  }

  return (
    <section className="screen stage">
      <div className="stage-head">
        <div>
          <button className="mini" onClick={() => navigate('admin')}>
            ← EVENTS
          </button>
          <SectionHead marker="C" title={<>QUESTION<br />EDITOR</>} />
        </div>
        <div className="stage-meta mono">
          <span>
            ROOM <strong className="code-chip">{room}</strong>
          </span>
          {live && (
            <span className="pill pill-open">
              <i />
              LIVE
            </span>
          )}
        </div>
      </div>

      <div className="stage-grid">
        <div className="sheet">
          <Field label="EVENT NAME" value={name} onChange={(e) => (setName(e.target.value), touch())} required />
          <div className="schedule">
            <Field label="SCHEDULED START · YOUR LOCAL TIME" type="datetime-local" value={schedule} onChange={(e) => (setSchedule(e.target.value), touch())} />
            <label className="switch">
              <input type="checkbox" checked={autoStart} onChange={(e) => (setAutoStart(e.target.checked), touch())} disabled={!schedule} />
              <span className="switch-track" aria-hidden="true" />
              <span>
                <strong className="mono">AUTO-START</strong>
                <span className="field-hint"> The lobby opens 10 min early; questions run on their timers and the test ends by itself. No host needed.</span>
              </span>
            </label>
            {schedule && (
              <button type="button" className="mini" onClick={() => (setSchedule(''), setAutoStart(false), touch())}>
                CLEAR SCHEDULE
              </button>
            )}
          </div>

          {qs.length === 0 && <p className="lede">No questions yet. Add one below, or pull a sample from the practice bank.</p>}

          {qs.map((q, idx) => (
            <article key={q.key} className="qedit" ref={(el) => void (cards.current[q.key] = el)} id={`q-${q.key}`}>
              <header className="qedit-head">
                <span className="mono">Q.{String(idx + 1).padStart(2, '0')}</span>
                <div className="qedit-tools">
                  <button type="button" className="mini" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" className="mini" onClick={() => move(idx, 1)} disabled={idx === qs.length - 1} aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" className="mini" onClick={() => duplicate(idx)}>
                    COPY
                  </button>
                  <button type="button" className="mini" onClick={() => remove(q.key)} aria-label={`Delete question ${idx + 1}`}>
                    ✕
                  </button>
                </div>
              </header>
              <label className="field-row">
                <span className="mono field-label">QUESTION</span>
                <textarea className="input" rows={2} value={q.Question} onChange={(e) => update(q.key, { Question: e.target.value })} placeholder="Type the question" />
              </label>
              <fieldset className="opt-grid">
                <legend className="mono field-label">OPTIONS · TAP A LETTER TO MARK THE ANSWER</legend>
                {q.Options.map((o, i) => (
                  <div key={i} className={`opt-input ${q.Correctoption === String(i) ? 'is-correct' : ''}`}>
                    <label className="opt-radio" title="Mark as correct">
                      <input type="radio" name={`c-${q.key}`} checked={q.Correctoption === String(i)} onChange={() => update(q.key, { Correctoption: String(i) })} />
                      <span>{LETTERS[i]}</span>
                    </label>
                    <input className="input" value={o} onChange={(e) => setOption(q.key, i, e.target.value)} placeholder={`Option ${LETTERS[i]}`} aria-label={`Option ${LETTERS[i]}`} />
                    {q.Options.length > 2 && (
                      <button type="button" className="opt-x" onClick={() => removeOption(q.key, i)} aria-label={`Remove option ${LETTERS[i]}`}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </fieldset>
              <div className="qedit-foot">
                {q.Options.length < MAX_OPTIONS && (
                  <button type="button" className="mini" onClick={() => addOption(q.key)}>
                    + OPTION
                  </button>
                )}
                <label className="secs mono">
                  TIMER
                  <input className="input" type="number" min={5} max={300} value={q.Eachquestiontime ?? DEFAULT_SECONDS} onChange={(e) => update(q.key, { Eachquestiontime: Number(e.target.value) })} />
                  SEC
                </label>
              </div>
            </article>
          ))}

          <div className="actions">
            <Button type="button" onClick={() => add()}>
              Add question
            </Button>
            <Button type="button" icon={false} onClick={sample}>
              + Sample
            </Button>
          </div>
        </div>

        <aside className="console pad sticky">
          <SharePanel room={room} />
          <p className="mono field-label">OUTLINE · {qs.length}</p>
          <ol className="outline">
            {qs.map((q, i) => (
              <li key={q.key}>
                <button type="button" onClick={() => cards.current[q.key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                  <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
                  <span className={q.Question ? '' : 'dim'}>{q.Question || 'Untitled question'}</span>
                </button>
              </li>
            ))}
          </ol>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <Button type="button" variant="solid" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </Button>
          <p className="mono dim small">CTRL / ⌘ + S TO SAVE</p>
          <Button type="button" icon={false} onClick={() => navigate('live', { room })} disabled={dirty || qs.length === 0}>
            {live ? 'Back to live room →' : 'Go live →'}
          </Button>
        </aside>
      </div>
    </section>
  )
}
