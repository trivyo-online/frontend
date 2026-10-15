import { useCallback, useEffect, useRef, useState } from 'react'

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'offline' | 'closed' | 'error'

export interface LogEntry {
  at: number
  dir: 'in' | 'out' | 'sys'
  text: string
  data?: unknown
}

const MAX_BACKOFF = 15_000
const GIVE_UP_AFTER = 12 // attempts without ever opening

/**
 * One WebSocket that survives bad networks: reconnects with exponential
 * backoff and jitter, waits for the browser to come back online, and
 * reconnects at once when the tab becomes visible again. Pass url=null to
 * stay idle (or to stop for good, e.g. once a quiz has ended).
 */
export function useSocket(url: string | null, onMessage?: (data: unknown, raw: string) => void, onOpen?: () => void) {
  const [status, setStatus] = useState<SocketStatus>('idle')
  const [attempt, setAttempt] = useState(0)
  const [log, setLog] = useState<LogEntry[]>([])
  const ws = useRef<WebSocket | null>(null)
  const handler = useRef(onMessage)
  const opened = useRef(onOpen)
  handler.current = onMessage
  opened.current = onOpen

  const push = useCallback((e: Omit<LogEntry, 'at'>) => {
    setLog((l) => [...l.slice(-199), { ...e, at: Date.now() }])
  }, [])

  useEffect(() => {
    if (!url) {
      setStatus((s) => (s === 'idle' ? s : 'closed'))
      return
    }
    let disposed = false
    let tries = 0
    let everOpened = false
    let timer: number | undefined

    const connect = () => {
      window.clearTimeout(timer)
      if (disposed) return
      if (!navigator.onLine) {
        setStatus('offline')
        return // the 'online' listener reconnects
      }
      setStatus(tries === 0 && !everOpened ? 'connecting' : 'reconnecting')
      const sock = new WebSocket(url)
      ws.current = sock
      sock.onopen = () => {
        tries = 0
        everOpened = true
        setAttempt(0)
        setStatus('open')
        push({ dir: 'sys', text: 'connected' })
        opened.current?.()
      }
      sock.onmessage = (ev) => {
        const raw = String(ev.data)
        let data: unknown = raw
        try {
          data = JSON.parse(raw)
        } catch {
          /* plain text frame */
        }
        push({ dir: 'in', text: raw, data })
        handler.current?.(data, raw)
      }
      sock.onclose = (ev) => {
        if (disposed || ws.current !== sock) return // replaced or unmounted
        ws.current = null
        if (!everOpened && tries >= GIVE_UP_AFTER) {
          setStatus('error')
          push({ dir: 'sys', text: 'could not connect; giving up' })
          return
        }
        tries++
        setAttempt(tries)
        const delay = Math.min(MAX_BACKOFF, 500 * 2 ** Math.min(tries, 6)) * (0.5 + Math.random() / 2)
        setStatus(navigator.onLine ? 'reconnecting' : 'offline')
        push({ dir: 'sys', text: `connection lost${ev.reason ? ` (${ev.reason})` : ''}; retrying in ${(delay / 1000).toFixed(1)}s` })
        timer = window.setTimeout(connect, delay)
      }
    }

    const retryNow = () => {
      if (disposed || (ws.current && ws.current.readyState <= WebSocket.OPEN)) return
      tries = Math.max(0, tries - 1)
      connect()
    }
    const onOffline = () => {
      setStatus('offline')
      // Don't wait for TCP to notice; drop the dead socket now.
      ws.current?.close()
    }
    const onVisible = () => document.visibilityState === 'visible' && retryNow()

    window.addEventListener('online', retryNow)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    connect()
    return () => {
      disposed = true
      window.clearTimeout(timer)
      window.removeEventListener('online', retryNow)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
      const sock = ws.current
      ws.current = null
      sock?.close()
    }
  }, [url, push])

  const send = useCallback(
    (payload: unknown) => {
      const sock = ws.current
      if (!sock || sock.readyState !== WebSocket.OPEN) return false
      const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
      sock.send(text)
      push({ dir: 'out', text, data: payload })
      return true
    },
    [push],
  )

  return { status, attempt, log, send }
}
