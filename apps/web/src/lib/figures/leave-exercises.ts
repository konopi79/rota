import { getCard, type Card } from '@rota/content'

import { stationOf, type Exercise, type ExerciseStep } from './exercise'
import type { FootTarget } from './locomotion'
import { LEFT, RIGHT } from './ro123-exercises'
import { SUPPLEMENTARIES, stepsForward, turnSteps, type Supplementary } from './roz-exercises'

/**
 * The leave cards and the cards that follow them (plan R17), from the regulation (Zkušební
 * řád RO v ČR 2026, appendix 1) and the Psí škola ABS video for what it leaves open.
 *
 * A leave card leaves the dog where it is and the handler walks on to the next card, which
 * must be one of the follow-ups the leave card lists; that one calls the dog, or takes the
 * handler back to it. So each is played as a pair: the leave card's part, then the follow-up's
 * part at its own card — the dog staying put in between (`dogStays`). The parts on their own
 * (`LEAVE_PARTS`, `FOLLOW_UP_PARTS`) are what a course walked through plays at each card.
 */

/**
 * From where the handler stops at a leave card to where they stop at the next card, metres:
 * the next card 4 m on (Směrnice §1.1.2; the plan's `fromPrevious`).
 */
const GAP = 4

/** The team arrives and stops at the card, the dog sitting at heel ("základní pozice"). */
const stopSit = (card: 'side' | 'ahead' = 'side'): ExerciseStep[] => [
  { walk: 3.5, caption: card === 'ahead' ? 'approachTurn' : 'approach' },
  { stop: true, caption: card === 'ahead' ? 'stopAhead' : 'stop' },
  { dog: 'sit', caption: 'sit' },
  { wait: 1, caption: 'basePosition' },
]

/** The handler walks on, the dog left (`dogStays`): on to the next card. */
const walkOff: ExerciseStep = { walk: 3, caption: 'leaveDog' }

/**
 * 2-211 Stop – odložení psa v sedě (p. 42): "Tým se zastaví v místě pro provedení cviku a
 * zaujímá základní pozici. Psovod odkládá psa do pozice sedni a odchází směrem k další kartě."
 */
export const L2_211: Exercise = {
  code: '2-211',
  steps: [...stopSit(), { dogStays: true, caption: 'staySit' }, walkOff],
}

/**
 * 2-212 Zastavit – lehni – odchod (p. 43): "Psovod se zastaví v místě pro provedení cviku a
 * rovnou velí psa do pozice lehni. Pes se nesmí posadit ani zůstat stát. Psovod odchází k
 * dalšímu cviku, zatímco pes setrvává odložen."
 */
export const L2_212: Exercise = {
  code: '2-212',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'down', caption: 'downStraight' },
    { wait: 0.6, caption: 'downHold' },
    { dogStays: true, caption: 'stayDown' },
    walkOff,
  ],
}

/** The handler comes to the follow-up's card, the dog left behind them. */
const toCard = (card: 'side' | 'ahead' = 'side'): ExerciseStep[] => [
  { walk: 3.5, caption: 'leaveDog' },
  { stop: true, caption: card === 'ahead' ? 'stopAheadAlone' : 'stopAlone' },
]

/**
 * Turned about, the team goes on back the way it came — not as far as the leave card: on a
 * course the next card is laid out beside the way in (the plan's hairpin), metres.
 */
const BACK_THE_WAY_IT_CAME = 2

/** "Před kartou se psovod otočí čelem ke psovi" — about, on the spot. */
const turnToDog: ExerciseStep = { turn: -180, radius: 0, caption: 'turnToDog' }

/**
 * 2-213 Otočení – zpět ke psu (p. 43): "V místě pro vykonání cviku se psovod otáčí čelem ke
 * psu a následně se k němu vrací a postaví se vedle psa tak, jak tomu bylo u předchozího
 * cviku." Back along the way to where they left it — in the video past it on its right side —
 * and turned about there, the dog at heel; on from there together.
 */
export const F2_213: Exercise = {
  code: '2-213',
  steps: [
    ...toCard(),
    turnToDog,
    { backToDog: true, caption: 'backToDog' },
    { wait: 1, caption: 'basePosition' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * 2-214 Otočení – přivolání do předsednutí (p. 43), with a D0 card: "Před kartou se psovod
 * otočí čelem ke psovi. Poté jej přivolá do předsednutí. Během předsednutí a při provádění
 * cviku z doplňkové karty nesmí psovod pohybovat nohama." Then the D0 card (p. 17) as in
 * Z-014; the team goes on the way the handler faces — back the way it came.
 */
/**
 * The dog called into the front, sitting there, then the D0 card (p. 17) as in Z-014; turned
 * about, the team goes on the way the handler faces — back the way it came.
 */
const intoFrontThenD0 = (
  supplementary: Supplementary,
  turned: boolean,
  recall: ExerciseStep[],
): ExerciseStep[] => {
  const around = supplementary === 'D0a' || supplementary === 'D0c'
  const sits = supplementary === 'D0a' || supplementary === 'D0b'
  const on = turned ? BACK_THE_WAY_IT_CAME : 3
  return [
    ...recall,
    { dog: 'sit', caption: 'frontSit' },
    { wait: 1, caption: 'frontHold' },
    {
      dogPath: around ? 'aroundHandler' : 'toHeel',
      caption: around ? 'finishAround' : 'finishDirect',
    },
    ...(sits
      ? ([
          { dog: 'sit', caption: 'finishSit' },
          { wait: 1, caption: 'basePosition' },
          { walk: on, caption: turned ? 'leaveTurn' : 'leave' },
        ] as const)
      : ([{ walk: on, caption: 'leaveTogether' }] as const)),
  ]
}

const followUp2_214 = (supplementary: Supplementary): Exercise => ({
  code: '2-214',
  card: 'ahead',
  supplementary,
  steps: [
    ...toCard('ahead'),
    turnToDog,
    ...intoFrontThenD0(supplementary, true, [{ recall: 'front', caption: 'recallFront' }]),
  ],
})
export const F2_214 = SUPPLEMENTARIES.map(followUp2_214)

/**
 * 2-215 Bez otočení – přivolání k noze (p. 44): "Psovod se zastaví v místě pro vykonání
 * cviku a přivolává psa do pozice k levé noze. … nohy musí zůstat na místě ve směru
 * předchozího pohybu. Jakmile pes dosáhne pozice u nohy, odchází tým na další stanoviště,
 * aniž by si pes předem sedl."
 */
export const F2_215: Exercise = {
  code: '2-215',
  steps: [
    ...toCard(),
    { recall: 'heel', caption: 'recallHeelBehind' },
    { walk: 3, caption: 'leaveTogether' },
  ],
}

/**
 * 2-216 Otočení – přivolání k noze (p. 44): "Před kartou se psovod otočí čelem ke psovi.
 * Poté jej přivolá k levé noze (způsob přiřazení není daný). Při dosažení pozice u nohy,
 * rozchází se tým k dalšímu cviku (aniž by pes sedl)." Into the front and straight on to the
 * left leg (as D0b); the team goes on back the way it came.
 */
export const F2_216: Exercise = {
  code: '2-216',
  card: 'ahead',
  steps: [
    ...toCard('ahead'),
    turnToDog,
    { recall: 'heel', caption: 'recallHeel' },
    { walk: BACK_THE_WAY_IT_CAME, caption: 'leaveTogether' },
  ],
}

/**
 * 2-230 / 2-231 Stop – obrat vpravo / vlevo – 1 krok – přivolání – stop (p. 49): "Tým se
 * zastaví před kartou a zaujme základní pozici. Pes zůstává v odložení. Psovod se otáčí vpravo
 * (vlevo) o 90° a udělá 1 krok. Poté je pes přivolán do základní pozice." The turn in the three
 * steps of Z-030 / Z-031; turning left, towards the dog, the handler turns and steps in front
 * of its head (the video), not into it.
 */
const AHEAD_OF_THE_DOG = 0.2
const stayTurnStepRecall = (code: string, sign: 1 | -1): Exercise => {
  const turn: FootTarget[] = turnSteps(sign).map((t) =>
    sign === LEFT ? { ...t, z: t.z + AHEAD_OF_THE_DOG } : t,
  )
  return {
    code,
    card: 'ahead',
    steps: [
      ...stopSit('ahead'),
      { dogStays: true, caption: 'staySit' },
      { footwork: turn, caption: sign === RIGHT ? 'turnRight90Alone' : 'turnLeft90Alone' },
      { footwork: stepsForward(1), caption: 'oneStepAlone' },
      { recall: 'heel', caption: 'recallBase' },
      { dog: 'sit', caption: 'finishSit' },
      { wait: 1, caption: 'basePosition' },
      { walk: 3, caption: 'leaveTurn' },
    ],
  }
}
export const R2_230 = stayTurnStepRecall('2-230', RIGHT)
export const R2_231 = stayTurnStepRecall('2-231', LEFT)

/**
 * 3-301 Stop – odložení vsedě – psovod šikmo (p. 51): "Tým zaujímá základní pozici. Na pokyn
 * psovoda pes zůstává na místě a psovod odchází k následující kartě. … Další cviky jsou
 * posunuty o 180 cm vpravo nebo vlevo od konce místa cviku." The handler goes off at a slant
 * (`ASIDE`) — to the right, away from the dog's side.
 */
export const L3_301: Exercise = {
  code: '3-301',
  steps: [...stopSit(), { dogStays: true, caption: 'staySit' }, walkOff],
}
const ASIDE = -1.8

/**
 * 3-307 Zastavit – odložení ve stoje – odchod (p. 53): "Tým se zastaví v místě pro vykonání
 * cviku a pes zůstane stát u nohy psovoda, aniž by si předtím sedl. Psovod velí psovi zůstat
 * ve stoje a odchází k další kartě."
 */
export const L3_307: Exercise = {
  code: '3-307',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stopStand' },
    { wait: 1, caption: 'standHold' },
    { dogStays: true, caption: 'stayStand' },
    walkOff,
  ],
}

/** Leaving on the move, the handler is that far on when the next walk begins, metres. */
const DROP_WALK = 0.2
const DROP_CAPTION = { sit: 'dropSit', down: 'dropDown', stand: 'dropStand' } as const

/**
 * 3-310 / 3-311 / 3-312 Odložení za pochodu do sedu / lehu / stoje (p. 54–55): "V místě pro
 * vykonání cviku psovod, aniž by se zastavil, odkládá psa do sedu. … přitom se musí stále
 * pohybovat vpřed. Pes musí zaujmout danou pozici zhruba do vzdálenosti jedné délky svého
 * těla. Psovod pokračuje k další kartě."
 */
const leaveOnTheMove = (code: string, posture: 'sit' | 'down' | 'stand'): Exercise => ({
  code,
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: DROP_WALK, dropsDog: posture, caption: DROP_CAPTION[posture] },
    walkOff,
  ],
})
export const L3_310 = leaveOnTheMove('3-310', 'sit')
export const L3_311 = leaveOnTheMove('3-311', 'down')
export const L3_312 = leaveOnTheMove('3-312', 'stand')

/**
 * Where a follow-up with a down on the way marks two thirds of the dog's way in ("vzdálenost
 * ⅔ je označena"), in its station's frame: the dog was left `gap` metres back, at heel.
 */
const twoThirds = (gap: number) => [{ x: 0.42 / 3, z: -(gap + 0.2) / 3 }]

/**
 * 3-302 Otočení – přivolání z úhlu do předsednutí (p. 51), with a D0 card: "Psovod se otáčí
 * před kartou a přivolá psa do předsednutí. Tato karta … je posunutá přibližně 180 cm stranou
 * … tak, že pes musí přijít do předsednutí z úhlu."
 */
export const F3_302 = SUPPLEMENTARIES.map((supplementary): Exercise => ({
  code: '3-302',
  card: 'ahead',
  supplementary,
  steps: [
    ...toCard('ahead'),
    turnToDog,
    ...intoFrontThenD0(supplementary, true, [{ recall: 'front', caption: 'recallFrontAngle' }]),
  ],
}))

/**
 * 3-308 Otočení – přivolání s položením – přivolání do předsednutí (p. 53), with a D0 card:
 * "Psovod se otáčí před kartou a přivolá psa. Když je pes v pohybu velí psovod psa do pozice
 * lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti ke psovodovi (vzdálenost ⅔ je
 * označena). Jakmile pes zaujme polohu, je opět psovodem přivolán do předsednutí."
 */
export const F3_308 = SUPPLEMENTARIES.map((supplementary): Exercise => ({
  code: '3-308',
  card: 'ahead',
  supplementary,
  marks: twoThirds(6),
  steps: [
    ...toCard('ahead'),
    turnToDog,
    ...intoFrontThenD0(supplementary, true, [
      { recall: 'halfway', caption: 'recallDown' },
      { dog: 'down', caption: 'downOnTheWay' },
      { wait: 1, caption: 'downHoldAway' },
      { recall: 'front', caption: 'recallFrontAgain' },
    ]),
  ],
}))

/**
 * 3-309 Otočení – polohy lehni, sedni na dálku – přivolání do předsednutí (p. 54), with a D0
 * card: "Psovod se otáčí před kartou a velí psa do pozice lehni. Jakmile pes zaujme polohu,
 * dostává další povel k zaujetí pozice sedni. … Jakmile pes sedí, psovod jej přivolává do
 * předsednutí."
 */
export const F3_309 = SUPPLEMENTARIES.map((supplementary): Exercise => ({
  code: '3-309',
  card: 'ahead',
  supplementary,
  steps: [
    ...toCard('ahead'),
    turnToDog,
    ...intoFrontThenD0(supplementary, true, [
      { dog: 'down', caption: 'downFromAfar' },
      { wait: 1, caption: 'downHoldAway' },
      { dog: 'sit', caption: 'sitFromAfar' },
      { wait: 1, caption: 'sitHoldAway' },
      { recall: 'front', caption: 'recallFront' },
    ]),
  ],
}))

/**
 * 3-319 Bez otočení do předsednutí (p. 58), with a D0 card: "V místě pro vykonání cviku se
 * psovod zastaví (neotáčí se) a přivolá psa do předsednutí. … Pes musí přijít do předsednutí
 * z té strany, na které se nacházel u předchozího odkládacího cviku." Up the handler's left
 * side and round into the front; the team goes on as it came. (The handler may take up to four
 * steps back — may, so here they stand.)
 */
export const F3_319 = SUPPLEMENTARIES.map((supplementary): Exercise => ({
  code: '3-319',
  supplementary,
  steps: [
    ...toCard(),
    ...intoFrontThenD0(supplementary, false, [{ recall: 'front', caption: 'recallFrontBehind' }]),
  ],
}))

/**
 * 3-320 Otočení – přivolání s položením – návrat ke psu (p. 59): "V místě pro vykonání cviku se
 * psovod otočí a následně přivolá psa. Jakmile je pes v pohybu velí psovod psa do pozice
 * lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti … Jakmile pes zaujme polohu v
 * leže, psovod se vrací ke psu a postaví se na stejnou stranu u nohy jako u předchozího
 * odkládacího cviku."
 */
export const F3_320: Exercise = {
  code: '3-320',
  marks: twoThirds(6),
  steps: [
    ...toCard(),
    turnToDog,
    { recall: 'halfway', caption: 'recallDown' },
    { dog: 'down', caption: 'downOnTheWay' },
    { wait: 1, caption: 'downHoldAway' },
    { backToDog: true, caption: 'backToDog' },
    { wait: 1, caption: 'downHold' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * 3-321 Otočení – přivolání s položením – přivolání k noze (p. 59): "… Jakmile pes zaujme
 * polohu, je opět psovodem přivolán k noze. Pokud je pes v pozici u nohy, tým pokračuje (aniž
 * by si pes sedl) k další kartě. Během přivolání nesmí psovod hýbat nohama."
 */
export const F3_321: Exercise = {
  code: '3-321',
  card: 'ahead',
  marks: twoThirds(6),
  steps: [
    ...toCard('ahead'),
    turnToDog,
    { recall: 'halfway', caption: 'recallDown' },
    { dog: 'down', caption: 'downOnTheWay' },
    { wait: 1, caption: 'downHoldAway' },
    { recall: 'heel', caption: 'recallHeelAgain' },
    { walk: BACK_THE_WAY_IT_CAME, caption: 'leaveTogether' },
  ],
}

/**
 * 3-322 Otočení – polohy lehni, sedni na dálku – návrat ke psu (p. 60): "V místě pro vykonání
 * cviku se psovod otočí a následně velí psa (na dálku) do polohy lehni. Jakmile pes zaujme
 * polohu vleže, dostává další povel (na dálku) do polohy sedni. … Psovod při velení nesmí
 * hýbat nohama. Jakmile pes zaujme polohu v sedě, psovod se vrací ke psu …"
 */
export const F3_322: Exercise = {
  code: '3-322',
  steps: [
    ...toCard(),
    turnToDog,
    { dog: 'down', caption: 'downFromAfar' },
    { wait: 1, caption: 'downHoldAway' },
    { dog: 'sit', caption: 'sitFromAfar' },
    { wait: 1, caption: 'sitHoldAway' },
    { backToDog: true, caption: 'backToDog' },
    { wait: 1, caption: 'basePosition' },
    { walk: 3, caption: 'leave' },
  ],
}

/** The leave cards' parts, and the follow-ups' (each D0 card its own), by card. */
export const LEAVE_PARTS: Exercise[] = [L2_211, L2_212, L3_301, L3_307, L3_310, L3_311, L3_312]
export const FOLLOW_UP_PARTS: Exercise[] = [
  F2_213,
  ...F2_214,
  F2_215,
  F2_216,
  ...F3_302,
  ...F3_308,
  ...F3_309,
  ...F3_319,
  F3_320,
  F3_321,
  F3_322,
]

/** How far on the follow-up's card stands from the leave card's, as the plan has it, metres. */
const gapTo = (code: string) =>
  (getCard('CZ', code) as Card | undefined)?.geometry?.fromPrevious ?? GAP

/**
 * A leave card and its follow-up played one after the other, for the card `code` (either of
 * the two): the leave card's part up to the dog left, on to the next card — at a slant after
 * 3-301 — and the follow-up's part from where its handler stops. Each card stands where its own
 * part has it.
 */
const pair = (code: string, leave: Exercise, followUp: Exercise): Exercise => {
  const leaving = leave.steps.findIndex((s) => 'dogStays' in s || ('walk' in s && s.dropsDog))
  const left = leave.steps[leaving]!
  // Left on the move, the handler is already on the way.
  const onTheWay = 'walk' in left ? left.walk : 0
  const arriving = followUp.steps.findIndex((s) => !('walk' in s))
  const gap = gapTo(followUp.code)
  const aside = leave.code === '3-301' ? ASIDE : 0
  return {
    code,
    pairedWith: code === leave.code ? followUp.code : leave.code,
    ...(followUp.supplementary && { supplementary: followUp.supplementary }),
    parts: [
      { exercise: leave, at: 0 },
      { exercise: followUp, at: gap, ...(aside && { aside }) },
    ],
    steps: [
      ...leave.steps.slice(0, leaving + 1),
      aside
        ? {
            // At a slant all the way, square to the next card as it gets there (the author).
            walkTo: { x: aside, z: stationOf(leave) + gap, heading: 0 },
            slant: true,
            caption: 'leaveDogAside',
          }
        : { walk: gap - onTheWay, caption: 'leaveDog' },
      ...followUp.steps.slice(arriving),
    ],
  }
}

const first = (parts: Exercise[]) => parts[0]!

/** The follow-ups each leave card is shown with, the first the one played at first. */
const SHOWN_AFTER: Record<string, Exercise[]> = {
  '2-211': [F2_213, first(F2_214), F2_215, F2_216],
  '2-212': [F2_213, first(F2_214), F2_215, F2_216],
  // (Not 3-319: arriving at a slant, its dog would come round in front into the card.)
  '3-301': [first(F3_302), F2_215, F2_216],
  '3-307': [F3_320, F3_321, F3_322, first(F3_308), first(F3_309), first(F3_319)],
  '3-310': [F3_320, F3_321, F3_322, first(F3_308), first(F3_309), first(F3_319)],
  '3-311': [F3_320, F3_321, first(F3_308), first(F3_319)],
  '3-312': [F3_320, F3_321, F3_322, first(F3_308), first(F3_309), first(F3_319)],
}

/** …and the leave card each follow-up is shown after. */
const SHOWN_BEFORE: Record<string, Exercise> = {
  '2-213': L2_211,
  '2-214': L2_211,
  '2-215': L2_211,
  '2-216': L2_211,
  '3-302': L3_301,
  '3-308': L3_307,
  '3-309': L3_307,
  '3-319': L3_307,
  '3-320': L3_307,
  '3-321': L3_307,
  '3-322': L3_307,
}

export const LEAVE_EXERCISES: Exercise[] = [
  ...LEAVE_PARTS.flatMap((leave) =>
    SHOWN_AFTER[leave.code]!.map((followUp) => pair(leave.code, leave, followUp)),
  ),
  ...FOLLOW_UP_PARTS.map((followUp) => pair(followUp.code, SHOWN_BEFORE[followUp.code]!, followUp)),
  R2_230,
  R2_231,
]

/** Which follow-up a leave card is shown with (each must be one its card allows next). */
export const PAIRS_SHOWN = SHOWN_AFTER
