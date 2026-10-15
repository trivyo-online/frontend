import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Notice, SectionHead, Tag } from '../components/UI'
import { roomInfo, type RoomInfo } from '../lib/api'
import { useCountdown } from '../lib/useCountdown'
import { navigate } from '../lib/router'

const KEY = 'trivyo.player'

function remembered(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function Join({ params }: { params: URLSearchParams }) {
  const [roomid, setRoom] = useState((params.get('room') ?? '').toUpperCase())
  const [userid, setUser] = useState(remembered)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // A scheduled room that isn't open yet: wait here and enter when it opens.
  const [waiting, setWaiting] = useState<RoomInfo | null>(null)
  const opensIn = useCountdown(waiting?.scheduledat ? new Date(waiting.scheduledat).getTime() - 10 * 60_000 : 0)

  useEffect(() => {
    if (!waiting) return
    const t = window.setInterval(async () => {
      try {
        const info = await roomInfo(waiting.roomid)
        if (info.live) enter(info.roomid, userid.trim())
      } catch {
        /* keep polling through blips */
      }
    }, 5000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting])

  const enter = (room: string, name: string) => {
    try {
      localStorage.setItem(KEY, name)
    } catch {
      /* not needed to play */
    }
    navigate('play', { room, name })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const room = roomid.trim().toUpperCase()
    const name = userid.trim()
    setBusy(true)
    setErr('')
    setWaiting(null)
    try {
      const info = await roomInfo(room)
      if (!info.live) {
        if (info.finished) setErr(`“${info.name}” has already finished.`)
        else if (info.autostart && info.scheduledat && new Date(info.scheduledat).getTime() > Date.now()) setWaiting(info)
        else setErr(`“${info.name}” exists but isn’t live yet. Wait for your host to open it.`)
        return
      }
      enter(room, name)
    } catch (e) {
      setErr((e as { status?: number }).status === 404 ? `No room with code ${room}.` : (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="screen split right">
      <Tag style={{ top: '24%', left: '18%' }} className="float">8-CHAR CODE</Tag>
      <Tag style={{ bottom: '22%', left: '30%' }} className="float">LIVE</Tag>
      <form className="panel" onSubmit={submit}>
        <SectionHead marker="B" title={<>TUNE INTO<br />A ROOM</>}>
          Enter the code on your host’s screen and pick a name for the leaderboard.
        </SectionHead>
        <div className="form-grid">
          <Field label="ROOM CODE" value={roomid} onChange={(e) => setRoom(e.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={8} minLength={8} required autoComplete="off" spellCheck={false} className="input code" />
          <Field label="YOUR NAME" value={userid} onChange={(e) => setUser(e.target.value)} placeholder="ada" required maxLength={24} autoComplete="nickname" />
        </div>
        {err && <Notice tone="error">{err}</Notice>}
        {waiting && (
          <Notice>
            “{waiting.name}” starts {new Date(waiting.scheduledat!).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}. The lobby opens{' '}
            {opensIn > 0 ? `in ${Math.floor(opensIn / 60)}m ${opensIn % 60}s` : 'any moment'}; keep this page open and you’ll go in automatically.
          </Notice>
        )}
        <Button type="submit" variant="solid" disabled={busy}>
          {busy ? 'Checking…' : 'Enter room'}
        </Button>
      </form>
    </section>
  )
}
