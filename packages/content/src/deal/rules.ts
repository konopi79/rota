import { requireCard } from '../registry'
import type { Card, RoClass } from '../schema'
import type { DealOptions, Pace, Side } from './types'

/**
 * Helpers shared by the dealer and the validator. They only read card metadata — the
 * decisions (what may follow what) live in `deal.ts` and are re-checked independently in
 * `validate.ts`.
 */

export const cardOf = (cls: RoClass, code: string): Card => requireCard(cls.ruleset, code)

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

export const sideAfter = (card: Card, before: Side): Side =>
  card.sequencing.sideChange ? (before === 'left' ? 'right' : 'left') : before
