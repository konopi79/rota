import { RULESET_CARDS, RULESETS, type Card } from '@rota/content'

export { OFFLINE_CARD } from './offline-card-path'

/** Card pages by the ruleset part of their address (plan R20). */
export const CARD_PAGES: Record<string, Card[]> = Object.fromEntries(
  Object.values(RULESETS).map((r) => [r.slug, RULESET_CARDS[r.id]]),
)

/** The card a card page's address names: `/karta/cz/z-014` → Z-014. */
export function cardFromPath(pathname: string): Card | undefined {
  const match = /^\/karta\/([^/]+)\/([^/]+?)(?:\.html)?\/?$/.exec(pathname)
  if (!match) return undefined
  const [, ruleset, slug] = match
  return CARD_PAGES[ruleset!]?.find((c) => c.image === decodeURIComponent(slug!))
}
