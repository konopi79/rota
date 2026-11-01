import type { Deck } from '@rota/content'

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
  '1-102',
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
  '1-114',
  '1-115',
  '1-116',
  '1-117',
  '1-118',
  '1-119',
  '1-120',
  '1-121',
  '1-122',
  '1-123',
  '1-124',
  '1-125',
  '2-201',
  '2-202',
  '2-203',
  '2-204',
  '2-205',
  '2-206',
  '2-207',
  '2-208',
  '2-209',
  '2-210',
  '2-211',
  '2-212',
  '2-213',
  '2-214',
  '2-215',
  '2-216',
  '2-217',
  '2-218',
  '2-219',
  '2-220',
  '2-221',
  '2-222',
  '2-223',
  '2-224',
  '2-225',
  '2-226',
  '2-227',
  '2-228',
  '2-229',
  '2-230',
  '2-231',
  '2-232',
  '3-301',
  '3-302',
  '3-303',
  '3-304',
  '3-305',
  '3-306',
  '3-307',
  '3-308',
  '3-309',
  '3-310',
  '3-311',
  '3-312',
  '3-313',
  '3-314',
  '3-315',
  '3-316',
  '3-317',
  '3-318',
  '3-319',
  '3-320',
  '3-321',
  '3-322',
  '3-323',
  '3-324',
  '3-325',
  '3-326',
  '3-327',
]

/**
 * The cards played with the dog at the handler's right leg as well (plan R15, R17): after a
 * start "R" the dog stays on the right until a card changes the side or a D0 card brings it
 * to the left leg, and RO2 / RO3 courses go right mid-course — every animated card but one.
 */
export const RIGHT_SIDE_CARDS: readonly string[] = ANIMATED_CARDS.filter(
  // Not on the right yet: called back from its cone (left of the team, as from the left) into
  // the right heel, the dog's paws slipped turning behind the handler. Never dealt on the
  // right in a course (no leave card there, not an RO-V card) — only a training deck.
  (code) => code !== '3-324',
)

/**
 * Whether a deck can be walked through in animation (plan R16): laid out on one field, every
 * card animated — on the side the course has the dog there.
 */
export const canWalkThrough = (deck: Deck): boolean =>
  deck.layout?.rounds.length === 1 &&
  deck.entries.every(
    (e) =>
      e.at &&
      ANIMATED_CARDS.includes(e.code) &&
      (e.side === 'left' || RIGHT_SIDE_CARDS.includes(e.code)),
  )

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
