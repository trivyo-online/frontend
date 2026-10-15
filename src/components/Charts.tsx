import type { ReactNode } from 'react'
import type { BoardEntry, QStat } from '../lib/api'

const LETTERS = 'ABCDEF'

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat">
      <span className="mono dim">{label}</span>
      <span className="display stat-value">{value}</span>
      {sub && <span className="mono dim small">{sub}</span>}
    </div>
  )
}

/** Hover/focus tooltip attached to a mark. */
function Tip({ children }: { children: ReactNode }) {
  return (
    <span className="tip" role="tooltip">
      {children}
    </span>
  )
}

/**
 * Answer distribution for one question: one bar per option, the correct one
 * filled and labelled, the rest hatched, so the answer isn't conveyed by tone alone.
 */
export function Distribution({ stat, reveal = true }: { stat: Pick<QStat, 'options' | 'counts' | 'correctoption' | 'total'>; reveal?: boolean }) {
  const max = Math.max(1, ...stat.counts)
  return (
    <ul className="dist" aria-label="Answer distribution">
      {stat.options.map((opt, i) => {
        const n = stat.counts[i] ?? 0
        const pct = stat.total ? Math.round((n / stat.total) * 100) : 0
        const right = reveal && i === stat.correctoption
        return (
          <li key={i} className={`dist-row ${right ? 'is-correct' : ''}`} tabIndex={0}>
            <span className="dist-letter">{LETTERS[i]}</span>
            <span className="dist-label">
              <span className="dist-text">{opt}</span>
              {right && <span className="mono dist-flag">✓ CORRECT</span>}
            </span>
            <span className="dist-track">
              <span className={`dist-bar ${right ? 'solid' : 'hatch'}`} style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="mono dist-n">{n}</span>
            <Tip>
              {LETTERS[i]} · {n} {n === 1 ? 'answer' : 'answers'} · {pct}%
            </Tip>
          </li>
        )
      })}
    </ul>
  )
}

/** Accuracy per question as columns, 0–100%. */
export function AccuracyColumns({ stats }: { stats: QStat[] }) {
  if (stats.length === 0) return <p className="mono dim">— no questions —</p>
  return (
    <div className="cols" role="img" aria-label="Accuracy per question">
      <div className="cols-grid" aria-hidden="true">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      <div className="cols-plot">
        {stats.map((s) => {
          const acc = s.total ? s.correct / s.total : 0
          return (
            <div key={s.questionno} className="col" tabIndex={0}>
              <span className="col-bar" style={{ height: `${Math.max(acc * 100, s.total ? 1.5 : 0)}%` }} />
              <span className="mono col-x">Q{s.questionno + 1}</span>
              <Tip>
                <strong>Q{s.questionno + 1}</strong> {s.question}
                <br />
                {s.total ? `${Math.round(acc * 100)}% correct · ${s.correct}/${s.total} · avg ${(s.avgms / 1000).toFixed(1)}s` : 'no answers'}
              </Tip>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Ranked table with a score bar per row. Doubles as the chart's table view. */
export function Leaderboard({ entries, me, compact = false, showRooms = false }: { entries: BoardEntry[]; me?: string; compact?: boolean; showRooms?: boolean }) {
  if (entries.length === 0) return <p className="mono dim board-empty">— no scores yet —</p>
  const top = Math.max(1, entries[0]?.score ?? 1)
  return (
    <table className={`board ${compact ? 'compact' : ''}`}>
      <thead>
        <tr className="mono dim">
          <th scope="col">#</th>
          <th scope="col">PLAYER</th>
          <th scope="col" className="board-barcol">
            <span className="sr-only">Score bar</span>
          </th>
          <th scope="col" className="num">PTS</th>
          {!compact && <th scope="col" className="num">RIGHT</th>}
          {!compact && showRooms && <th scope="col" className="num">ROOMS</th>}
          {!compact && <th scope="col" className="num">AVG</th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.userid} className={me && e.userid.toLowerCase() === me.toLowerCase() ? 'is-me' : ''}>
            <td className="mono rank">{String(e.rank).padStart(2, '0')}</td>
            <td className="who">
              {e.userid}
              {me && e.userid.toLowerCase() === me.toLowerCase() && <span className="mono dim"> · YOU</span>}
            </td>
            <td className="board-barcol">
              <span className="board-bar" style={{ width: `${(e.score / top) * 100}%` }} />
            </td>
            <td className="mono num strong">{e.score}</td>
            {!compact && (
              <td className="mono num">
                {e.correct}/{e.answered}
              </td>
            )}
            {!compact && showRooms && <td className="mono num">{e.rooms ?? 0}</td>}
            {!compact && <td className="mono num dim">{e.answered ? (e.totalms / e.answered / 1000).toFixed(1) + 's' : '—'}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
