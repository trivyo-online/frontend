import { useEffect, useRef } from 'react'
import type { FieldShape } from '../components/ParticleField'
import { Button, SectionHead, Tag } from '../components/UI'
import { navigate } from '../lib/router'

interface Props {
  onShape: (s: FieldShape) => void
  onBand: (b: number) => void
}

const QUOTE = [
  ['I', 'GUESS', 'ONE', 'PERSON'],
  ['CAN', 'MAKE', 'A', 'DIFFERENCE'],
]

/** The Google Developer Groups bracket mark, in Google's four colours. */
function GdgMark() {
  return (
    <svg className="gdg-mark" viewBox="0 0 48 24" aria-hidden="true">
      <g fill="none" strokeWidth="5" strokeLinecap="round">
        <path d="M17 4 6 12" stroke="#ea4335" />
        <path d="M6 12l11 8" stroke="#4285f4" />
        <path d="M31 4l11 8" stroke="#34a853" />
        <path d="M42 12 31 20" stroke="#fbbc04" />
      </g>
    </svg>
  )
}

function PoweredBy() {
  return (
    <div className="powered" aria-label="Powered by Google Developer Groups on Campus GDGoC SKNCOE and Google">
      <span className="mono dim">POWERED BY</span>
      <span className="powered-brand">
        <GdgMark />
        <span>
          <strong>Google Developer Groups on Campus</strong>
          <span className="mono dim powered-chapter">GDGoC SKNCOE</span>
        </span>
      </span>
      <span className="google-word" aria-hidden="true">
        <span style={{ color: '#4285f4' }}>G</span>
        <span style={{ color: '#ea4335' }}>o</span>
        <span style={{ color: '#fbbc04' }}>o</span>
        <span style={{ color: '#4285f4' }}>g</span>
        <span style={{ color: '#34a853' }}>l</span>
        <span style={{ color: '#ea4335' }}>e</span>
      </span>
    </div>
  )
}

const SECTIONS: { shape: FieldShape; band: number }[] = [
  { shape: 'ring', band: 2 },
  { shape: 'loops', band: 1 },
  { shape: 'wave', band: 3 },
  { shape: 'orbit', band: 4 },
]

export function Home({ onShape, onBand }: Props) {
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = Number((e.target as HTMLElement).dataset.i)
          onShape(SECTIONS[i].shape)
          onBand(SECTIONS[i].band)
        }
      },
      { threshold: 0.55 },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [onShape, onBand])

  const reg = (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el
  }

  return (
    <>
      <section className="screen hero" ref={reg(0)} data-i={0}>
        <Tag style={{ top: '22%', left: '14%' }} className="float">LIVE ROOMS</Tag>
        <Tag style={{ top: '22%', right: '14%' }} className="float">4 OPTIONS</Tag>
        <Tag style={{ top: '40%', right: '5%' }} className="float">+50 PTS</Tag>
        <Tag style={{ bottom: '18%', left: '9%' }} className="float">20 SEC</Tag>
        <Tag style={{ bottom: '20%', right: '7%' }} className="float">RANKING</Tag>

        <h1 className="display hero-title quote">
          {QUOTE.map((row, r) => (
            <span key={r} className="row">
              {row.map((w, i) => (
                <span key={w} style={{ animationDelay: `${0.05 + (r * 3 + i) * 0.1}s` }}>
                  {w}
                </span>
              ))}
            </span>
          ))}
          <cite className="mono hero-cite">— STANLY CODE</cite>
        </h1>
        <PoweredBy />
        <p className="hero-copy">
          Trivyo runs live multiple-choice rooms. A host opens a room, players join with a code, and every answer is scored the moment it lands.
        </p>
        <a className="chevron" href="#how" aria-label="Scroll to how it works" onClick={(e) => {
          e.preventDefault()
          refs.current[1]?.scrollIntoView({ behavior: 'smooth' })
        }}>
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l6 6 6-6" /></svg>
        </a>
      </section>

      <section id="how" className="screen split right" ref={reg(1)} data-i={1}>
        <Tag style={{ top: '22%', left: '22%' }} className="float">ROOM CODE</Tag>
        <Tag style={{ bottom: '24%', left: '32%' }} className="float">HOST ID</Tag>
        <div className="panel">
          <SectionHead marker="B" title={<>WE ARE ALL<br />CURIOUS BEINGS</>}>
            Got a room code from your host? Join with your name and answer in real time — the faster you lock in, the better.
          </SectionHead>
          <Button onClick={() => navigate('join')}>Join a room</Button>
        </div>
      </section>

      <section className="screen split left" ref={reg(2)} data-i={2}>
        <Tag style={{ top: '30%', right: '18%' }} className="float">EVENT</Tag>
        <Tag style={{ bottom: '26%', right: '26%' }} className="float">QUESTIONS</Tag>
        <div className="panel">
          <SectionHead marker="C" title={<>SET THE<br />FREQUENCY</>}>
            Create an event, write your questions with four options each, then go live and watch answers stream in.
          </SectionHead>
          <Button onClick={() => navigate('admin')}>Host an event</Button>
        </div>
      </section>

      <section className="screen center" ref={reg(3)} data-i={3}>
        <div className="panel narrow">
          <SectionHead marker="D" title={<>WARM UP<br />SOLO</>}>
            No room? Run a timed practice set offline. Same rules: one pick per question, fifty points when you’re right.
          </SectionHead>
          <div className="actions">
            <Button onClick={() => navigate('practice')}>Start practice</Button>
            <Button icon={false} onClick={() => navigate('ranks')}>Rankings</Button>
          </div>
        </div>
      </section>
    </>
  )
}
