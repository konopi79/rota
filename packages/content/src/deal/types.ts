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
  /** Where the card stands on the field — only in classes laid out on one (FCI). */
  at?: Placement
}

/** A point on the field in metres; x to the right, y down (as drawn). */
export type Point = { x: number; y: number }
/** Heading in degrees clockwise from "up" on the field plan. */
export type Pose = Point & { heading: number }
/** A card on the field: where it stands, the heading the team arrives in, the turn chosen. */
export type Placement = Pose & { turn: number }

/**
 * A deck laid out on a field; the cards carry their own `at`. A deck longer than a course
 * is split into rounds, each one starting again on the edge of an empty field.
 */
export type Layout = {
  width: number
  height: number
  rounds: Round[]
}

export type Round = {
  /** Index of the round's first card in `entries`. */
  first: number
  start: Pose
  finish: Pose
}

export type Deck = {
  options: DealOptions
  entries: DeckEntry[]
  layout?: Layout
}
