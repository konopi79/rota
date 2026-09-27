import type { ClassId } from '../classes'
import type { Equipment } from '../schema'

export type Side = 'left' | 'right'
export type Pace = 'normal' | 'slow' | 'fast'

export type DealOptions = {
  classId: ClassId
  /** The whole class, or only the cards this class adds (plan §3). */
  scope: 'all' | 'new'
  /** Number of exercise cards to deal; supplementary D0 cards don't count. */
  count: number
  /** Equipment at hand; cards needing anything else are left out. */
  equipment: Equipment[]
  startSide: Side
  seed: number
  /**
   * A competition course (R7) rather than a training deck: the class's point mix
   * (`course.minByPoints`) must be met. Size and equipment are the caller's to set.
   */
  competition?: boolean
}

export type DeckEntry = {
  code: string
  /** The D0 card dealt with an exercise that `requiresSupplementary`. */
  supplementary?: string
  /** The dog's side when the team arrives at this card. */
  side: Side
  /** The pace in effect when the team arrives at this card. */
  pace: Pace
}

export type Deck = {
  options: DealOptions
  entries: DeckEntry[]
}
