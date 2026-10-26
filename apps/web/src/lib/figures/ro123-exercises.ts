import type { Exercise, ExerciseStep } from './exercise'
import {
  eightExercise,
  frontAndFinish,
  slalomExercise,
  stepsBack,
  stepsForward,
  stopTurnStop,
  SUPPLEMENTARIES,
  turnOnTheSpot,
  turnSteps,
} from './roz-exercises'

/**
 * RO1–RO3 exercises built from what the RO-Z ones already do: stops and positions, turns on
 * the spot, steps forward and back, the dog in front, slaloms and the figure eight. Each
 * cites the regulation (Zkušební řád RO v ČR 2026, appendix 1); what the text leaves open
 * follows the RO-Z cards.
 */

/** Steps forward with the dog at heel, exactly as many as the card says, then a stop. */
const forward = (steps: number, caption: string): ExerciseStep[] => [
  { footwork: stepsForward(steps), caption },
]

/** The team arrives and stops, the dog sitting at heel ("zaujme základní pozici"). */
const stopSit = (card: 'side' | 'ahead' = 'side'): ExerciseStep[] => [
  { walk: 3.5, caption: card === 'ahead' ? 'approachTurn' : 'approach' },
  { stop: true, caption: card === 'ahead' ? 'stopAhead' : 'stop' },
  { dog: 'sit', caption: 'sit' },
  { wait: 1, caption: 'basePosition' },
]

/** The team arrives and stops, the dog standing at heel without sitting first. */
const stopStand = (card: 'side' | 'ahead' = 'side'): ExerciseStep[] => [
  { walk: 3.5, caption: card === 'ahead' ? 'approachTurn' : 'approach' },
  { stop: true, caption: 'stopStand' },
  { wait: 1, caption: 'standHold' },
]

const leave = (card: 'side' | 'ahead' = 'side'): ExerciseStep => ({
  walk: 3,
  pace: 'normal',
  caption: card === 'ahead' ? 'leaveTurn' : 'leave',
})

/** How far the dog walks to the handler's side at heel, metres (`team.ts`). */
const HEEL_SIDE = 0.42

/** The right turn is `-1` (the heading falls), the left one `1`. */
/**
 * Where the handler stops when the dog goes round them or swings wide in a turn on the spot:
 * in the middle of the square, further from the card than usual, so the dog passes clear
 * of it.
 */
const ROOM_AROUND = { x: 0.15, z: -0.45 }

const RIGHT = -1
const LEFT = 1
const turnCaption = (sign: number, degrees: number) =>
  `turn${sign === RIGHT ? 'Right' : 'Left'}${degrees}OnSpot`

/** A 90° turn on the spot from a stand, in the three steps of Z-030/Z-031. */
const turn90 = (sign: 1 | -1): ExerciseStep => ({
  footwork: turnSteps(sign),
  caption: turnCaption(sign, 90),
})

/**
 * The same turn when the team "pokračuje v chůzi" right after it: the inner foot does not
 * close up — its third step is already the first step of the walk.
 */
const turn90On = (sign: 1 | -1): ExerciseStep => ({
  footwork: turnSteps(sign).slice(0, 2),
  caption: turnCaption(sign, 90),
})

/** A 180° turn on the spot from a stand (max. four steps), the dog round at heel. */
const turn180 = (sign: 1 | -1): ExerciseStep => ({
  turn: sign === RIGHT ? 180 : -180,
  radius: 0,
  caption: turnCaption(sign, 180),
})

// ——— RO1 ———

/**
 * 1-101 360° vlevo (p. 30): turning to the dog's side, the dog keeps its front paws in place
 * and swings its rear round them while the handler walks a small circle round the dog's
 * shoulders (the video, the author) — a turn round a point level with the dog's shoulders,
 * at heel distance.
 */
export const R1_101: Exercise = {
  code: '1-101',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { turn: -360, radius: HEEL_SIDE, caption: 'turnLeft360' },
    leave(),
  ],
}

/** 1-103 / 1-104 Stop – obrat vpravo / vlevo o 90° – vpřed (p. 30–31). */
const stopTurnOn = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [...stopSit('ahead'), turn90On(sign), leave('ahead')],
})
export const R1_103 = stopTurnOn('1-103', RIGHT)
export const R1_104 = stopTurnOn('1-104', LEFT)

/** 1-105 / 1-106 Stop – obrat vpravo / vlevo o 90° – stop (p. 31): as Z-030 / Z-031. */
export const R1_105 = stopTurnStop('1-105', RIGHT, turnCaption(RIGHT, 90))
export const R1_106 = stopTurnStop('1-106', LEFT, turnCaption(LEFT, 90))

/**
 * 1-107 Stop – 1 krok vpřed + stůj – 2 kroky vpřed + sedni – 3 kroky vpřed + lehni (p. 32):
 * "Tým provede společně posun o jeden krok vpřed, zastaví se a pes zůstává stát. Dále tým
 * provede dva kroky vpřed, zastaví se a zaujme základní pozici. Následně tým provede tři
 * kroky vpřed, zastaví se a pes si lehá."
 */
export const R1_107: Exercise = {
  code: '1-107',
  steps: [
    ...stopSit(),
    ...forward(1, 'oneStepStand'),
    { wait: 1, caption: 'standHold' },
    ...forward(2, 'twoStepsSit'),
    { dog: 'sit', caption: 'twoStepsSit' },
    { wait: 1, caption: 'basePosition' },
    ...forward(3, 'threeStepsDown'),
    { dog: 'down', caption: 'threeStepsDown' },
    { wait: 1, caption: 'downHold' },
    leave(),
  ],
}

/**
 * 1-108 Předsednutí – 1 krok vzad + stůj – 2 kroky vzad + sedni – 3 kroky vzad + lehni před
 * psovodem (p. 32), with D0a–d: "provede psovod jeden krok vzad, pes jej následuje a
 * zaujímá pozici stůj před psovodem. Následně … dva kroky vzad, … sedni … Dále … tři kroky
 * vzad, … lehni před psovodem."
 */
export const R1_108 = SUPPLEMENTARIES.map((d0) =>
  frontAndFinish(d0, '1-108', [
    { footwork: stepsBack(1), caption: 'oneStepBackStand' },
    { wait: 0.8, caption: 'frontHold' },
    { footwork: stepsBack(2), caption: 'twoStepsBackSit' },
    { dog: 'sit', caption: 'twoStepsBackSit' },
    { wait: 0.8, caption: 'frontHold' },
    { footwork: stepsBack(3), caption: 'threeStepsBackDown' },
    { dog: 'down', caption: 'threeStepsBackDown' },
    { wait: 1, caption: 'frontHold' },
  ]),
)

/**
 * 1-109 Zastavit – lehni (p. 33): "Tým se zastaví …, přičemž si pes rovnou na povel lehá u
 * nohy psovoda (nesmí si nejprve sednout ani zůstat stát)."
 */
export const R1_109: Exercise = {
  code: '1-109',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stopDown' },
    { dog: 'down', caption: 'stopDown' },
    { wait: 1, caption: 'downHold' },
    leave(),
  ],
}

/**
 * 1-110 Stop – rychlé tempo ze sedu (p. 33): "Na povel psovoda tým okamžitě vyráží společně
 * v rychlém tempu vpřed. Tým udržuje rychlé tempo, dokud jiný cvik toto tempo nezmění."
 */
export const R1_110: Exercise = {
  code: '1-110',
  steps: [
    ...stopSit(),
    { walk: 2, pace: 'fast', caption: 'fastFromSit' },
    { walk: 3, pace: 'fast', caption: 'paceHold' },
  ],
}

/** 1-111 Slalom jednoduchý s rušivým vlivem (p. 33): bowls between the end cones. */
export const R1_111 = slalomExercise('1-111', false, true)

/** 1-112 / 1-113 180° obrat vpravo / vlevo (p. 34): "na místě … (max. 4 kroky nohou)". */
export const R1_112 = turnOnTheSpot('1-112', 180, turnCaption(RIGHT, 180), 'ahead')
export const R1_113 = turnOnTheSpot('1-113', -180, turnCaption(LEFT, 180), 'ahead')

/**
 * 1-116 2 x čelem vzad – pes za psovodem (p. 35): Z-010 twice — "Obraty se provádí na místě
 * a bez mezikroku. Tým pokračuje dál bez zastavení."
 */
export const R1_116: Exercise = {
  code: '1-116',
  // Turned about twice, the team goes on the way it came: the card in the usual place.
  stopAt: ROOM_AROUND,
  steps: [
    { walk: 3.5, caption: 'approach' },
    { turn: -180, radius: 0, dogRound: 'aroundFromHeel', caption: 'aboutTurnDogBehind' },
    { turn: -180, radius: 0, dogRound: 'aroundFromHeel', caption: 'aboutTurnAgain' },
    leave(),
  ],
}

/** 1-117 Figura 8 s rušivým vlivem (p. 35): Z-022 with treats and toys in the bowls. */
export const R1_117 = eightExercise('1-117')

/**
 * 1-118 Zastavení ve stoje (p. 36): "Tým se zastaví … a pes zaujme polohu ve stoje, aniž by
 * si před tím sedl."
 */
export const R1_118: Exercise = { code: '1-118', steps: [...stopStand(), leave()] }

/** 1-119 / 1-120 Stůj – obrat vpravo / vlevo o 90° – vpřed (p. 36–37). */
const standTurnOn = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [...stopStand('ahead'), turn90On(sign), leave('ahead')],
})
export const R1_119 = standTurnOn('1-119', RIGHT)
export const R1_120 = standTurnOn('1-120', LEFT)

/**
 * 1-121 / 1-122 180° obrat vpravo – 180° obrat vlevo, and the other way round (p. 37):
 * "na místě obrat o 180° vpravo (max. 4 kroky nohou), poté následují 2 kroky vpřed a opět
 * obrat na místě tentokrát o 180° vlevo."
 */
const turnTwoStepsTurn = (code: string, first: 1 | -1): Exercise => ({
  code,
  stopAt: ROOM_AROUND,
  steps: [
    { walk: 3.5, caption: 'approach' },
    { turn: first === RIGHT ? 180 : -180, radius: 0, caption: turnCaption(first, 180) },
    { walk: 0.7, pace: 'slow', caption: 'twoStepsOn' },
    {
      turn: first === RIGHT ? -180 : 180,
      radius: 0,
      caption: turnCaption(-first as 1 | -1, 180),
    },
    leave(),
  ],
})
export const R1_121 = turnTwoStepsTurn('1-121', RIGHT)
export const R1_122 = turnTwoStepsTurn('1-122', LEFT)

// ——— RO2 ———

/**
 * 2-201 / 2-202 Stop – obrat vpravo / vlevo o 90° – krok vpřed – stop (p. 39): the turn of
 * Z-030, one step forward, the dog sitting again.
 */
const stopTurnStepStop = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [
    ...stopSit('ahead'),
    turn90(sign),
    ...forward(1, 'oneStep'),
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    leave('ahead'),
  ],
})
export const R2_201 = stopTurnStepStop('2-201', RIGHT)
export const R2_202 = stopTurnStepStop('2-202', LEFT)

/** 2-203 / 2-204 Stop – obrat o 180° vpravo / vlevo – stop (p. 40). */
const stopTurn180Stop = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [
    ...stopSit('ahead'),
    turn180(sign),
    { stop: true, caption: turnCaption(sign, 180) },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    leave('ahead'),
  ],
})
export const R2_203 = stopTurn180Stop('2-203', RIGHT)
export const R2_204 = stopTurn180Stop('2-204', LEFT)

/** 2-205 / 2-206 Stop – obrat vpravo / vlevo o 180° – vpřed (p. 40–41). */
const stopTurn180On = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [...stopSit('ahead'), turn180(sign), leave('ahead')],
})
export const R2_205 = stopTurn180On('2-205', RIGHT)
export const R2_206 = stopTurn180On('2-206', LEFT)

/** 2-209 Stop – vstaň (p. 42): "Psovod velí psa do pozice stůj." */
export const R2_209: Exercise = {
  code: '2-209',
  steps: [
    ...stopSit(),
    { dog: 'stand', caption: 'standUp' },
    { wait: 1, caption: 'standHold' },
    leave(),
  ],
}

/** 2-210 Stop – vstaň – sedni (p. 42). */
export const R2_210: Exercise = {
  code: '2-210',
  steps: [
    ...stopSit(),
    { dog: 'stand', caption: 'standUp' },
    { wait: 1, caption: 'standHold' },
    { dog: 'sit', caption: 'sitAgain' },
    { wait: 1, caption: 'basePosition' },
    leave(),
  ],
}

/** 2-220 Slalom tam a zpět s rušivým vlivem (p. 45): Z-021 with bowls between the cones. */
export const R2_220 = slalomExercise('2-220', true, true)

/**
 * 2-221 Stůj před psovodem – 1, 2, 3 kroky zpět (p. 46), with D0a–d: the dog stands in
 * front, then follows one, two and three steps back, standing in front each time.
 */
export const R2_221 = SUPPLEMENTARIES.map((d0) =>
  frontAndFinish(
    d0,
    '2-221',
    [
      { footwork: stepsBack(1), caption: 'oneStepBackStand' },
      { wait: 0.8, caption: 'frontHold' },
      { footwork: stepsBack(2), caption: 'twoStepsBackStand' },
      { wait: 0.8, caption: 'frontHold' },
      { footwork: stepsBack(3), caption: 'threeStepsBackStand' },
      { wait: 1, caption: 'frontHold' },
    ],
    'stand',
  ),
)

/** 2-223 / 2-224 Stůj – obrat vpravo / vlevo o 90° – stůj (p. 47). */
const standTurnStand = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [...stopStand('ahead'), turn90(sign), { wait: 1, caption: 'standHold' }, leave('ahead')],
})
export const R2_223 = standTurnStand('2-223', RIGHT)
export const R2_224 = standTurnStand('2-224', LEFT)

/** 2-225 / 2-226 Stůj – obrat vpravo / vlevo o 180° – vpřed (p. 47–48). */
const standTurn180On = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [...stopStand('ahead'), turn180(sign), leave('ahead')],
})
export const R2_225 = standTurn180On('2-225', RIGHT)
export const R2_226 = standTurn180On('2-226', LEFT)

/** 2-227 Stůj – 1, 2, 3 kroky vpřed (p. 48): the dog standing at each stop. */
export const R2_227: Exercise = {
  code: '2-227',
  steps: [
    ...stopStand(),
    ...forward(1, 'oneStepStand'),
    { wait: 1, caption: 'standHold' },
    ...forward(2, 'twoStepsStand'),
    { wait: 1, caption: 'standHold' },
    ...forward(3, 'threeStepsStand'),
    { wait: 1, caption: 'standHold' },
    leave(),
  ],
}

// ——— RO3 ———

/**
 * 3-303 Zastavit – stůj – okolo psa (p. 52): "psovod obejde stojícího psa zepředu, postaví se
 * opět vedle něj a krátce se v pozici zdrží. Pes po celou dobu cviku musí zůstat stát."
 */
export const R3_303: Exercise = {
  code: '3-303',
  steps: [
    ...stopStand(),
    { around: 'dog', caption: 'aroundStandingDog' },
    { wait: 1, caption: 'standHold' },
    leave(),
  ],
}

/** 3-304 Stop – stůj – lehni (p. 52). */
export const R3_304: Exercise = {
  code: '3-304',
  steps: [
    ...stopSit(),
    { dog: 'stand', caption: 'standUp' },
    { wait: 0.8, caption: 'standHold' },
    { dog: 'down', caption: 'downFromStand' },
    { wait: 1, caption: 'downHold' },
    leave(),
  ],
}

/** 3-305 Stop – lehni – vstaň (p. 52). */
export const R3_305: Exercise = {
  code: '3-305',
  steps: [
    ...stopSit(),
    { dog: 'down', caption: 'down' },
    { wait: 1, caption: 'downHold' },
    { dog: 'stand', caption: 'standUp' },
    { wait: 1, caption: 'standHold' },
    leave(),
  ],
}

/** 3-316 / 3-317 Stůj – obrat vpravo / vlevo o 180° – stůj (p. 57). */
const standTurn180Stand = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [
    ...stopStand('ahead'),
    turn180(sign),
    { stop: true, caption: turnCaption(sign, 180) },
    { wait: 1, caption: 'standHold' },
    leave('ahead'),
  ],
})
export const R3_316 = standTurn180Stand('3-316', RIGHT)
export const R3_317 = standTurn180Stand('3-317', LEFT)

/**
 * 3-318 Zastavení do stoje – pes okolo psovoda – stůj (p. 58): "Pes obchází zepředu psovoda
 * a opět se zastavuje ve stoje u nohy psovoda. Psovod zůstává celou dobu cviku stát."
 */
export const R3_318: Exercise = {
  code: '3-318',
  stopAt: ROOM_AROUND,
  steps: [
    ...stopStand(),
    { dogPath: 'aroundFromHeel', caption: 'dogAroundHandlerStand' },
    { wait: 1, caption: 'standHold' },
    leave(),
  ],
}

/** The RO1–RO3 exercises, in card order (with a D0 card, once per supplementary card). */
export const HIGHER_EXERCISES: Exercise[] = [
  R1_101,
  R1_103,
  R1_104,
  R1_105,
  R1_106,
  R1_107,
  ...R1_108,
  R1_109,
  R1_110,
  R1_111,
  R1_112,
  R1_113,
  R1_116,
  R1_117,
  R1_118,
  R1_119,
  R1_120,
  R1_121,
  R1_122,
  R2_201,
  R2_202,
  R2_203,
  R2_204,
  R2_205,
  R2_206,
  R2_209,
  R2_210,
  R2_220,
  ...R2_221,
  R2_223,
  R2_224,
  R2_225,
  R2_226,
  R2_227,
  R3_303,
  R3_304,
  R3_305,
  R3_316,
  R3_317,
  R3_318,
]
