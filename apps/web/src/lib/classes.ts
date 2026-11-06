import { CLASS_IDS, getClass, isNational, RULESETS, type Card, type ClassId } from '@rota/content'

import type { NationalRegulation } from './storage'

/** URL slug of a class: `RO-Z` → `ro-z`, `FCI-ROB` → `fci-rob`. */
export const classSlug = (id: ClassId) => id.toLowerCase()

export const classFromSlug = (slug: string): ClassId | undefined =>
  CLASS_IDS.find((id) => classSlug(id) === slug)

/** The editor of a hand-made course (plan §12). */
export const customCourseHref = (id: ClassId) => `/trida/${classSlug(id)}/vlastni`

/** Card detail URL: `/karta/cz/z-001`, `/karta/fci/101` — the image stem is the slug. */
export const cardHref = (card: Card) => `/karta/${RULESETS[card.ruleset].slug}/${card.image}`

/** FCI-ROB: on the home page whatever the national regulation (plan R23). */
export const internationalClassIds = (): ClassId[] =>
  CLASS_IDS.filter((id) => {
    const ruleset = getClass(id)?.ruleset
    return ruleset !== undefined && !isNational(ruleset)
  })

/**
 * The national classes offered on the home page: those of the chosen regulation (plan R23). The
 * other regulation's classes stay reachable by address.
 */
export const nationalClassIds = (regulation: NationalRegulation): ClassId[] =>
  CLASS_IDS.filter((id) => getClass(id)?.ruleset === regulation)
