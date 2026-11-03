import type { Exercise, ExerciseStep } from './exercise'
import { F2_214, F2_216, pair } from './leave-exercises'
import { swerve } from './courses'
import { PLACES } from './team'

/**
 * FCI's leave cards and recall cards (plan R19), from the FCI rules (Zkušební řád & Směrnice pro
 * Mezinárodní soutěže FCI Rally Obedience, Czech translation from 1 Feb 2025) and the FCI video
 * "Demo of Signs".
 *
 * 319, 408 and 409 leave the dog and the handler walks on, "buď ke kuželu pro přivolání (C), kde
 * přivolává psa (strana vedení se nemění), nebo ke kartě pro přivolání" — 321–323, 421, 422.
 * With the cone the recall is part of the leave card: the handler calls the dog beside it, walking
 * on, and "může při chůzi zpomalit, aby pes dosáhl úrovně psovoda" (§4.8) — the dog gallops after
 * them into heel. With a recall card it is played as a national leave card and its follow-up are
 * (`pair`), the recall card 4 m on ("3 - 5 m od předchozí karty").
 */

/** The team arrives and stops, the dog sitting at heel ("pes si sedá u nohy psovoda"). */
const stopSit: ExerciseStep[] = [
  { walk: 3.5, caption: 'approach' },
  { stop: true, caption: 'stop' },
  { dog: 'sit', caption: 'sit' },
  { wait: 1, caption: 'basePosition' },
]

/** The handler walks on, the dog left: on to the next card. */
const walkOff: ExerciseStep = { walk: 3, caption: 'leaveDog' }

/**
 * 319 Odložení do stoje, chůze vpřed: "Psovod se zastaví a pes si sedá u nohy psovoda. Poté je pes
 * velen do pozice stůj. Následně psovod pokračuje, bez psa …"
 */
const L319: Exercise = {
  code: '319',
  ruleset: 'FCI',
  steps: [
    ...stopSit,
    { dog: 'stand', caption: 'standUp' },
    { wait: 0.8, caption: 'standHold' },
    { dogStays: true, caption: 'stayStand' },
    walkOff,
  ],
}

/**
 * 408 / 409 Odložení do sedu / lehu, vpřed: "Za pohybu je pes velen do pozice sedni, zatímco
 * psovod pokračuje bez zastavení vpřed (bez psa)" — as 3-310 / 3-311 (`dropsDog`).
 */
const leaveOnTheMove = (code: string, posture: 'sit' | 'down'): Exercise => ({
  code,
  ruleset: 'FCI',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: DROP_WALK, dropsDog: posture, caption: posture === 'sit' ? 'dropSit' : 'dropDown' },
    walkOff,
  ],
})
/** Leaving on the move, the handler is that far on when the next walk begins, metres. */
const DROP_WALK = 0.2
const L408 = leaveOnTheMove('408', 'sit')
const L409 = leaveOnTheMove('409', 'down')

/**
 * The recall cone "přibližně 5 m za kartou a 1 m od linie chůze (na opačné straně, než je veden
 * pes)" (§3.5): in the station's frame (the card right of the team, 0.5 m on — `FCI_CARD_PLACE`),
 * 5 m past the card, 1 m right of the handler's way.
 */
const RECALL_CONE = { x: -1, z: 5.5 }

/**
 * A leave card with its recall cone: the leave card's part, on to the cone, and beside it the
 * dog called while the handler walks on, slowing ("může při chůzi zpomalit") — it gallops after
 * them into heel; on together.
 */
const withCone = (leave: Exercise): Exercise => {
  const leaving = leave.steps.findIndex((s) => 'dogStays' in s || ('walk' in s && s.dropsDog))
  const left = leave.steps[leaving]!
  const onTheWay = 'walk' in left ? left.walk : 0
  return {
    ...leave,
    cones: [RECALL_CONE],
    pairedWith: CONE,
    steps: [
      ...leave.steps.slice(0, leaving + 1),
      { walk: RECALL_CONE.z - onTheWay, caption: 'toRecallCone' },
      { walk: 20, pace: 'slow', dogChases: true, caption: 'recallAtCone' },
      { walk: 3, pace: 'normal', caption: 'leaveTogether' },
    ],
  }
}
/** The "card" a leave card with its recall cone is paired with (`pairedWith`). */
export const CONE = 'C'

/**
 * A national follow-up as FCI's recall card: its card before the handler (B), and "Psovod se otáčí
 * čelem vzad, zastaví se a přivolává psa" — the handler stands, turned, before calling (the dog
 * set off while they were still turning, the author).
 */
const asFci = (code: string, from: Exercise): Exercise => {
  const { supplementary: _, ...rest } = from
  return {
    ...rest,
    code,
    ruleset: 'FCI',
    card: 'ahead',
    stopAt: INTO_THE_SQUARE,
    steps: rest.steps.flatMap((s) => ('turn' in s ? [s, TURNED] : [s])),
  }
}

/** Turned about to face the dog, the handler stands a moment before calling it, seconds. */
const TURNED: ExerciseStep = { wait: 0.8, caption: 'turnToDog' }

/**
 * A recall card's handler stops in the square before the card, not short of it as nationally:
 * "musí se psovod alespoň částečně nacházet v místě pro vykonání cviku" (§4.3).
 */
const INTO_THE_SQUARE = { x: 0, z: 0.5 }

/**
 * 321 Čelem vzad a přivolání: "Psovod se otáčí čelem vzad, zastaví se a přivolává psa. … Pes je
 * velen do přiřazení k levé noze psovoda (aniž by zaujal pozici sedni). Jakmile pes dosáhne úrovně
 * psovoda u levé nohy, tým pokračuje vpřed." — 2-216.
 */
const F321 = asFci('321', F2_216)
/**
 * 322 / 323 … přivolání do předsednutí, přiřazení okolo zprava doleva / přímo vlevo, stop — 2-214
 * with D0a / D0b: "míjí psovoda zepředu po jeho pravé straně a zezadu jej obchází zpět k levé
 * noze", "přímo k levé noze psovoda, kde zaujímá pozici sedni".
 */
const F322 = (() => {
  const from = asFci(
    '322',
    F2_214.find((e) => e.supplementary === 'D0a')!,
  )
  return {
    ...from,
    // A little nearer the back of the square than the other recall cards: the dog goes round
    // the handler turned about, with the card behind them.
    stopAt: { x: 0, z: 0.4 },
    // The card stands behind the handler turned about: round them the dog keeps closer behind
    // than for D0a, clear of it.
    steps: from.steps.map((s) =>
      'dogPath' in s && s.dogPath === 'aroundHandler'
        ? { ...s, dogPath: 'aroundHandlerClose' as const }
        : s,
    ),
  }
})()
const F323 = asFci(
  '323',
  F2_214.find((e) => e.supplementary === 'D0b')!,
)

/**
 * 421 Otočení, přivolání přes překážku se směrem: "musí být umístěna 8 metrů od předchozí karty.
 * Překážka je umístěna přesně v poloviční vzdálenosti mezi touto kartou a předchozí kartou tak, že
 * nejbližší bočnice překážky je umístěna 2 m vlevo nebo vpravo od středové linie. Psovod se otáčí
 * čelem vzad, zastavuje se a přivolává psa přes překážku do pozice ke své levé noze (bez usednutí
 * psa). … Tým následně pokračuje směrem vpřed." The jump on the dog's side (the plan's), the dog
 * to it, over it, and on into heel as 321's (2-216's) does.
 */
const F421_GAP = 8
const F421: Exercise = {
  code: '421',
  ruleset: 'FCI',
  card: 'ahead',
  stopAt: { x: 0, z: 0.5 },
  // Its middle 2 m and half its width off the line, halfway back to the leave card.
  jumps: [{ x: 2 + 0.6, z: -F421_GAP / 2 }],
  steps: [
    { walk: 3.5, caption: 'leaveDog' },
    { stop: true, caption: 'stopAheadAlone' },
    { turn: -180, radius: 0, caption: 'turnToDog' },
    TURNED,
    { recall: 'heel', overJump: true, caption: 'recallOverJumpAside' },
    { walk: 2, caption: 'leaveTogether' },
  ],
}

/** A dog's length (a border collie), metres: "alespoň o 1 délku těla psa". */
const DOG_LENGTH = 0.9

/**
 * 422 Otočení, couvání, sedni, lehni, přivolání: "Psovod se otáčí čelem vzad, zastaví se a velí
 * psovi chůzi vzad (couvání) alespoň o 1 délku těla psa. … Následně je pes velen do pozice sedni a
 * poté do pozice lehni. Po vykonání pozic je pes velen do přivolání k levé noze psovoda, kde pes
 * zaujímá pozici sedni."
 */
const F422: Exercise = {
  code: '422',
  ruleset: 'FCI',
  card: 'ahead',
  stopAt: INTO_THE_SQUARE,
  steps: [
    { walk: 3.5, caption: 'leaveDog' },
    { stop: true, caption: 'stopAheadAlone' },
    { turn: -180, radius: 0, caption: 'turnToDog' },
    TURNED,
    { dogBacks: DOG_LENGTH, caption: 'dogBacksAway' },
    { dog: 'sit', caption: 'sitFromAfar' },
    { wait: 1, caption: 'basePosition' },
    { dog: 'down', caption: 'downFromAfar' },
    { wait: 1, caption: 'downHold' },
    { recall: 'heel', caption: 'recallHeel' },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    { walk: 2, caption: 'leaveTurn' },
  ],
}

/**
 * 410 Stop, vyslání vpřed, stůj, chůze vpřed, přivolání: "Týmu je při zastavení dovoleno se otočit
 * směrem ke kuželu. Kužel je umístěn ve vzdálenosti 3 - 5 m v úhlu 90° vpravo nebo vlevo. Psovod
 * vysílá psa, aby se zastavil u kuželu (nejméně jedna tlapka musí být ve vzdálenosti do 1 metru od
 * kuželu). Pes zůstává stát u kuželu, zatímco psovod pokračuje vpřed směrem ke kuželu pro
 * přivolání (C) a přivolává psa." As in the FCI video: the team turns to the cone, 4 m to the dog's
 * side (the plan's), the dog sits, runs out and stops standing by the cone facing the handler
 * (3-324's `sendTo`); the handler turns back, walks on to the recall cone and calls the dog on the
 * move — it runs over at a slant into heel.
 */
const SEND_CONE = { x: 4, z: 0 }
const R410: Exercise = {
  code: '410',
  ruleset: 'FCI',
  cones: [SEND_CONE, RECALL_CONE],
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { turn: -90, radius: 0, caption: 'faceCone' },
    { dog: 'sit', caption: 'sit' },
    { wait: 1, caption: 'basePosition' },
    { sendTo: SEND_CONE, caption: 'sendToConeStand' },
    { turn: 90, radius: 0, caption: 'backOnCourse' },
    { dogStays: true, caption: 'standAtCone' },
    { walk: RECALL_CONE.z, caption: 'toRecallCone' },
    { walk: 20, pace: 'slow', dogChases: true, caption: 'recallAtCone' },
    { walk: 3, pace: 'normal', caption: 'leaveTogether' },
  ],
}

/**
 * 411 Postavení před, couvání, stůj, chůze vpřed, přivolání: "Psovod zastaví a velí psa do pozice
 * stůj před psovodem. Pes je poté velen k chůzi vzad (couvání) nejméně o tři délky svého těla ve
 * směru od psovoda a zastavil se. Zatímco pes stojí, psovod přichází k psovi, kterého velí k
 * přiřazení se (návrat k vedení vlevo) a společně bez zastavení pokračují." The dog into the front,
 * standing; backing away (`dogBacks`); the handler walks up beside it — keeping it on their left —
 * and as they come level it turns round into heel and on they go (`dogChases`). The handler stops
 * left in the square: walking up, their way passes the card on their right.
 */
/**
 * Walking up to the dog standing facing them (411), the handler passes this far right of it,
 * metres — room for it to turn round into heel.
 */
const TURNS_ROUND_ROOM = 0.65
/** Walking up to the dog, the handler goes straight on this far — past the card — first, metres. */
const PAST_THE_CARD = 0.7
/** 411's dog backs away "nejméně o tři délky svého těla" — a little more, metres. */
const BACKS_AWAY = 3.5 * DOG_LENGTH
/** …and it turns round towards them as they are still this far short of it, metres. */
const TURNS_ROUND_AHEAD = 1.6
const R411: Exercise = {
  code: '411',
  ruleset: 'FCI',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dogPath: 'toFront', caption: 'frontStand' },
    { wait: 0.8, caption: 'frontStand' },
    { dogStays: true, caption: 'frontStand' },
    { dogBacks: BACKS_AWAY, caption: 'dogBacksAwayThree' },
    { wait: 0.8, caption: 'standHold' },
    // Straight on past the card, then a long gentle bend over to pass the dog on its right;
    // the dog turns round as the handler is still `TURNS_ROUND_AHEAD` short of it.
    { walk: PAST_THE_CARD, caption: 'toTheDog' },
    {
      course: swerve(
        -TURNS_ROUND_ROOM,
        PLACES.front.z + BACKS_AWAY - TURNS_ROUND_AHEAD - PAST_THE_CARD - 0.3,
      ),
      parts: [0, 2],
      caption: 'toTheDog',
    },
    // Slower as the dog turns round and comes in, then on together at the pace.
    { walk: 6, pace: 'slow', dogChases: true, caption: 'dogIntoHeelWalking' },
    { walk: 2, pace: 'normal', caption: 'leaveTogether' },
  ],
}

/** The leave cards' parts (each also played with its cone), and the recall cards'. */
export const FCI_LEAVE_PARTS: Exercise[] = [L319, L408, L409]
export const FCI_FOLLOW_UP_PARTS: Exercise[] = [F321, F322, F323, F421, F422]

/** What each leave card is shown with: its cone first, then the recall cards. */
const FOLLOW_UPS = [F321, F322, F323, F421, F422]
/** …and the leave card each recall card is shown after: on the move, sitting. */
const SHOWN_BEFORE = L408

const fciPair = (code: string, leave: Exercise, followUp: Exercise): Exercise => ({
  ...pair(code, leave, followUp, false, followUp === F421 ? F421_GAP : RECALL_CARD_GAP),
  ruleset: 'FCI',
})
/** A recall card "ve vzdálenosti 3 - 5 m od předchozí karty", metres. */
const RECALL_CARD_GAP = 4

export const FCI_LEAVE_EXERCISES: Exercise[] = [
  R410,
  R411,
  ...FCI_LEAVE_PARTS.flatMap((leave) => [
    withCone(leave),
    ...FOLLOW_UPS.map((followUp) => fciPair(leave.code, leave, followUp)),
  ]),
  ...FCI_FOLLOW_UP_PARTS.map((followUp) => fciPair(followUp.code, SHOWN_BEFORE, followUp)),
]
