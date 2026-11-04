import type { ClassId } from './classes'
import { CLASS_IDS } from './classes'
import { CZ_CARDS, CZ_CLASSES } from './cz'
import { CZ_2027_CARDS, CZ_2027_CLASSES } from './cz-2027'
import { FCI_CARDS, FCI_CLASSES } from './fci'
import type { Card, RoClass, RulesetId } from './schema'

/** Every class with content, in the order of `CLASS_IDS`. */
export const CLASSES: RoClass[] = [...CZ_CLASSES, ...CZ_2027_CLASSES, ...FCI_CLASSES].sort(
  (a, b) => CLASS_IDS.indexOf(a.id) - CLASS_IDS.indexOf(b.id),
)

/** Every card of each ruleset, start and finish and supplementary cards included. */
export const RULESET_CARDS: Record<RulesetId, Card[]> = {
  CZ: CZ_CARDS,
  'CZ-2027': CZ_2027_CARDS,
  FCI: FCI_CARDS,
}

const CARDS = Object.fromEntries(
  Object.entries(RULESET_CARDS).map(([id, cards]) => [id, new Map(cards.map((c) => [c.code, c]))]),
) as Record<RulesetId, Map<string, Card>>

/** The classes of one ruleset, in the order shown. */
export const classesOf = (ruleset: RulesetId) => CLASSES.filter((c) => c.ruleset === ruleset)

export function getClass(id: ClassId): RoClass | undefined {
  return CLASSES.find((c) => c.id === id)
}

export function getCard(ruleset: RulesetId, code: string): Card | undefined {
  return CARDS[ruleset].get(code)
}

/** Like `getCard`, for codes that come from the content itself and must exist. */
export function requireCard(ruleset: RulesetId, code: string): Card {
  const card = getCard(ruleset, code)
  if (!card) throw new Error(`Unknown ${ruleset} card ${code}`)
  return card
}
