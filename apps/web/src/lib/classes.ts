import { CLASS_IDS, getClass, type ClassId } from '@rota/content'

/** URL slug of a class: `RO-Z` → `ro-z`, `FCI-ROB` → `fci-rob`. */
export const classSlug = (id: ClassId) => id.toLowerCase()

export const classFromSlug = (slug: string): ClassId | undefined =>
  CLASS_IDS.find((id) => classSlug(id) === slug)

/** Classes whose content exists (FCI-ROB arrives in R2). */
export const isAvailable = (id: ClassId) => getClass(id) !== undefined
