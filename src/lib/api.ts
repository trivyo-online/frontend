// Thin client for trivyo-online/backend (Gin, see routes/routes.go).
// Field names mirror the Go structs exactly, since the backend binds
// untagged struct fields (Nameofroom, StartTime, ...) by their Go names.

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8080'

export const WS_URL = API_URL.replace(/^http/, 'ws')

export interface CreateEventInput {
  Nameofroom: string
  StartTime: string
  DateofQuiz: string
  HostID: string
}

export interface QuestionInput {
  Question: string
  Options: string[]
  /** Index of the correct option, as a string — HReadPump does strconv.Atoi on it. */
  Correctoption: string
  Eachquestiontime?: number
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  return data as T
}

export function createEvent(input: CreateEventInput) {
  return post<{ message: string; id: string }>('/api/create-event', input)
}

export function addQuestion(roomid: string, question: QuestionInput) {
  return post<{ message: string }>('/api/add-question', { roomid, question })
}

export function hostSocketUrl(hostid: string, roomid: string) {
  return `${WS_URL}/api/host?${new URLSearchParams({ hostid, roomid })}`
}

export function playerSocketUrl(roomid: string, hostid: string, userid: string) {
  return `${WS_URL}/api/connect?${new URLSearchParams({ roomid, hostid, userid })}`
}

/** Answer payload shape the host socket grades (logicforuser.HostMessage). */
export interface AnswerMessage {
  roomid: string
  userid: string
  questionno: string
  ans: string
}

/** Pull a question out of whatever the socket relays, tolerating a few shapes. */
export function parseQuestion(raw: unknown): (QuestionInput & { index?: number }) | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const q = (o.question && typeof o.question === 'object' ? o.question : o) as Record<string, unknown>
  const text = q.Question ?? q.question
  const options = q.Options ?? q.options
  if (typeof text !== 'string' || !Array.isArray(options)) return null
  const index = o.questionno ?? o.index
  return {
    Question: text,
    Options: options.map(String),
    Correctoption: String(q.Correctoption ?? ''),
    Eachquestiontime: typeof q.Eachquestiontime === 'number' ? q.Eachquestiontime : undefined,
    index: index !== undefined ? Number(index) : undefined,
  }
}
