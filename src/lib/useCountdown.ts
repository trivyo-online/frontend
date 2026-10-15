import { useEffect, useState } from 'react'

/** Whole seconds until `deadline` (epoch ms), ticking; 0 once passed. */
export function useCountdown(deadline: number) {
  const calc = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  const [left, setLeft] = useState(calc)
  useEffect(() => {
    setLeft(calc())
    if (!deadline) return
    const t = window.setInterval(() => setLeft(calc()), 250)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline])
  return left
}
