import { useEffect, useRef } from 'react'

export type FieldShape = 'ring' | 'loops' | 'wave' | 'grid' | 'orbit' | 'scatter'

interface Props {
  shape: FieldShape
  /** 0 freezes the drift; the footer toggle drives this. */
  motion: boolean
}

interface P {
  x: number
  y: number
  tx: number
  ty: number
  size: number
  alpha: number
  seed: number
}

const COUNT_DESKTOP = 3200
const COUNT_MOBILE = 1400

// Each shape maps particle i of n (with a stable random seed) to a point
// in a unit space centred on 0,0 and roughly spanning -1..1.
function target(shape: FieldShape, i: number, n: number, seed: number, aspect: number): [number, number] {
  const t = i / n
  const r1 = fract(seed * 12.9898)
  const r2 = fract(seed * 78.233)
  const gauss = (r1 + r2 + fract(seed * 37.719)) / 3 - 0.5
  switch (shape) {
    case 'ring': {
      const a = t * Math.PI * 2 * 7 + seed
      const r = 0.72 + gauss * 0.22 + (r2 < 0.12 ? (r1 - 0.5) * 0.9 : 0)
      return [Math.cos(a) * r, Math.sin(a) * r]
    }
    case 'loops': {
      // A tangle of lissajous loops — the "neural" look.
      const k = Math.floor(r1 * 5)
      const a = t * Math.PI * 2 * 11 + seed
      const fx = [3, 2, 5, 4, 3][k]
      const fy = [2, 3, 4, 5, 5][k]
      const ox = [-0.45, 0.35, -0.1, 0.55, -0.6][k]
      const oy = [-0.3, -0.35, 0.35, 0.2, 0.45][k]
      return [ox + Math.sin(a * fx * 0.1 + k) * 0.55 + gauss * 0.05, oy + Math.cos(a * fy * 0.1) * 0.4 + gauss * 0.05]
    }
    case 'wave': {
      const x = r1 * 2 - 1
      const band = Math.floor(r2 * 4)
      const y = Math.sin(x * Math.PI * (1.5 + band * 0.6) + band) * (0.18 + band * 0.04) + (band - 1.5) * 0.28 + gauss * 0.04
      return [x * Math.max(1, aspect) * 0.95, y]
    }
    case 'grid': {
      const cols = 40
      const gx = (i % cols) / (cols - 1)
      const gy = Math.floor(i / cols) / Math.ceil(n / cols)
      return [(gx * 2 - 1) * 0.9 * Math.max(1, aspect) * 0.8 + gauss * 0.01, (gy * 2 - 1) * 0.85 + gauss * 0.01]
    }
    case 'orbit': {
      const ring = Math.floor(r1 * 4)
      const a = t * Math.PI * 2 * 5 + seed
      const r = 0.25 + ring * 0.2 + gauss * 0.04
      const tilt = 0.45
      return [Math.cos(a) * r * 1.6, Math.sin(a) * r * tilt + (ring - 1.5) * 0.04]
    }
    default:
      return [(r1 * 2 - 1) * Math.max(1, aspect), r2 * 2 - 1]
  }
}

function fract(x: number) {
  return x - Math.floor(x)
}

export function ParticleField({ shape, motion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shapeRef = useRef(shape)
  const motionRef = useRef(motion)
  const retarget = useRef<() => void>(() => {})

  useEffect(() => {
    shapeRef.current = shape
    retarget.current()
  }, [shape])
  useEffect(() => {
    motionRef.current = motion
  }, [motion])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--particle').trim() || '242,239,230'

    let w = 0
    let h = 0
    let dpr = 1
    let particles: P[] = []
    const mouse = { x: -9999, y: -9999 }
    let raf = 0
    let time = 0

    const place = () => {
      const aspect = w / h
      const scale = Math.min(w, h) * 0.5
      const n = particles.length
      particles.forEach((p, i) => {
        const [x, y] = target(shapeRef.current, i, n, p.seed, aspect)
        p.tx = w / 2 + x * scale
        p.ty = h / 2 + y * scale
      })
    }
    retarget.current = place

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = w < 720 ? COUNT_MOBILE : COUNT_DESKTOP
      if (particles.length !== count) {
        particles = Array.from({ length: count }, (_, i) => ({
          x: Math.random() * w,
          y: Math.random() * h,
          tx: 0,
          ty: 0,
          size: Math.random() < 0.08 ? 1.8 : Math.random() * 1.1 + 0.4,
          alpha: Math.random() * 0.6 + 0.25,
          seed: i * 1.618 + Math.random(),
        }))
      }
      place()
    }

    const draw = () => {
      const moving = motionRef.current && !reduced
      if (moving) time += 0.006
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        const jx = moving ? Math.sin(time * 2 + p.seed * 3) * 1.6 : 0
        const jy = moving ? Math.cos(time * 1.7 + p.seed * 5) * 1.6 : 0
        p.x += (p.tx + jx - p.x) * 0.045
        p.y += (p.ty + jy - p.y) * 0.045
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < 9000) {
          const f = (1 - d2 / 9000) * 6
          const d = Math.sqrt(d2) || 1
          p.x += (dx / d) * f
          p.y += (dy / d) * f
        }
        const twinkle = moving ? 0.75 + Math.sin(time * 4 + p.seed * 7) * 0.25 : 1
        ctx.fillStyle = `rgba(${ink},${p.alpha * twinkle})`
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }
      raf = requestAnimationFrame(draw)
    }

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    const onLeave = () => {
      mouse.x = mouse.y = -9999
    }

    resize()
    if (reduced) particles.forEach((p) => ((p.x = p.tx), (p.y = p.ty)))
    draw()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="field" aria-hidden="true" />
}
