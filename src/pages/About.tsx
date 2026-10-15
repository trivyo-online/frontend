import { Button, SectionHead, Tag } from '../components/UI'
import { API_URL } from '../lib/api'
import { navigate } from '../lib/router'

const ROWS = [
  ['01', 'ADMIN', 'Signs in, creates an event and writes questions in the editor.'],
  ['02', 'ROOM', 'Goes live: the host steps through questions, reveals answers, ends.'],
  ['03', 'PLAYERS', 'Join with the room code and a name. One answer per question.'],
  ['04', 'SCORE', 'Each correct answer is 50 points; ties go to the faster player.'],
  ['05', 'RANKS', 'Room standings, per-question charts and an all-time leaderboard.'],
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
