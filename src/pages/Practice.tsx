import { useCallback, useEffect, useState } from 'react'
import { QuestionCard } from '../components/QuestionCard'
import { Button, SectionHead, Tag } from '../components/UI'
import { DEFAULT_SECONDS, POINTS_PER_CORRECT, PRACTICE_BANK, shuffle } from '../lib/questions'

const SET_SIZE = 8
const REVEAL_MS = 1400

type Phase = 'ready' | 'run' | 'done'

export function Practice() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [set, setSet] = useState(() => shuffle(PRACTICE_BANK).slice(0, SET_SIZE))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [left, setLeft] = useState(DEFAULT_SECONDS)
  const [answers, setAnswers] = useState<(number | null)[]>([])

  const q = set[i]
  const correct = q ? Number(q.Correctoption) : -1

  const lock = useCallback(
    (choice: number | null) => {
      if (picked !== null || phase !== 'run') return
      setPicked(choice ?? -1)
      setAnswers((a) => [...a, choice])
      window.setTimeout(() => {
        if (i + 1 >= set.length) setPhase('done')
        else {
          setI(i + 1)
          setPicked(null)
          setLeft(DEFAULT_SECONDS)
        }
      }, REVEAL_MS)
    },
    [picked, phase, i, set.length],
  )

  useEffect(() => {
    if (phase !== 'run' || picked !== null) return
    if (left <= 0) {
      lock(null)
      return
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [phase, picked, left, lock])

  const start = () => {
    setSet(shuffle(PRACTICE_BANK).slice(0, SET_SIZE))
    setI(0)
    setPicked(null)
    setLeft(DEFAULT_SECONDS)
    setAnswers([])
    setPhase('run')
  }

  if (phase === 'ready') {
    return (
      <section className="screen center">
        <Tag style={{ top: '26%', left: '16%' }} className="float">{SET_SIZE} QUESTIONS</Tag>
        <Tag style={{ bottom: '24%', right: '16%' }} className="float">{DEFAULT_SECONDS}S EACH</Tag>
        <div className="panel narrow">
          <SectionHead marker="D" title={<>PRACTICE<br />SESSION</>}>
            {SET_SIZE} random questions, {DEFAULT_SECONDS} seconds each. Click an option or press 1–4 / A–D on your keyboard.
          </SectionHead>
          <Button onClick={start}>Begin</Button>
        </div>
      </section>
    )
  }

  if (phase === 'done') {
    const right = answers.filter((a, k) => a !== null && a === Number(set[k].Correctoption)).length
    return (
      <section className="screen center">
        <div className="panel wide">
          <p className="mono dim">RESULT</p>
          <h2 className="display score">
            {right * POINTS_PER_CORRECT}
            <span className="mono dim"> PTS</span>
          </h2>
          <p className="lede">
            {right} of {set.length} correct.
          </p>
          <ol className="review">
            {set.map((item, k) => {
              const ok = answers[k] === Number(item.Correctoption)
              return (
                <li key={k} className={ok ? 'ok' : 'miss'}>
                  <span className="mono">{ok ? '■' : '□'} {String(k + 1).padStart(2, '0')}</span>
                  <span>{item.Question}</span>
                  <span className="mono dim">{item.Options[Number(item.Correctoption)]}</span>
                </li>
              )
            })}
          </ol>
          <Button onClick={start}>Run it again</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="screen center">
      <div className="panel wide">
        <QuestionCard
          index={i}
          total={set.length}
          question={q.Question}
          options={q.Options}
          selected={picked}
          correct={picked !== null ? correct : null}
          secondsLeft={left}
          seconds={DEFAULT_SECONDS}
          onSelect={lock}
        />
        <p className="mono dim status-line">
          SCORE {answers.filter((a, k) => a === Number(set[k].Correctoption)).length * POINTS_PER_CORRECT}
        </p>
      </div>
    </section>
  )
}
