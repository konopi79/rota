import { CLASS_IDS, type Card, type ClassId } from '@rota/content'

/** URL slug of a class: `RO-Z` → `ro-z`, `FCI-ROB` → `fci-rob`. */
export const classSlug = (id: ClassId) => id.toLowerCase()

export const classFromSlug = (slug: string): ClassId | undefined =>
  CLASS_IDS.find((id) => classSlug(id) === slug)

/** Card detail URL: `/karta/cz/z-001`, `/karta/fci/101` — the image stem is the slug. */
export const cardHref = (card: Card) => `/karta/${card.ruleset.toLowerCase()}/${card.image}`
