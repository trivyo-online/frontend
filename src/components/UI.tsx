import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react'

/** Dashed-outline chip with a square bullet — "▪ 8-13HZ". */
export function Tag({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <span className={`tag ${className}`} style={style}>
      <i />
      {children}
    </span>
  )
}

export function Button({ children, icon = true, variant = 'ghost', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: boolean; variant?: 'ghost' | 'solid' }) {
  return (
    <button className={`btn btn-${variant}`} {...rest}>
      {icon && (
        <span className="btn-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="3" cy="4" r="1.3" />
            <circle cx="9" cy="2.5" r="1" />
            <circle cx="7" cy="8" r="1.5" />
            <circle cx="11.5" cy="10" r="1" />
            <circle cx="3.5" cy="11" r="1" />
          </svg>
        </span>
      )}
      <span className="btn-label">{children}</span>
    </button>
  )
}

export function Field({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="field-row">
      <span className="mono field-label">{label}</span>
      <input className="input" {...rest} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

/** Circled letter marker, like the "Ð" bullet next to section titles. */
export function Marker({ children }: { children: ReactNode }) {
  return <span className="marker">{children}</span>
}

export function SectionHead({ marker, title, children }: { marker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="section-head">
      <Marker>{marker}</Marker>
      <div>
        <h2 className="display h2">{title}</h2>
        {children && <p className="lede">{children}</p>}
      </div>
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  return (
    <p className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="mono">{tone === 'error' ? 'ERR' : tone === 'ok' ? 'OK' : 'NOTE'}</span>
      {children}
    </p>
  )
}
