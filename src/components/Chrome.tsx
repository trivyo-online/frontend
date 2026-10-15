import { useEffect, useState } from 'react'
import { STEPS, STEP_OF, navigate, type Route } from '../lib/router'

export function Logo() {
  return (
    <a className="logo" href="#/intro" aria-label="Trivyo home">
      <svg width="34" height="22" viewBox="0 0 34 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M2 14a11 11 0 0 1 22 0" />
        <path d="M6 14a7 7 0 0 1 14 0" />
        <path d="M10 14a3 3 0 0 1 6 0" />
        <path d="M14 16c3 4 9 4 12 0s9-4 6 0" />
      </svg>
      <span>TRIVY<span className="macron">O</span></span>
    </a>
  )
}

export function Nav({ route }: { route: Route }) {
  const activeKey = STEP_OF[route]
  return (
    <header className="topbar">
      <Logo />
      <nav className="stepper" aria-label="Sections">
        {STEPS.map((s, i) => {
          const active = s.key === activeKey
          return (
            <div key={s.key} className={`step ${i % 2 ? 'low' : 'high'}`}>
              {i > 0 && <span className="step-link" aria-hidden="true" />}
              <button
                className={`step-dot ${active ? 'is-active' : ''}`}
                onClick={() => navigate(s.key)}
                aria-current={active ? 'page' : undefined}
                aria-label={`${s.letter} — ${s.label}`}
              >
                {s.letter}
              </button>
              {active && <span className="step-label">{s.label}</span>}
            </div>
          )
        })}
        <span className="nav-links">
          <a href="#/about">· ABOUT</a>
          <a href="https://github.com/trivyo-online" target="_blank" rel="noreferrer">· GITHUB</a>
        </span>
      </nav>
    </header>
  )
}

const BANDS = [
  { name: 'DELTA', hz: '2.0' },
  { name: 'THETA', hz: '6.0' },
  { name: 'ALPHA', hz: '8.0' },
  { name: 'BETA', hz: '18.0' },
  { name: 'GAMMA', hz: '40.0' },
]

export function Footer({ motion, onToggleMotion, band }: { motion: boolean; onToggleMotion: () => void; band: number }) {
  const b = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]
  return (
    <footer className="bottombar">
      <span className="mono dim">IMAGINED BY <strong>TRIVYO</strong></span>
      <div className="readout">
        <span className="mono">
          {b.name} <span className="dim">· {b.hz} HZ</span>
        </span>
        <span className="track" aria-hidden="true">
          {BANDS.map((_, i) => (
            <i key={i} className={i === band ? 'on' : ''} />
          ))}
        </span>
        <button className="wave-btn" onClick={onToggleMotion} aria-pressed={motion} aria-label={motion ? 'Pause background motion' : 'Resume background motion'}>
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {motion ? <path d="M1 6c2-5 3-5 4 0s2 5 4 0 3-5 4 0 2 5 4 0" /> : <path d="M1 6h16" />}
          </svg>
        </button>
      </div>
    </footer>
  )
}

/** Thin progress rail on the right edge, like the reference. */
export function ScrollRail() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? window.scrollY / max : 0)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])
  return (
    <div className="rail" aria-hidden="true">
      <span style={{ top: `${p * 85}%` }} />
    </div>
  )
}
