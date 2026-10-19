import {
  CLASSES,
  getCard,
  getClass,
  type Card,
  type ClassId,
  type Equipment,
  type RoClass,
} from '@rota/content'

import { classFromSlug, classSlug } from './classes'

/**
 * Card catalogue (plan §7): which cards a class shows, how they are filtered, and the
 * sequencing rules spelled out for people. Pure functions — the page only renders them.
 */

export type CatalogueFilters = {
  query: string
  newOnly: boolean
  /** National exercise type (A/B/AB) or FCI points; empty = all. */
  group: string
  /** Show only cards needing none of the equipment the user does not have. */
  equipment: Equipment[] | null
}

export const NO_FILTERS: CatalogueFilters = {
  query: '',
  newOnly: false,
  group: '',
  equipment: null,
}

/** Exercises of the class plus its supplementary cards (national D0a–d). */
export function catalogueCards(cls: RoClass): Card[] {
  return [...cls.cardCodes, ...cls.course.supplementary]
    .map((code) => getCard(cls.ruleset, code))
    .filter((card): card is Card => card !== undefined)
}

/** Lower case without diacritics, so "predsednuti" finds "Předsednutí". */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** The groups a card can be filtered by: its type (national) or its points (FCI). */
export const cardGroup = (card: Card): string =>
  card.kind === 'supplementary'
    ? 'D0'
    : card.points
      ? String(card.points)
      : (card.exerciseType ?? '')

export function filterCards(cls: RoClass, cards: Card[], f: CatalogueFilters): Card[] {
  const q = fold(f.query.trim())
  return cards.filter((card) => {
    if (q && !fold(`${card.code} ${card.name} ${card.nameEn ?? ''}`).includes(q)) return false
    if (f.newOnly && !cls.newCardCodes.includes(card.code)) return false
    if (f.group && cardGroup(card) !== f.group) return false
    if (f.equipment && !(card.sequencing.equipment ?? []).every((e) => f.equipment?.includes(e))) {
      return false
    }
    return true
  })
}

/**
 * Filters in the URL (`?nove=1&skupina=A`): the catalogue keeps them there, so "Zpět" from
 * a card detail returns to the same list. Only the browser reads them — the page itself
 * does not depend on them, which suits the service worker ignoring query parameters.
 */
export function filtersToParams(f: CatalogueFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.query.trim()) params.set('hledat', f.query.trim())
  if (f.newOnly) params.set('nove', '1')
  if (f.group) params.set('skupina', f.group)
  if (f.equipment) params.set('bez-pomucek', '1')
  return params
}

export const filtersFromParams = (params: URLSearchParams): CatalogueFilters => ({
  query: params.get('hledat') ?? '',
  newOnly: params.get('nove') === '1',
  group: params.get('skupina') ?? '',
  equipment: params.get('bez-pomucek') === '1' ? [] : null,
})

/**
 * The catalogue a card detail was opened from, carried in the detail's query
 * (`?trida=ro1&nove=1`), so the detail can step through the same filtered list.
 */
export function catalogueQuery(classId: ClassId, f: CatalogueFilters): string {
  return new URLSearchParams([['trida', classSlug(classId)], ...filtersToParams(f)]).toString()
}

/** The filtered card list a detail belongs to, or `null` when it was not opened from one. */
export function catalogueFromQuery(params: URLSearchParams): Card[] | null {
  const classId = classFromSlug(params.get('trida') ?? '')
  const cls = classId && getClass(classId)
  if (!cls) return null
  return filterCards(cls, catalogueCards(cls), filtersFromParams(params))
}

/** Classes whose card list contains the card (national cards appear in several). */
export const classesWith = (card: Card): RoClass[] =>
  CLASSES.filter(
    (cls) =>
      cls.ruleset === card.ruleset &&
      (cls.cardCodes.includes(card.code) || cls.course.supplementary.includes(card.code)),
  )

/** A rule of plan §5 in words: an i18n key plus its interpolation values. */
export type Note = { key: string; values?: Record<string, string | number> }

export function sequencingNotes(card: Card): Note[] {
  const s = card.sequencing
  const list = (codes: string[]) => codes.join(', ')
  const notes: Note[] = []
  if (s.requiresSupplementary) notes.push({ key: 'notes.requiresSupplementary' })
  if (s.nextOneOf) notes.push({ key: 'notes.nextOneOf', values: { codes: list(s.nextOneOf) } })
  if (s.mayBeFollowedBy) {
    notes.push({ key: 'notes.mayBeFollowedBy', values: { codes: list(s.mayBeFollowedBy) } })
  }
  if (s.onlyAfterLeave) notes.push({ key: 'notes.onlyAfterLeave' })
  if (s.afterStatic) notes.push({ key: 'notes.afterStatic' })
  if (s.pace) notes.push({ key: `notes.pace.${s.pace}` })
  if (s.paceCompatible) notes.push({ key: 'notes.paceCompatible' })
  if (s.sideOnly) notes.push({ key: `notes.sideOnly.${s.sideOnly}` })
  if (s.sideChange) notes.push({ key: 'notes.sideChange' })
  if (s.endSide) notes.push({ key: `notes.endSide.${s.endSide}` })
  for (const cls of s.lastOnly ?? []) notes.push({ key: 'notes.lastOnly', values: { cls } })
  return notes
}
