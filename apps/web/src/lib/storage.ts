import { CLASS_IDS, EQUIPMENT, getCard, type ClassId, type RoClass } from '@rota/content'
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

const customCourseSchema = z.object({
  startSide: z.enum(['left', 'right']),
  cards: z.array(z.object({ code: z.string(), supplementary: z.string().optional() })),
  /** Check the order at all — off for a short sequence where the rules don't matter. */
  checks: z.boolean().default(true),
  /** Check against the judges' guidelines too (national classes). */
  guidelines: z.boolean().default(false),
})
/** A course put together by hand (plan §12), being edited. */
export type CustomCourse = z.infer<typeof customCourseSchema>

const storedSchema = z.object({
  setups: z.partialRecord(z.enum(CLASS_IDS), setupSchema),
  /** The last hand-made course per class. */
  customCourses: z.partialRecord(z.enum(CLASS_IDS), customCourseSchema).optional(),
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

export const emptyCustomCourse = (): CustomCourse => ({
  startSide: 'left',
  cards: [],
  checks: true,
  guidelines: false,
})

/**
 * The last hand-made course of a class, empty if there is none. Cards the ruleset no
 * longer knows (a later regulation) are dropped rather than failing the whole course.
 */
export function loadCustomCourse(cls: RoClass): CustomCourse {
  const course = read().customCourses?.[cls.id]
  if (!course) return emptyCustomCourse()
  const known = (code: string | undefined) => !code || getCard(cls.ruleset, code) !== undefined
  return {
    ...course,
    cards: course.cards.filter((c) => known(c.code) && known(c.supplementary)),
  }
}

export function saveCustomCourse(classId: ClassId, course: CustomCourse): void {
  const stored = read()
  write({ ...stored, customCourses: { ...stored.customCourses, [classId]: course } })
}

/**
 * Opens `course` for editing (from a dealt course or a shared link). A different course
 * already in progress is replaced only if `confirmReplace` says so; `false` = keep it.
 */
export function adoptCustomCourse(
  cls: RoClass,
  course: CustomCourse,
  confirmReplace: () => boolean,
): boolean {
  const current = loadCustomCourse(cls)
  // The cards and the start side are the course; the check switches are not worth asking.
  const key = (c: CustomCourse) => JSON.stringify([c.startSide, c.cards])
  const differs = key(current) !== key(course)
  if (current.cards.length > 0 && differs && !confirmReplace()) return false
  saveCustomCourse(cls.id, course)
  return true
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
