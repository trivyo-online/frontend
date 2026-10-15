import { useEffect, useState, type FormEvent } from 'react'
import { AccuracyColumns, Distribution, Leaderboard, StatTile } from '../components/Charts'
import { Button, Field, Notice, SectionHead } from '../components/UI'
import { globalBoard, recentRooms, roomBoard, roomStats, type BoardEntry, type QStat } from '../lib/api'
import { navigate } from '../lib/router'

export function Ranks({ params }: { params: URLSearchParams }) {
  const room = (params.get('room') ?? '').toUpperCase()
  return room ? <RoomResults room={room} /> : <AllTime />
}

type Global = Awaited<ReturnType<typeof globalBoard>>
type Rooms = Awaited<ReturnType<typeof recentRooms>>['rooms']

function AllTime() {
  const [data, setData] = useState<Global | null>(null)
  const [rooms, setRooms] = useState<Rooms>([])
  const [err, setErr] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    globalBoard()
      .then(setData)
      .catch((e) => setErr((e as Error).message))
    recentRooms()
      .then((r) => setRooms(r.rooms))
      .catch(() => {})
  }, [])

  const open = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) navigate('ranks', { room: code.trim().toUpperCase() })
  }

  const t = data?.totals
  return (
    <section className="screen stage">
      <div className="stage-head">
        <SectionHead marker="E" title={<>ALL-TIME<br />RANKING</>} />
        <form className="lookup" onSubmit={open}>
          <Field label="ROOM RESULTS" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={8} className="input code" />
          <Button type="submit" icon={false}>
            Open
          </Button>
        </form>
      </div>

      {err && <Notice tone="error">{err}</Notice>}

      <div className="tiles">
        <StatTile label="PLAYERS" value={t ? t.players : '—'} />
        <StatTile label="ROOMS PLAYED" value={t ? t.rooms : '—'} />
        <StatTile label="ANSWERS" value={t ? t.answers : '—'} />
        <StatTile label="ACCURACY" value={t && t.answers ? `${Math.round((t.correct / t.answers) * 100)}%` : '—'} sub="ACROSS EVERY ROOM" />
      </div>

      <div className="stage-grid">
        <div className="sheet">
          <p className="mono field-label">TOP PLAYERS · POINTS ACROSS ALL ROOMS</p>
          {data ? <Leaderboard entries={data.entries} showRooms /> : <p className="mono dim">LOADING…</p>}
        </div>
        <div className="console pad">
          <p className="mono field-label">RECENT ROOMS</p>
          <ol className="rooms">
            {rooms.length === 0 && <li className="mono dim">— none yet —</li>}
            {rooms.map((r) => (
              <li key={r.roomid}>
                <button onClick={() => navigate('ranks', { room: r.roomid })}>
                  <span className="mono code-chip">{r.roomid}</span>
                  <span>{r.name || 'Untitled'}</span>
                  <span className="mono dim small">
                    {r.players} PLAYERS{r.live ? ' · LIVE' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function RoomResults({ room }: { room: string }) {
  const [board, setBoard] = useState<BoardEntry[] | null>(null)
  const [stats, setStats] = useState<QStat[] | null>(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [statsErr, setStatsErr] = useState('')

  useEffect(() => {
    roomBoard(room)
      .then((r) => setBoard(r.entries))
      .catch((e) => setErr((e as Error).message))
    roomStats(room)
      .then((r) => {
        setStats(r.questions)
        setName(r.name)
      })
      .catch((e) => setStatsErr((e as Error).message))
  }, [room])

  const answered = stats?.reduce((a, s) => a + s.total, 0) ?? 0
  const correct = stats?.reduce((a, s) => a + s.correct, 0) ?? 0
  const ms = stats?.reduce((a, s) => a + s.avgms * s.total, 0) ?? 0
  const hardest = stats?.filter((s) => s.total).sort((a, b) => a.correct / a.total - b.correct / b.total)[0]

  return (
    <section className="screen stage">
      <div className="stage-head">
        <div>
          <button className="mini" onClick={() => navigate('ranks')}>
            ← ALL-TIME
          </button>
          <SectionHead marker="E" title={name || 'ROOM RESULTS'} />
        </div>
        <div className="stage-meta mono">
          <span>
            ROOM <strong className="code-chip">{room}</strong>
          </span>
        </div>
      </div>

      {err && <Notice tone="error">{err}</Notice>}

      <div className="tiles">
        <StatTile label="PLAYERS" value={board ? board.length : '—'} />
        <StatTile label="QUESTIONS" value={stats ? stats.length : '—'} />
        <StatTile label="ACCURACY" value={answered ? `${Math.round((correct / answered) * 100)}%` : '—'} />
        <StatTile label="AVG ANSWER" value={answered ? `${(ms / answered / 1000).toFixed(1)}s` : '—'} />
      </div>

      <div className="stage-grid">
        <div className="sheet">
          <p className="mono field-label">STANDINGS</p>
          {board ? <Leaderboard entries={board} /> : <p className="mono dim">LOADING…</p>}
        </div>
        <div className="console pad">
          <p className="mono field-label">ACCURACY BY QUESTION</p>
          {stats ? <AccuracyColumns stats={stats} /> : <Notice>{statsErr || 'Loading…'}</Notice>}
          {hardest && (
            <p className="mono dim small">
              HARDEST · Q{hardest.questionno + 1} · {Math.round((hardest.correct / hardest.total) * 100)}% RIGHT
            </p>
          )}
        </div>
      </div>

      {stats && stats.length > 0 && (
        <>
          <p className="mono field-label">HOW EACH QUESTION WAS ANSWERED</p>
          <div className="multiples">
            {stats.map((s) => (
              <article key={s.questionno} className="console pad">
                <p className="mono dim">
                  Q.{String(s.questionno + 1).padStart(2, '0')} · {s.total ? `${Math.round((s.correct / s.total) * 100)}% RIGHT` : 'NO ANSWERS'}
                </p>
                <h3 className="multiple-q">{s.question}</h3>
                <Distribution stat={s} />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
