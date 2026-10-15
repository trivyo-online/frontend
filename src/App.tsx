import { useCallback, useEffect, useState } from 'react'
import { Footer, Nav, ScrollRail } from './components/Chrome'
import { ParticleField, type FieldShape } from './components/ParticleField'
import { About } from './pages/About'
import { Home } from './pages/Home'
import { Host } from './pages/Host'
import { Join } from './pages/Join'
import { Play } from './pages/Play'
import { Practice } from './pages/Practice'
import { useRoute, type Route } from './lib/router'

const ROUTE_FIELD: Record<Route, { shape: FieldShape; band: number }> = {
  intro: { shape: 'ring', band: 2 },
  join: { shape: 'loops', band: 1 },
  play: { shape: 'scatter', band: 3 },
  host: { shape: 'grid', band: 3 },
  practice: { shape: 'orbit', band: 4 },
  about: { shape: 'wave', band: 0 },
}

const MOTION_KEY = 'trivyo.motion'

export default function App() {
  const { route, params } = useRoute()
  const [shape, setShape] = useState<FieldShape>(ROUTE_FIELD[route].shape)
  const [band, setBand] = useState(ROUTE_FIELD[route].band)
  const [motion, setMotion] = useState(() => {
    try {
      return localStorage.getItem(MOTION_KEY) !== 'off'
    } catch {
      return true
    }
  })

  useEffect(() => {
    setShape(ROUTE_FIELD[route].shape)
    setBand(ROUTE_FIELD[route].band)
  }, [route])

  const toggleMotion = useCallback(() => {
    setMotion((m) => {
      try {
        localStorage.setItem(MOTION_KEY, m ? 'off' : 'on')
      } catch {
        /* ignore */
      }
      return !m
    })
  }, [])

  return (
    <>
      <ParticleField shape={shape} motion={motion} />
      <div className="grain" aria-hidden="true" />
      <Nav route={route} />
      <main className={`page page-${route}`} key={route}>
        {route === 'intro' && <Home onShape={setShape} onBand={setBand} />}
        {route === 'join' && <Join />}
        {route === 'play' && <Play params={params} />}
        {route === 'host' && <Host />}
        {route === 'practice' && <Practice />}
        {route === 'about' && <About />}
      </main>
      <ScrollRail />
      <Footer motion={motion} onToggleMotion={toggleMotion} band={band} />
    </>
  )
}
