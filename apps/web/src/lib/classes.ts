import { CLASS_IDS, getClass, RULESETS, type Card, type ClassId } from '@rota/content'

/** URL slug of a class: `RO-Z` → `ro-z`, `FCI-ROB` → `fci-rob`. */
export const classSlug = (id: ClassId) => id.toLowerCase()

export const classFromSlug = (slug: string): ClassId | undefined =>
  CLASS_IDS.find((id) => classSlug(id) === slug)

/** The editor of a hand-made course (plan §12). */
export const customCourseHref = (id: ClassId) => `/trida/${classSlug(id)}/vlastni`

/** Card detail URL: `/karta/cz/z-001`, `/karta/fci/101` — the image stem is the slug. */
export const cardHref = (card: Card) => `/karta/${RULESETS[card.ruleset].slug}/${card.image}`

/**
 * The classes offered on the home page: not yet those of the 2027 regulation, which is
 * prepared hidden until its switch (plan R21, R23) — reachable by address only.
 */
export const LISTED_CLASS_IDS = CLASS_IDS.filter((id) => getClass(id)?.ruleset !== 'CZ-2027')
