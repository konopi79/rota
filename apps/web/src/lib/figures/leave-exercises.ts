import type { Exercise, ExerciseStep } from './exercise'
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
const followUp2_214 = (supplementary: Supplementary): Exercise => {
  const around = supplementary === 'D0a' || supplementary === 'D0c'
  const sits = supplementary === 'D0a' || supplementary === 'D0b'
  return {
    code: '2-214',
    card: 'ahead',
    supplementary,
    steps: [
      ...toCard('ahead'),
      turnToDog,
      { recall: 'front', caption: 'recallFront' },
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
            { walk: BACK_THE_WAY_IT_CAME, caption: 'leaveTurn' },
          ] as const)
        : ([{ walk: BACK_THE_WAY_IT_CAME, caption: 'leaveTogether' }] as const)),
    ],
  }
}
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

/** The leave cards' parts, and the follow-ups' (each D0 card of 2-214 its own), by card. */
export const LEAVE_PARTS: Exercise[] = [L2_211, L2_212]
export const FOLLOW_UP_PARTS: Exercise[] = [F2_213, ...F2_214, F2_215, F2_216]

/**
 * A leave card and its follow-up played one after the other, for the card `code` (either of
 * the two): the leave card's part up to the dog left, on to the next card, and the follow-up's
 * part from where its handler stops. Each card stands where its own part has it.
 */
const pair = (code: string, leave: Exercise, followUp: Exercise): Exercise => {
  const leaving = leave.steps.findIndex((s) => 'dogStays' in s)
  const arriving = followUp.steps.findIndex((s) => !('walk' in s))
  return {
    code,
    pairedWith: code === leave.code ? followUp.code : leave.code,
    ...(followUp.supplementary && { supplementary: followUp.supplementary }),
    parts: [
      { exercise: leave, at: 0 },
      { exercise: followUp, at: GAP },
    ],
    steps: [
      ...leave.steps.slice(0, leaving + 1),
      { walk: GAP, caption: 'leaveDog' },
      ...followUp.steps.slice(arriving),
    ],
  }
}

/** The follow-ups each leave card is shown with, the first the one played at first. */
const SHOWN_AFTER: Record<string, Exercise[]> = {
  '2-211': [F2_213, F2_214[0]!, F2_215, F2_216],
  '2-212': [F2_213, F2_214[0]!, F2_215, F2_216],
}

/** Each follow-up is shown after 2-211, leaving the dog sitting. */
export const LEAVE_EXERCISES: Exercise[] = [
  ...LEAVE_PARTS.flatMap((leave) =>
    SHOWN_AFTER[leave.code]!.map((followUp) => pair(leave.code, leave, followUp)),
  ),
  ...FOLLOW_UP_PARTS.map((followUp) => pair(followUp.code, L2_211, followUp)),
  R2_230,
  R2_231,
]
