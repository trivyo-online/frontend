import { useEffect } from 'react'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface Props {
  index: number
  total?: number
  question: string
  options: string[]
  selected: number | null
  /** When set, the card shows which option was right. */
  correct?: number | null
  secondsLeft?: number
  seconds?: number
  onSelect: (i: number) => void
}

export function QuestionCard({ index, total, question, options, selected, correct, secondsLeft, seconds, onSelect }: Props) {
  const locked = selected !== null

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (locked || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const k = e.key.toUpperCase()
      const i = /^[1-9]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k)
      if (i >= 0 && i < options.length) onSelect(i)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [locked, options.length, onSelect])

  const pct = seconds && secondsLeft !== undefined ? Math.max(0, secondsLeft / seconds) : null

  return (
    <article className="qcard">
      <header className="qcard-head">
        <span className="mono">
          Q.{String(index + 1).padStart(2, '0')}
          {total ? <span className="dim"> / {String(total).padStart(2, '0')}</span> : null}
        </span>
        {pct !== null && (
          <span className="timer mono" aria-label={`${secondsLeft} seconds left`}>
            <span className="timer-bar">
              <span style={{ transform: `scaleX(${pct})` }} />
            </span>
            {String(secondsLeft).padStart(2, '0')}s
          </span>
        )}
      </header>
      <h2 className="display qtext">{question}</h2>
      <ol className="options">
        {options.map((opt, i) => {
          const state =
            correct !== undefined && correct !== null && locked
              ? i === correct
                ? 'is-correct'
                : i === selected
                  ? 'is-wrong'
                  : 'is-muted'
              : i === selected
                ? 'is-picked'
                : ''
          return (
            <li key={i}>
              <button className={`option ${state}`} onClick={() => onSelect(i)} disabled={locked}>
                <span className="option-letter">{LETTERS[i]}</span>
                <span className="option-text">{opt}</span>
                <span className="option-key mono" aria-hidden="true">
                  [{i + 1}]
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </article>
  )
}
