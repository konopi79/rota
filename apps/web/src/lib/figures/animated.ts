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
  '1-101',
  '1-103',
  '1-104',
  '1-105',
  '1-106',
  '1-107',
  '1-108',
  '1-109',
  '1-110',
  '1-111',
  '1-112',
  '1-113',
  '1-116',
  '1-117',
  '1-118',
  '1-119',
  '1-120',
  '1-121',
  '1-122',
  '2-201',
  '2-202',
  '2-203',
  '2-204',
  '2-205',
  '2-206',
  '2-209',
  '2-210',
  '2-220',
  '2-221',
  '2-223',
  '2-224',
  '2-225',
  '2-226',
  '2-227',
  '3-303',
  '3-304',
  '3-305',
  '3-316',
  '3-317',
  '3-318',
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
