import { CLASS_IDS, EQUIPMENT, type ClassId, type RoClass } from '@rota/content'
import { z } from 'zod/v4'

import type { QuizStats } from './quiz'

/**
 * Everything ROTA remembers lives here, in the browser's local storage (plan D2): the
 * last setup per class. One versioned key; anything unreadable falls back to defaults.
 */
const KEY = 'rota:v1'

const setupSchema = z.object({
  scope: z.enum(['all', 'new']),
  count: z.number().int().min(1).max(100),
  equipment: z.array(z.enum(EQUIPMENT)),
  startSide: z.enum(['left', 'right', 'random']),
  showDescription: z.boolean(),
  speak: z.boolean().default(false),
})
export type Setup = z.infer<typeof setupSchema>

const storedSchema = z.object({
  setups: z.partialRecord(z.enum(CLASS_IDS), setupSchema),
  installHintDismissed: z.boolean().optional(),
  /** Quiz answers per card (`lib/quiz.ts` `statKey`). */
  quiz: z
    .record(z.string(), z.object({ right: z.number().int(), wrong: z.number().int() }))
    .optional(),
})
type Stored = z.infer<typeof storedSchema>

export const defaultSetup = (cls: RoClass): Setup => ({
  scope: 'all',
  count: cls.course.maxCards,
  equipment: [],
  startSide: 'left',
  showDescription: false,
  speak: false,
})

/** `localStorage` can be missing (server render) or throw (private mode, quota). */
function read(): Stored {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    const parsed = raw ? storedSchema.safeParse(JSON.parse(raw)) : undefined
    return parsed?.success ? parsed.data : { setups: {} }
  } catch {
    return { setups: {} }
  }
}

export function loadSetup(cls: RoClass): Setup {
  return read().setups[cls.id] ?? defaultSetup(cls)
}

function write(stored: Stored): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(stored))
  } catch {
    // Not being remembered is fine; failing to start a deck is not.
  }
  // The `storage` event only reaches *other* tabs; tell this one's subscribers too.
  for (const listener of listeners) listener()
}

const listeners = new Set<() => void>()

/** For `useSyncExternalStore`: changes from this tab and from other tabs. */
export function subscribeStorage(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function saveSetup(classId: ClassId, setup: Setup): void {
  const stored = read()
  stored.setups[classId] = setup
  write(stored)
}

export const isInstallHintDismissed = () => read().installHintDismissed === true

export function dismissInstallHint(): void {
  write({ ...read(), installHintDismissed: true })
}

/** Stable snapshot for `useSyncExternalStore` (a new object each call would loop). */
export const quizStatsSnapshot = () => JSON.stringify(read().quiz ?? {})

export function saveQuizStats(stats: QuizStats): void {
  write({ ...read(), quiz: stats })
}

/** Forget the answers for some cards (one class) and keep the rest. */
export function resetQuizStats(keys: string[]): void {
  const stored = read()
  const quiz = { ...stored.quiz }
  for (const key of keys) delete quiz[key]
  write({ ...stored, quiz })
}
