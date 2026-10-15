import { useState, type FormEvent } from 'react'
import { Button, Field, SectionHead, Tag } from '../components/UI'
import { navigate } from '../lib/router'

const KEY = 'trivyo.player'

function remembered() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function Join() {
  const saved = remembered()
  const [roomid, setRoom] = useState(saved.roomid ?? '')
  const [hostid, setHost] = useState(saved.hostid ?? '')
  const [userid, setUser] = useState(saved.userid ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = { roomid: roomid.trim().toUpperCase(), hostid: hostid.trim(), userid: userid.trim() }
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      /* storage blocked — not needed to play */
    }
    navigate('play', v)
  }

  return (
    <section className="screen split right">
      <Tag style={{ top: '24%', left: '18%' }} className="float">8-CHAR CODE</Tag>
      <Tag style={{ bottom: '22%', left: '30%' }} className="float">LIVE</Tag>
      <form className="panel" onSubmit={submit}>
        <SectionHead marker="B" title={<>TUNE INTO<br />A ROOM</>}>
          Your host shares a room code and their host ID. The room has to be live before you can enter.
        </SectionHead>
        <div className="form-grid">
          <Field label="ROOM CODE" value={roomid} onChange={(e) => setRoom(e.target.value)} placeholder="AB12CD34" maxLength={8} required autoComplete="off" spellCheck={false} className="input code" />
          <Field label="HOST ID" value={hostid} onChange={(e) => setHost(e.target.value)} placeholder="host-handle" required autoComplete="off" />
          <Field label="YOUR NAME" value={userid} onChange={(e) => setUser(e.target.value)} placeholder="ada" required autoComplete="nickname" />
        </div>
        <Button type="submit">Enter room</Button>
      </form>
    </section>
  )
}
