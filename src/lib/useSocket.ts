import { useCallback, useEffect, useRef, useState } from 'react'

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export interface LogEntry {
  at: number
  dir: 'in' | 'out' | 'sys'
  text: string
  data?: unknown
}

/** One WebSocket with a rolling message log. Pass url=null to stay idle. */
export function useSocket(url: string | null, onMessage?: (data: unknown, raw: string) => void) {
  const [status, setStatus] = useState<SocketStatus>('idle')
  const [log, setLog] = useState<LogEntry[]>([])
  const ws = useRef<WebSocket | null>(null)
  const handler = useRef(onMessage)
  handler.current = onMessage

  const push = useCallback((e: Omit<LogEntry, 'at'>) => {
    setLog((l) => [...l.slice(-199), { ...e, at: Date.now() }])
  }, [])

  useEffect(() => {
    if (!url) return
    setStatus('connecting')
    push({ dir: 'sys', text: `dialing ${url.split('?')[0]}` })
    const sock = new WebSocket(url)
    ws.current = sock
    sock.onopen = () => {
      setStatus('open')
      push({ dir: 'sys', text: 'connection open' })
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
    sock.onerror = () => {
      setStatus('error')
      push({ dir: 'sys', text: 'socket error — is the backend running, and is the room live?' })
    }
    sock.onclose = (ev) => {
      setStatus((s) => (s === 'error' ? s : 'closed'))
      push({ dir: 'sys', text: `closed${ev.reason ? `: ${ev.reason}` : ''}` })
    }
    return () => {
      sock.onclose = null
      sock.close()
      ws.current = null
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

  return { status, log, send }
}
