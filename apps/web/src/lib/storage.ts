import { CLASS_IDS, EQUIPMENT, type ClassId, type RoClass } from '@rota/content'
import { z } from 'zod/v4'

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
})
export type Setup = z.infer<typeof setupSchema>

const storedSchema = z.object({
  setups: z.partialRecord(z.enum(CLASS_IDS), setupSchema),
})
type Stored = z.infer<typeof storedSchema>

export const defaultSetup = (cls: RoClass): Setup => ({
  scope: 'all',
  count: cls.course.maxCards,
  equipment: [],
  startSide: 'left',
  showDescription: false,
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

export function saveSetup(classId: ClassId, setup: Setup): void {
  const stored = read()
  stored.setups[classId] = setup
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(stored))
  } catch {
    // Not being remembered is fine; failing to start a deck is not.
  }
}
