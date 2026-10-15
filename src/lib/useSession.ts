import { useEffect, useState } from 'react'
import { getSession, type Session } from './api'

export function useSession(): Session | null {
  const [s, set] = useState(getSession)
  useEffect(() => {
    const on = () => set(getSession())
    window.addEventListener('trivyo:session', on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener('trivyo:session', on)
      window.removeEventListener('storage', on)
    }
  }, [])
  return s
}
