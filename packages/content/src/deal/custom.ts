import { getCard, getClass } from '../registry'
import { EQUIPMENT } from '../schema'
import type { ClassId } from '../classes'
import { endsStatic, paceAfter, sideAfter } from './rules'
import type { Deck, DeckEntry, Pace, Side } from './types'

/** One card of a course put together by hand: the exercise and its D0 card. */
export type CustomCard = Pick<DeckEntry, 'code' | 'supplementary'>

/**
 * A course put together by hand (plan §12) as a deck: the cards in the given order, with
 * the dog's side and the pace worked out the same way the dealer tracks them. Nothing is
 * left out or reordered — whether the order is performable is `customDeckIssues`' to say.
 * Not laid out on a field, not even in FCI.
 */
export function customDeck(classId: ClassId, startSide: Side, cards: CustomCard[]): Deck {
  const cls = getClass(classId)
  if (!cls) throw new Error(`No content for class ${classId}`)
  let side = startSide
  let pace: Pace = 'normal'
  const entries = cards.map(({ code, supplementary }): DeckEntry => {
    const entry: DeckEntry = supplementary
      ? { code, supplementary, side, pace }
      : { code, side, pace }
    const card = getCard(cls.ruleset, code)
    // Unknown codes are reported by `customDeckIssues`; they change nothing here.
    const d0 = supplementary && getCard(cls.ruleset, supplementary) ? supplementary : undefined
    if (card) {
      pace = paceAfter(card, pace, endsStatic(cls, card, d0))
      side = sideAfter(cls, card, side, d0)
    }
    return entry
  })
  return {
    // The options a dealt deck would have: everything at hand, nothing random.
    options: {
      classId,
      scope: 'all',
      count: entries.length,
      equipment: [...EQUIPMENT],
      startSide,
      seed: 0,
    },
    entries,
  }
}
