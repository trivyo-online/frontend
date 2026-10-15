import { useEffect, useRef } from 'react'
import type { LogEntry, SocketStatus } from '../lib/useSocket'

export function StatusPill({ status }: { status: SocketStatus }) {
  return (
    <span className={`pill pill-${status}`}>
      <i />
      {status.toUpperCase()}
    </span>
  )
}

/** Sticky banner while the connection is down; the app keeps retrying. */
export function NetBanner({ status, attempt }: { status: SocketStatus; attempt: number }) {
  if (status !== 'reconnecting' && status !== 'offline') return null
  return (
    <div className="netbar" role="status" aria-live="polite">
      <span className="pulse small" aria-hidden="true" />
      {status === 'offline'
        ? 'YOU’RE OFFLINE · WE’LL REJOIN AS SOON AS THE NETWORK IS BACK'
        : `RECONNECTING${attempt > 1 ? ` · TRY ${attempt}` : ''} · YOUR ANSWERS AND SCORE ARE SAFE`}
    </div>
  )
}

export function Console({ log, title = 'SIGNAL LOG' }: { log: LogEntry[]; title?: string }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight })
  }, [log.length])
  return (
    <div className="console">
      <div className="console-head mono">
        <span>{title}</span>
        <span className="dim">{log.length} LINES</span>
      </div>
      <div className="console-body mono" ref={box} role="log" aria-live="polite">
        {log.length === 0 && <p className="dim">— no signal yet —</p>}
        {log.map((e, i) => (
          <p key={i} className={`line line-${e.dir}`}>
            <span className="dim">{new Date(e.at).toLocaleTimeString([], { hour12: false })}</span>
            <span className="dir">{e.dir === 'in' ? '<<' : e.dir === 'out' ? '>>' : '··'}</span>
            <span className="txt">{e.text}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
