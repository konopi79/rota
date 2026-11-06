import {
  CZ_2027_REVISED,
  getClass,
  isNational,
  type Card,
  type Deck,
  type RulesetId,
} from '@rota/content'

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
 * Cards new in 2027 played with the dog at the right leg as well: their 90° turns are the
 * dog's side's own (an L away from it, a T towards it).
 */
export const RIGHT_SIDE_NEW_IN_2027: readonly string[] = [
  ...['1-127', '1-128', '1-129', '1-130'],
  ...['1-126', '2-233', '3-302', '3-328', '3-329'],
]

/** The cards of an animation set played with the dog at the right leg as well. */
export const rightSideCards = (set: AnimationSet): readonly string[] =>
  set === 'FCI'
    ? FCI_RIGHT_SIDE_CARDS
    : set === 'CZ-2027'
      ? [...RIGHT_SIDE_CARDS, ...RIGHT_SIDE_NEW_IN_2027]
      : RIGHT_SIDE_CARDS

/** The supplementary cards: shown finishing Z-014 Předsednutí, never on their own. */
const SUPPLEMENTARY = ['D0a', 'D0b', 'D0c', 'D0d']
export const SUPPLEMENTARY_SHOWN_WITH = 'Z-014'

/**
 * The FCI cards with an animation (plan R19): every one (`fci-exercises.ts`, a test keeps the
 * list in step).
 */
export const FCI_ANIMATED_CARDS: readonly string[] = [
  '101',
  '102',
  '103',
  '104',
  '105',
  '106',
  '107',
  '108',
  '109',
  '110',
  '111',
  '112',
  '113',
  '114',
  '115',
  '116',
  '117',
  '118',
  '119',
  '120',
  '121',
  '122',
  '201',
  '202',
  '203',
  '204',
  '205',
  '206',
  '207',
  '208',
  '209',
  '210',
  '211',
  '212',
  '213',
  '214',
  '215',
  '216',
  '217',
  '218',
  '219',
  '220',
  '221',
  '222',
  '301',
  '302',
  '303',
  '304',
  '305',
  '306',
  '307',
  '308',
  '309',
  '310',
  '311',
  '312',
  '313',
  '314',
  '315',
  '316',
  '317',
  '318',
  '319',
  '320',
  '321',
  '322',
  '323',
  '401',
  '402',
  '403',
  '404',
  '405',
  '406',
  '407',
  '408',
  '409',
  '410',
  '411',
  '412',
  '413',
  '414',
  '415',
  '416',
  '417',
  '418',
  '419',
  '420',
  '421',
  '422',
]

/**
 * The FCI cards played with the dog at the right leg as well: "Všechny cviky (kromě 417 a 418)
 * lze provádět se psem na levé nebo pravé straně psovoda" (§3.5) — 417 is done from the left leg
 * only, 418 from the right one only.
 */
export const FCI_RIGHT_SIDE_CARDS: readonly string[] = FCI_ANIMATED_CARDS.filter(
  (code) => code !== '417' && code !== '418',
)

/**
 * The animations there are: the national cards' of 2026, of 2027 (its own where it does a card
 * differently, the 2026 ones otherwise — `exercisesOf`, plan R22b) and FCI's.
 */
export type AnimationSet = 'CZ' | 'CZ-2027' | 'FCI'

export const animationSetOf = (ruleset: RulesetId): AnimationSet =>
  ruleset === 'CZ-2027' ? 'CZ-2027' : isNational(ruleset) ? 'CZ' : 'FCI'

/**
 * The cards played with D0e (2027) in animation — none yet (`D0E_EXERCISES` is not played: the
 * way round the dog in front still goes too near its head); then those into the front whose
 * finish is their own, not the recall cards of a leave pair, nor 3-323.
 */
export const D0E_ANIMATED: readonly string[] = []

/**
 * The cards the 2027 regulation does differently that have their 2027 animation
 * (`EXERCISES_2027`; a test keeps the two in step).
 */
export const ANIMATED_IN_2027: readonly string[] = [
  ...['Z-028', 'Z-029'],
  ...['1-103', '1-104', '1-105', '1-106', '1-119', '1-120'],
  ...['2-201', '2-202', '2-223', '2-224', '2-230', '2-231'],
  // New in 2027, or another exercise under its code.
  ...['1-127', '1-128', '1-129', '1-130'],
  ...['Z-033', 'Z-034', 'Z-035', 'Z-036', '1-116', '1-126', '2-233', '2-234'],
  ...['3-302', '3-328', '3-329', '3-330', '3-331', '3-332'],
]

/** What to play for a card: its own animation, or for a D0 card Z-014 ending with it. */
export type CardAnimation = { code: string; variant?: string; ruleset: AnimationSet }

export const animationFor = (code: string, ruleset: AnimationSet = 'CZ'): CardAnimation | null => {
  if (ruleset === 'CZ-2027') {
    // D0e is shown finishing Z-014, as D0a–d are (once it is animated).
    if (code === 'D0e') {
      return D0E_ANIMATED.includes(SUPPLEMENTARY_SHOWN_WITH)
        ? { code: SUPPLEMENTARY_SHOWN_WITH, variant: code, ruleset }
        : null
    }
    if (ANIMATED_IN_2027.includes(code)) return { code, ruleset }
    if (notYetAnimated(ruleset, code)) return null
    const as2026 = animationFor(code, 'CZ')
    return as2026 && { ...as2026, ruleset }
  }
  if (ruleset === 'FCI') return FCI_ANIMATED_CARDS.includes(code) ? { code, ruleset } : null
  if (ANIMATED_CARDS.includes(code)) return { code, ruleset }
  if (SUPPLEMENTARY.includes(code)) {
    return { code: SUPPLEMENTARY_SHOWN_WITH, variant: code, ruleset }
  }
  return null
}

/**
 * Revised 2027 cards whose 2026 animation still shows the 2027 exercise (R22b): their text
 * changed but not what the team does — the animations already take no step back into the front
 * ("jen jeden krok vzad", 2027), turn 180° on the spot ("na ploše listu A4"), keep the 5 m to the
 * jump (2027: at least 2 m) and 3-324's cone within the 3–5 m; the rest are wording, D0a–e,
 * follow-up lists, the bowls' contents, a marked line beside the space.
 */
const SAME_IN_2027: ReadonlySet<string> = new Set([
  ...['Z-014', 'Z-016', 'Z-022', 'Z-025', 'Z-032'],
  ...['1-101', '1-108', '1-111', '1-112', '1-113', '1-114', '1-115', '1-117'],
  ...['1-121', '1-122', '1-123', '1-125'],
  ...['2-203', '2-204', '2-205', '2-206', '2-208', '2-211', '2-212', '2-214', '2-217'],
  ...['2-218', '2-220', '2-221', '2-222', '2-225', '2-226'],
  ...['3-301', '3-307', '3-308', '3-309', '3-310', '3-311', '3-312', '3-314', '3-316'],
  ...['3-317', '3-319', '3-320', '3-321', '3-323', '3-324'],
])

/**
 * A 2027 card that is not the 2026 exercise as it was (new, rewritten, changed footwork) and
 * has no 2027 animation yet: the 2026 one would show the old exercise (the author, 2026-11-04).
 */
function notYetAnimated(ruleset: RulesetId, code: string): boolean {
  return (
    ruleset === 'CZ-2027' &&
    !(code === 'D0e' && D0E_ANIMATED.length > 0) &&
    CZ_2027_REVISED.has(code) &&
    !SAME_IN_2027.has(code) &&
    !ANIMATED_IN_2027.includes(code)
  )
}

/** What to play for a card of any ruleset — `animationFor` with the card's own set. */
export const animationOfCard = (card: Pick<Card, 'code' | 'ruleset'>): CardAnimation | null =>
  animationFor(card.code, animationSetOf(card.ruleset))

/**
 * Whether a deck can be walked through in animation (plan R16, R19): laid out on one field,
 * every card animated — on the side the course has the dog there.
 */
export const canWalkThrough = (deck: Deck): boolean => {
  const ruleset = getClass(deck.options.classId)?.ruleset
  if (
    ruleset &&
    deck.entries.some(
      (e) =>
        notYetAnimated(ruleset, e.code) ||
        (!!e.supplementary && notYetAnimated(ruleset, e.supplementary)) ||
        (e.supplementary === 'D0e' && !D0E_ANIMATED.includes(e.code)),
    )
  ) {
    return false
  }
  const fci = deck.options.classId === 'FCI-ROB'
  // (2027's: the 2026 cards it plays as they were, and its own.)
  const animated = fci
    ? FCI_ANIMATED_CARDS
    : ruleset === 'CZ-2027'
      ? [...ANIMATED_CARDS, ...ANIMATED_IN_2027]
      : ANIMATED_CARDS
  const right = ruleset ? rightSideCards(animationSetOf(ruleset)) : RIGHT_SIDE_CARDS
  return (
    deck.layout?.rounds.length === 1 &&
    deck.entries.every(
      (e) =>
        e.at &&
        animated.includes(e.code) &&
        // (FCI 418 is done with the dog at the right leg only, 417 at the left.)
        (fci && e.code === '418'
          ? e.side === 'right'
          : e.side === 'left' || right.includes(e.code)),
    )
  )
}
