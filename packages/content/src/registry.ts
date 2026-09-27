import type { ClassId } from './classes'
import { CZ_CARDS, CZ_CLASSES } from './cz'
import type { Card, RoClass, RulesetId } from './schema'

/** Every class with content. FCI-ROB joins in R2. */
export const CLASSES: RoClass[] = [...CZ_CLASSES]

const CARDS: Record<RulesetId, Map<string, Card>> = {
  CZ: new Map(CZ_CARDS.map((c) => [c.code, c])),
  FCI: new Map(),
}

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
