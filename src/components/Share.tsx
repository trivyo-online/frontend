import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function joinUrl(room: string) {
  return `${window.location.origin}${window.location.pathname}#/join?room=${encodeURIComponent(room)}`
}

/** QR code for a room's join link, drawn as inline SVG in the page's ink. */
export function RoomQR({ room, size = 200 }: { room: string; size?: number }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let live = true
    QRCode.toString(joinUrl(room), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0a0a0a', light: '#f2efe6' } })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(''))
    return () => {
      live = false
    }
  }, [room])
  return <div className="qr" style={{ width: size, height: size }} role="img" aria-label={`QR code to join room ${room}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

/** QR + code + copyable link: everything a host needs to bring players in. */
export function SharePanel({ room }: { room: string }) {
  const [copied, setCopied] = useState(false)
  const url = joinUrl(room)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy the join link', url)
    }
  }
  return (
    <div className="share">
      <RoomQR room={room} size={168} />
      <div className="share-text">
        <p className="mono field-label">SCAN OR GO TO JOIN</p>
        <p className="display share-code">{room}</p>
        <button className="mini" onClick={copy}>
          {copied ? 'LINK COPIED' : 'COPY JOIN LINK'}
        </button>
      </div>
    </div>
  )
}
