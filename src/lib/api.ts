// Client for trivyo-online/backend. Field names mirror the Go structs.

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8080'
export const WS_URL = API_URL.replace(/^http/, 'ws')

export interface Question {
  Question: string
  Options: string[]
  /** Index of the correct option, as a string. */
  Correctoption: string
  Eachquestiontime?: number | null
}

export interface EventDoc {
  Nameofroom: string
  StartTime: string
  DateofQuiz: string
  RoomId: string
  HostID: string
  Questions: Question[]
  QuizStarted?: boolean
  ScheduledAt?: string | null
  AutoStart?: boolean
  Finished?: boolean
}

export interface EventSummary {
  RoomId: string
  Nameofroom: string
  DateofQuiz: string
  StartTime: string
  QuestionCount: number
  Live: boolean
  CreatedAt: string
  ScheduledAt?: string | null
  AutoStart?: boolean
  Finished?: boolean
}

export interface BoardEntry {
  rank: number
  userid: string
  score: number
  correct: number
  answered: number
  totalms: number
  rooms?: number
}

export interface QStat {
  questionno: number
  question: string
  options: string[]
  correctoption: number
  counts: number[]
  total: number
  correct: number
  avgms: number
}

export interface RoomInfo {
  roomid: string
  name: string
  hostid: string
  date: string
  starttime: string
  questioncount: number
  live: boolean
  scheduledat?: string | null
  autostart?: boolean
  finished?: boolean
}

// ─── Session ───────────────────────────────────────────────────────────

const SESSION_KEY = 'trivyo.admin'

export interface Session {
  token: string
  username: string
}

export function getSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null
    return s?.token ? s : null
  } catch {
    return null
  }
}

export function setSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage blocked: session lasts for this page only */
  }
  window.dispatchEvent(new Event('trivyo:session'))
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function req<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const s = getSession()
    if (s) headers.Authorization = `Bearer ${s.token}`
  }
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(`Can't reach the backend at ${API_URL}`, 0)
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && auth) setSession(null)
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status)
  return data as T
}

// ─── Admin ─────────────────────────────────────────────────────────────

export const signup = (username: string, password: string, code?: string) =>
  req<Session>('POST', '/api/admin/signup', { username, password, code })
export const login = (username: string, password: string) => req<Session>('POST', '/api/admin/login', { username, password })

export const listEvents = () => req<{ events: EventSummary[] }>('GET', '/api/admin/events', undefined, true)
export const getEvent = (roomid: string) => req<{ event: EventDoc; live: boolean }>('GET', `/api/admin/events/${roomid}`, undefined, true)
export const createEvent = (e: { Nameofroom: string; DateofQuiz: string; StartTime: string; Questions?: Question[] }) =>
  req<{ roomid: string; event: EventDoc }>('POST', '/api/create-event', e, true)
export const saveEvent = (roomid: string, e: Pick<EventDoc, 'Nameofroom' | 'DateofQuiz' | 'StartTime' | 'Questions' | 'ScheduledAt' | 'AutoStart'>) =>
  req<{ event: EventDoc }>('PUT', `/api/admin/events/${roomid}`, e, true)
export const deleteEvent = (roomid: string) => req<{ message: string }>('DELETE', `/api/admin/events/${roomid}`, undefined, true)
/** Clears a test's players and answers so it can run again; a live room goes back to its lobby. */
export const resetEvent = (roomid: string) =>
  req<{ message: string; players: number; answers: number; live: boolean }>('POST', `/api/admin/events/${roomid}/reset`, undefined, true)

// ─── Public ────────────────────────────────────────────────────────────

export const roomInfo = (roomid: string) => req<RoomInfo>('GET', `/api/rooms/${encodeURIComponent(roomid)}`)
export const roomBoard = (roomid: string) => req<{ entries: BoardEntry[] }>('GET', `/api/rooms/${encodeURIComponent(roomid)}/leaderboard?limit=500`)
export const roomStats = (roomid: string) => req<{ name: string; questions: QStat[] }>('GET', `/api/rooms/${encodeURIComponent(roomid)}/stats`)
export const globalBoard = () =>
  req<{ entries: BoardEntry[]; totals: { players: number; rooms: number; answers: number; correct: number } }>('GET', '/api/leaderboard?limit=100')
export const recentRooms = () =>
  req<{ rooms: { roomid: string; name: string; players: number; last: string; live: boolean }[] }>('GET', '/api/rooms')

// ─── Sockets ───────────────────────────────────────────────────────────

export function hostSocketUrl(roomid: string, token: string) {
  return `${WS_URL}/api/host?${new URLSearchParams({ roomid, token })}`
}

/** Private per-browser key that lets a refresh rejoin under the same name. */
function rejoinKey(): string {
  const k = 'trivyo.key'
  try {
    let v = localStorage.getItem(k)
    if (!v) {
      v = crypto.randomUUID()
      localStorage.setItem(k, v)
    }
    return v
  } catch {
    return (window as { __trivyoKey?: string }).__trivyoKey ??= crypto.randomUUID()
  }
}

export function playerSocketUrl(roomid: string, userid: string) {
  return `${WS_URL}/api/connect?${new URLSearchParams({ roomid, userid, key: rejoinKey() })}`
}

export interface RoomSummary {
  roomid: string
  name: string
  hostid: string
  questioncount: number
  current: number
  auto?: boolean
  /** Scheduled start (epoch ms) while waiting in the lobby. */
  startsat?: number
}

/** Frames the server sends; see the backend README. */
export type ServerFrame =
  | { type: 'welcome'; role: 'host' | 'player'; room: RoomSummary; userid?: string; score?: number; leaderboard: BoardEntry[]; state?: { questionno: number; deadline: number; now: number; revealed: boolean; secondsleft: number; stats: QStat | null } | null }
  | { type: 'question'; questionno: number; total: number; question: { Question: string; Options: string[]; Eachquestiontime: number }; deadline: number; now: number }
  | { type: 'result'; questionno: number; choice: number; correct: boolean; points: number; score: number; resumed?: boolean }
  | { type: 'answer'; userid: string; questionno: number; choice: number; correct: boolean; score: number; ms: number }
  | { type: 'players'; count: number; players: string[] }
  | { type: 'leaderboard' | 'hostboard'; entries: BoardEntry[] }
  | { type: 'reveal'; questionno: number; correctoption: number; stats: QStat | null }
  | { type: 'room'; room: RoomSummary }
  | { type: 'end'; leaderboard: BoardEntry[] }
  /** Players get a message just before they are disconnected; hosts get the emptied room. */
  | { type: 'reset'; message?: string; room?: RoomSummary; players?: number; answers?: number }
  | { type: 'error'; code?: string; message: string; questionno?: number }
  | { type: 'pong'; now: number }

/**
 * Local deadline for a question frame. Based on its duration so a skewed
 * client clock doesn't matter; capped by the server deadline for late joiners.
 */
export function localDeadline(f: { deadline: number; now: number }) {
  // The server sends its own clock with each question, so the remaining
  // time is exact even when the device clock is wrong or the frame was slow.
  return Date.now() + Math.max(0, f.deadline - f.now)
}

export function asFrame(d: unknown): ServerFrame | null {
  return d && typeof d === 'object' && typeof (d as { type?: unknown }).type === 'string' ? (d as ServerFrame) : null
}
