import type { Question } from './api'

// Offline bank for Practice mode. Same shape the backend stores.
export const PRACTICE_BANK: Question[] = [
  { Question: 'Which planet has the shortest day in the solar system?', Options: ['Earth', 'Jupiter', 'Mars', 'Mercury'], Correctoption: '1' },
  { Question: 'What does HTTP stand for?', Options: ['HyperText Transfer Protocol', 'High Transfer Text Process', 'Hosted Text Transport Path', 'Hyperlink Terminal Protocol'], Correctoption: '0' },
  { Question: 'Alpha brainwaves sit roughly in which frequency band?', Options: ['0.5–4 Hz', '4–8 Hz', '8–13 Hz', '13–30 Hz'], Correctoption: '2' },
  { Question: 'Who wrote "One Hundred Years of Solitude"?', Options: ['Jorge Luis Borges', 'Gabriel García Márquez', 'Isabel Allende', 'Pablo Neruda'], Correctoption: '1' },
  { Question: 'Which data structure works on a first-in, first-out basis?', Options: ['Stack', 'Tree', 'Queue', 'Heap'], Correctoption: '2' },
  { Question: 'The chemical symbol "Au" stands for…', Options: ['Silver', 'Argon', 'Aluminium', 'Gold'], Correctoption: '3' },
  { Question: 'In which year did the first crewed Moon landing happen?', Options: ['1965', '1969', '1972', '1959'], Correctoption: '1' },
  { Question: 'What is the time complexity of binary search?', Options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'], Correctoption: '2' },
  { Question: 'Which instrument has 88 keys in its standard form?', Options: ['Organ', 'Piano', 'Harpsichord', 'Accordion'], Correctoption: '1' },
  { Question: 'The Go keyword for launching a concurrent function is…', Options: ['async', 'spawn', 'go', 'thread'], Correctoption: '2' },
  { Question: 'Which is the largest ocean on Earth?', Options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], Correctoption: '3' },
  { Question: 'What does a WebSocket upgrade start from?', Options: ['An HTTP request', 'A UDP packet', 'A DNS lookup', 'An SMTP session'], Correctoption: '0' },
]

export const POINTS_PER_CORRECT = 50 // matches IncrBy(..., 50) in the backend
export const DEFAULT_SECONDS = 20

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
