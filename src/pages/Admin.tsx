import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { SharePanel } from '../components/Share'
import { Button, Field, Notice, SectionHead, Tag } from '../components/UI'
import { createEvent, deleteEvent, listEvents, login, setSession, signup, type EventSummary } from '../lib/api'
import { navigate } from '../lib/router'
import { useSession } from '../lib/useSession'

export function Admin() {
  const session = useSession()
  return session ? <Dashboard username={session.username} /> : <Login />
}

function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const s = mode === 'login' ? await login(username.trim(), password) : await signup(username.trim(), password, code || undefined)
      setSession(s)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="screen split right">
      <Tag style={{ top: '26%', left: '18%' }} className="float">ADMIN</Tag>
      <Tag style={{ bottom: '24%', left: '28%' }} className="float">EDITOR</Tag>
      <form className="panel" onSubmit={submit}>
        <SectionHead marker="C" title={mode === 'login' ? <>HOST<br />SIGN IN</> : <>NEW HOST<br />ACCOUNT</>}>
          {mode === 'login' ? 'Sign in to write questions, run live rooms and read the results.' : 'Your username becomes your host ID. Passwords need at least 8 characters.'}
        </SectionHead>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={`tab ${mode === 'login' ? 'is-active' : ''}`} onClick={() => setMode('login')}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={`tab ${mode === 'signup' ? 'is-active' : ''}`} onClick={() => setMode('signup')}>
            Create account
          </button>
        </div>
        <div className="form-grid">
          <Field label="USERNAME" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={32} />
          <Field label="PASSWORD" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : 1} />
          {mode === 'signup' && <Field label="SIGNUP CODE · IF YOUR SERVER NEEDS ONE" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />}
        </div>
        {err && <Notice tone="error">{err}</Notice>}
        <Button type="submit" variant="solid" disabled={busy}>
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </section>
  )
}

function Dashboard({ username }: { username: string }) {
  const [events, setEvents] = useState<EventSummary[] | null>(null)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [sharing, setSharing] = useState('')

  const load = useCallback(() => {
    listEvents()
      .then((r) => setEvents(r.events))
      .catch((e) => setErr((e as Error).message))
  }, [])
  useEffect(load, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const r = await createEvent({ Nameofroom: name, DateofQuiz: date, StartTime: time })
      navigate('editor', { room: r.roomid })
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  const remove = async (ev: EventSummary) => {
    if (!window.confirm(`Delete “${ev.Nameofroom}” and all its answers? This can't be undone.`)) return
    try {
      await deleteEvent(ev.RoomId)
      load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <section className="screen stage">
      <div className="stage-head">
        <SectionHead marker="C" title={<>HOST<br />CONSOLE</>} />
        <div className="stage-meta mono">
          <span>
            SIGNED IN AS <strong>{username}</strong>
          </span>
          <button className="mini" onClick={() => setSession(null)}>
            SIGN OUT
          </button>
        </div>
      </div>

      <div className="stage-grid">
        <div className="sheet">
          <p className="mono field-label">YOUR EVENTS · {events?.length ?? '…'}</p>
          {err && <Notice tone="error">{err}</Notice>}
          {events && events.length === 0 && <p className="lede">No events yet. Create one on the right to start writing questions.</p>}
          <ol className="events">
            {events?.map((ev) => (
              <li key={ev.RoomId} className="event-row">
                <div className="event-main">
                  <span className="mono code-chip">{ev.RoomId}</span>
                  <span className="event-name">{ev.Nameofroom}</span>
                  <span className="mono dim small">
                    {ev.QuestionCount} Q · {ev.DateofQuiz ? `${ev.DateofQuiz} ${ev.StartTime}` : ev.ScheduledAt ? '' : 'NO DATE'}
                  </span>
                  {ev.Live && (
                    <span className="pill pill-open">
                      <i />
                      LIVE
                    </span>
                  )}
                  {ev.AutoStart && ev.ScheduledAt && !ev.Finished && !ev.Live && (
                    <span className="pill">
                      <i />
                      AUTO · {new Date(ev.ScheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  )}
                  {ev.Finished && <span className="mono dim small">FINISHED</span>}
                </div>
                <div className="event-actions">
                  <button className="mini" onClick={() => navigate('editor', { room: ev.RoomId })}>
                    EDIT
                  </button>
                  <button className="mini is-on" onClick={() => navigate('live', { room: ev.RoomId })} disabled={ev.QuestionCount === 0} title={ev.QuestionCount === 0 ? 'Add questions first' : undefined}>
                    {ev.Live ? 'REJOIN' : 'GO LIVE'}
                  </button>
                  <button className="mini" onClick={() => setSharing((r) => (r === ev.RoomId ? '' : ev.RoomId))} aria-expanded={sharing === ev.RoomId}>
                    QR
                  </button>
                  <button className="mini" onClick={() => navigate('ranks', { room: ev.RoomId })}>
                    RESULTS
                  </button>
                  <button className="mini" onClick={() => remove(ev)} aria-label={`Delete ${ev.Nameofroom}`}>
                    ✕
                  </button>
                </div>
                {sharing === ev.RoomId && <SharePanel room={ev.RoomId} />}
              </li>
            ))}
          </ol>
        </div>

        <form className="console pad" onSubmit={create}>
          <p className="mono field-label">NEW EVENT</p>
          <Field label="EVENT NAME" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday Night Quiz" required />
          <div className="form-grid two">
            <Field label="DATE" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Field label="START" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <Button type="submit" variant="solid" disabled={busy}>
            {busy ? 'Creating…' : 'Create & edit'}
          </Button>
        </form>
      </div>
    </section>
  )
}
