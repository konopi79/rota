import { CLASSES, getCard, type Card, type Equipment, type RoClass } from '@rota/content'

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
