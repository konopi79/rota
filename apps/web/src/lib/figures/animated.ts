/**
 * Which cards have an exercise animation — kept light on purpose (no three.js, no scripts)
 * for the card detail and the catalogue. A test keeps the list in step with the scripts in
 * `roz-exercises.ts`.
 */
export const ANIMATED_CARDS: readonly string[] = [
  'Z-001',
  'Z-002',
  'Z-003',
  'Z-004',
  'Z-005',
  'Z-006',
  'Z-007',
  'Z-008',
  'Z-009',
  'Z-010',
  'Z-011',
  'Z-012',
  'Z-013',
  'Z-014',
  'Z-015',
  'Z-016',
  'Z-017',
  'Z-018',
  'Z-019',
  'Z-020',
  'Z-021',
  'Z-022',
  'Z-023',
  'Z-024',
  'Z-025',
  'Z-026',
  'Z-027',
  'Z-028',
  'Z-029',
  'Z-030',
  'Z-031',
  'Z-032',
]

/** The supplementary cards: shown finishing Z-014 Předsednutí, never on their own. */
const SUPPLEMENTARY = ['D0a', 'D0b', 'D0c', 'D0d']
export const SUPPLEMENTARY_SHOWN_WITH = 'Z-014'

/** What to play for a card: its own animation, or for a D0 card Z-014 ending with it. */
export type CardAnimation = { code: string; variant?: string }

export const animationFor = (code: string): CardAnimation | null => {
  if (ANIMATED_CARDS.includes(code)) return { code }
  if (SUPPLEMENTARY.includes(code)) return { code: SUPPLEMENTARY_SHOWN_WITH, variant: code }
  return null
}
