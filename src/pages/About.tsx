import { Button, SectionHead, Tag } from '../components/UI'
import { API_URL } from '../lib/api'
import { navigate } from '../lib/router'

const ROWS = [
  ['01', 'HOST', 'Creates an event and writes four-option questions.'],
  ['02', 'ROOM', 'Goes live — the room opens a WebSocket channel.'],
  ['03', 'PLAYERS', 'Join with the room code, the host ID and a name.'],
  ['04', 'SCORE', 'Each correct answer adds 50 points to your tally.'],
]

export function About() {
  return (
    <section className="screen split left">
      <Tag style={{ top: '24%', right: '14%' }} className="float">GIN · GO</Tag>
      <Tag style={{ bottom: '22%', right: '24%' }} className="float">REDIS</Tag>
      <div className="panel">
        <SectionHead marker="E" title={<>HOW THE<br />SIGNAL FLOWS</>}>
          Trivyo is a live quiz system. A Go backend keeps each room in memory and in Redis; this interface is the dial you turn.
        </SectionHead>
        <ol className="flow">
          {ROWS.map(([n, k, v]) => (
            <li key={n}>
              <span className="mono dim">{n}</span>
              <span className="mono">{k}</span>
              <span>{v}</span>
            </li>
          ))}
        </ol>
        <p className="mono dim small">BACKEND · {API_URL}</p>
        <Button onClick={() => navigate('join')}>Join a room</Button>
      </div>
    </section>
  )
}
