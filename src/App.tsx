import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Footer, Nav, ScrollRail } from './components/Chrome'
import { ParticleField, type FieldShape } from './components/ParticleField'
import { Home } from './pages/Home'
import { useRoute, type Route } from './lib/router'

// Pages other than the landing load on demand: less to download on slow links.
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const Editor = lazy(() => import('./pages/Editor').then((m) => ({ default: m.Editor })))
const HostLive = lazy(() => import('./pages/HostLive').then((m) => ({ default: m.HostLive })))
const Join = lazy(() => import('./pages/Join').then((m) => ({ default: m.Join })))
const Play = lazy(() => import('./pages/Play').then((m) => ({ default: m.Play })))
const Practice = lazy(() => import('./pages/Practice').then((m) => ({ default: m.Practice })))
const Ranks = lazy(() => import('./pages/Ranks').then((m) => ({ default: m.Ranks })))

const ROUTE_FIELD: Record<Route, { shape: FieldShape; band: number }> = {
  intro: { shape: 'ring', band: 2 },
  join: { shape: 'loops', band: 1 },
  play: { shape: 'scatter', band: 3 },
  admin: { shape: 'grid', band: 3 },
  editor: { shape: 'grid', band: 3 },
  live: { shape: 'scatter', band: 4 },
  practice: { shape: 'orbit', band: 4 },
  ranks: { shape: 'wave', band: 2 },
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

  // Busy screens (forms, tables) get a dimmer field so text stays legible.
  const busy = route !== 'intro' && route !== 'practice' && route !== 'about'

  return (
    <>
      <ParticleField shape={shape} motion={motion} />
      <div className={`veil ${busy ? 'on' : ''}`} aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Nav route={route} />
      <main className={`page page-${route}`} key={`${route}?${params}`}>
        <Suspense fallback={<p className="mono dim page-loading">LOADING…</p>}>
          {route === 'intro' && <Home onShape={setShape} onBand={setBand} />}
        {route === 'join' && <Join params={params} />}
        {route === 'play' && <Play params={params} />}
        {route === 'admin' && <Admin />}
        {route === 'editor' && <Editor params={params} />}
        {route === 'live' && <HostLive params={params} />}
        {route === 'practice' && <Practice />}
        {route === 'ranks' && <Ranks params={params} />}
        {route === 'about' && <About />}
        </Suspense>
      </main>
      <ScrollRail />
      <Footer motion={motion} onToggleMotion={toggleMotion} band={band} />
    </>
  )
}
