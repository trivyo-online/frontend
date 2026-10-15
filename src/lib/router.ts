import { useEffect, useState } from 'react'

export type Route = 'intro' | 'join' | 'host' | 'practice' | 'about' | 'play'

export const STEPS: { key: Route; letter: string; label: string }[] = [
  { key: 'intro', letter: 'A', label: 'Intro' },
  { key: 'join', letter: 'B', label: 'Join' },
  { key: 'host', letter: 'C', label: 'Host' },
  { key: 'practice', letter: 'D', label: 'Practice' },
  { key: 'about', letter: 'E', label: 'About' },
]

function read(): { route: Route; params: URLSearchParams } {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const known: Route[] = ['intro', 'join', 'host', 'practice', 'about', 'play']
  const route = (known as string[]).includes(path) ? (path as Route) : 'intro'
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
