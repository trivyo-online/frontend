import { useEffect, useState } from 'react'

export type Route = 'intro' | 'join' | 'play' | 'admin' | 'editor' | 'live' | 'practice' | 'ranks' | 'about'

export const STEPS: { key: Route; letter: string; label: string }[] = [
  { key: 'intro', letter: 'A', label: 'Intro' },
  { key: 'join', letter: 'B', label: 'Join' },
  { key: 'admin', letter: 'C', label: 'Admin' },
  { key: 'practice', letter: 'D', label: 'Practice' },
  { key: 'ranks', letter: 'E', label: 'Ranks' },
]

/** Which nav step a route lights up. */
export const STEP_OF: Record<Route, Route> = {
  intro: 'intro',
  join: 'join',
  play: 'join',
  admin: 'admin',
  editor: 'admin',
  live: 'admin',
  practice: 'practice',
  ranks: 'ranks',
  about: 'about',
}

const KNOWN = Object.keys(STEP_OF) as Route[]

function read(): { route: Route; params: URLSearchParams } {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const route = (KNOWN as string[]).includes(path) ? (path as Route) : 'intro'
  return { route, params: new URLSearchParams(query) }
}

export function navigate(route: Route, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : ''
  window.location.hash = `/${route}${q}`
}

export function useRoute() {
  const [state, setState] = useState(read)
  useEffect(() => {
    const on = () => {
      setState(read())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return state
}
