import { getClass, requireCard } from '../registry'
import type { Card, Field, RoClass } from '../schema'
import type { Deck, DealOptions, Pace, Side } from './types'

/**
 * Helpers shared by the dealer and the validator. They only read card metadata — the
 * decisions (what may follow what) live in `deal.ts` and are re-checked independently in
 * `validate.ts`.
 */

export const cardOf = (cls: RoClass, code: string): Card => requireCard(cls.ruleset, code)

/** The field a deck of `cls` is laid out on: the one asked for if the class has it, else its first. */
export function fieldOf(cls: RoClass, options: Pick<DealOptions, 'field'>): Field | undefined {
  const { fields } = cls.course
  const asked = options.field
  const same = (f: Field) => f.width === asked?.width && f.height === asked.height
  return fields?.find(same) ?? fields?.[0]
}

/** `20x30` — a field as the key of `course.dealWeights`. */
export const fieldKey = (field: Field) => `${field.width}x${field.height}`

export const hasEquipment = (card: Card, options: Pick<DealOptions, 'equipment'>) =>
  (card.sequencing.equipment ?? []).every((e) => options.equipment.includes(e))

/**
 * Whether the team ends the card standing still. Type A does; B doesn't; AB depends on
 * the supplementary card dealt with it (D0a/D0b static, D0c/D0d in motion).
 */
export function endsStatic(cls: RoClass, card: Card, supplementary?: string): boolean {
  if (card.exerciseType === 'AB') {
    return supplementary !== undefined && cardOf(cls, supplementary).exerciseType === 'A'
  }
  return card.exerciseType === 'A'
}

/** Pace after performing a card: a pace card sets it, a static exercise resets it. */
export function paceAfter(card: Card, before: Pace, static_: boolean): Pace {
  if (card.sequencing.pace) return card.sequencing.pace
  return static_ ? 'normal' : before
}

/**
 * Side after a card: an explicit end side wins (the D0 card dealt with it first — every D0
 * ends at the left leg), a side change flips it.
 */
export function sideAfter(cls: RoClass, card: Card, before: Side, supplementary?: string): Side {
  const endSide = supplementary && cardOf(cls, supplementary).sequencing.endSide
  if (endSide) return endSide
  if (card.sequencing.endSide) return card.sequencing.endSide
  if (card.sequencing.sideChange) return before === 'left' ? 'right' : 'left'
  return before
}

/** The dog's side on the way from the last card to the finish. */
export function finishSide(deck: Deck): Side {
  const last = deck.entries.at(-1)
  const cls = getClass(deck.options.classId)
  if (!last || !cls) return last?.side ?? deck.options.startSide
  return sideAfter(cls, cardOf(cls, last.code), last.side, last.supplementary)
}

/** Follow-ups a card allows next: required (`nextOneOf`) or optional (`mayBeFollowedBy`). */
export const followUpsOf = (card: Card | undefined): string[] =>
  card?.sequencing.nextOneOf ?? card?.sequencing.mayBeFollowedBy ?? []
