import type { Exercise, ExerciseStep } from './exercise'
import { swerve } from './courses'
import type { FootTarget } from './locomotion'
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

/**
 * Where the handler stops when the dog goes round them or swings wide in a turn on the spot:
 * in the middle of the square, further from the card than usual, so the dog passes clear
 * of it.
 */
const ROOM_AROUND = { x: 0.15, z: -0.45 }

/** The right turn is `-1` (the heading falls), the left one `1`. */
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

/** Walking on with the dog at the handler's right leg after it changed sides. */
const leaveRight = (card: 'side' | 'ahead' = 'side'): ExerciseStep => ({
  walk: 3,
  pace: 'normal',
  caption: card === 'ahead' ? 'leaveTurnRight' : 'leaveRight',
})

/**
 * 1-123 Výměna strany za psovodem v pohybu (p. 38): "Pes v místě pro vykonání cviku provede za
 * psovodem výměnu strany. Psovod se stále pohybuje dopředu. Pes nesmí při výměně udělat
 * velký oblouk." — `DOG_WALKING_BEHIND`.
 */
export const R1_123: Exercise = {
  code: '1-123',
  steps: [
    { walk: 3.5, caption: 'approach' },
    // Over a few steps, so the dog dropping back still goes forward over the ground.
    { walk: 3, dogChanges: 'behind', caption: 'changeBehindWalking' },
    leaveRight(),
  ],
}

/**
 * 1-124 / 1-125 Stop – změna za psovodem / před psovodem – stop (p. 38): "Tým zastaví … a
 * zaujme základní pozici. Na povel psovoda pes za zády psovoda změní stranu a následně se
 * posadí vedle druhé nohy psovoda" / "jej pes zepředu obejde a přiřadí se k druhé noze
 * psovoda, kde usedá. Strana vedení je změněna." The handler stands in the middle of the
 * space so the dog goes round clear of the card.
 */
const stopChangeStop = (code: string, way: 'behindToRight' | 'frontToRight'): Exercise => ({
  code,
  stopAt: ROOM_AROUND,
  steps: [
    ...stopSit(),
    { dogPath: way, caption: way === 'behindToRight' ? 'changeBehind' : 'changeInFront' },
    { dog: 'sit', caption: 'finishSitRight' },
    { wait: 1, caption: 'basePositionRight' },
    leaveRight(),
  ],
})
export const R1_124 = stopChangeStop('1-124', 'behindToRight')
export const R1_125 = stopChangeStop('1-125', 'frontToRight')

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
/** How far a side step takes the handler, metres: "znatelný úkrok", a long step aside. */
const SIDE_STEP = 0.5

/**
 * A side step set by hand, "ne diagonálně": the foot on that side steps straight out, the
 * other one closes up beside it.
 */
const stepAside = (sign: 1 | -1): FootTarget[] => {
  const [lead, close] = sign === RIGHT ? [1, 0] : [0, 1]
  const x = (foot: number) => (foot ? -0.1 : 0.1) + sign * SIDE_STEP
  return [
    { foot: lead, x: x(lead), z: -0.08, yaw: 0 },
    { foot: close, x: x(close), z: -0.08, yaw: 0 },
  ]
}

/**
 * A side step "před kartou" that then passes the card — on the team's left after a step
 * right, on its right after a step left. The exercise space is straight before the card
 * (§5.3.1, as for a change of direction); in it the handler stops off to the side the step
 * goes — the whole team still inside the space — so the step takes the team past the card
 * with room to spare (`stopAt`, from the middle of the space; `z`: further back for a dog
 * in front).
 */
const stopForSideStep = (sign: 1 | -1, z = 0) => ({ x: sign === RIGHT ? -0.35 : 0.04, z })

/**
 * The walk away at the end of an exercise taken round the cards ahead instead, bending
 * `aside` metres over (− right, + left). After a step right the team passes the card on its
 * right side (§5.3.1, "se karta obchází z pravé strany"), and the D0 card standing right
 * next to it (p. 8) is in the way: the team bends right round both.
 */
const roundTheCards = (steps: ExerciseStep[], aside: number): ExerciseStep[] => {
  const last = steps.at(-1)!
  if (!('walk' in last)) return steps
  return [...steps.slice(0, -1), { course: swerve(aside), parts: [0, 3], caption: last.caption }]
}

/**
 * 2-207 / 2-229 Stop – úkrok vpravo / vlevo – stop (p. 41, 49): "Na povel psovoda provede
 * tým úkrok vpravo (ne diagonálně), přičemž pes následuje psovoda a poté tým zaujme
 * základní pozici. Po splnění cviku tým míjí kartu po své levé straně" (vlevo: pravé).
 */
const stopSideStepStop = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  stopAt: stopForSideStep(sign),
  steps: [
    ...stopSit('ahead'),
    { footwork: stepAside(sign), caption: sign === RIGHT ? 'sideStepRight' : 'sideStepLeft' },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    { walk: 3, pace: 'normal', caption: sign === RIGHT ? 'passCardLeft' : 'passCardRight' },
  ],
})
export const R2_207 = stopSideStepStop('2-207', RIGHT)

/** The dog in front following a side step and sitting in front again. */
const frontSideStep = (sign: 1 | -1): ExerciseStep[] => [
  {
    footwork: stepAside(sign),
    caption: sign === RIGHT ? 'frontSideStepRight' : 'frontSideStepLeft',
  },
  { dog: 'sit', caption: 'frontSitAgain' },
  { wait: 0.8, caption: 'frontHold' },
]

/**
 * 1-114 / 1-115 Předsednutí – úkrok stranou – vpravo / vlevo (p. 34–35): "Jakmile pes zaujme
 * pozici před psovodem, psovod udělá znatelný úkrok doprava (ne diagonálně), přičemž pes jej
 * následuje končí opět v předsednutí před psovodem. Po splnění cviku na doplňkové kartě tým
 * míjí kartu po své levé straně" (vlevo: pravé) — begun "před kartou", in the space straight
 * before it, as 2-207 / 2-229 (unlike Z-014 "v místě pro provedení cviku").
 */
const frontSideStepCard = (code: string, sign: 1 | -1) =>
  SUPPLEMENTARIES.map((d0) => {
    const exercise = frontAndFinish(d0, code, frontSideStep(sign))
    return {
      ...exercise,
      card: 'ahead' as const,
      stopAt: stopForSideStep(sign, -0.45),
      steps: sign === RIGHT ? roundTheCards(exercise.steps, -0.6) : exercise.steps,
    }
  })
export const R1_114 = frontSideStepCard('1-114', RIGHT)
export const R1_115 = frontSideStepCard('1-115', LEFT)

/**
 * 2-222 Předsednutí – úkrok vlevo – úkrok vpravo – předsednutí (p. 46): a step left, the dog
 * following into the front, then a step right, the same; the team passes the card on its
 * right. Side steps start straight before the card (§5.3.1); the handler stops in the left
 * of that space, their feet in it — they are what counts — and the team, back where it
 * stopped, bends a little left past the cards.
 */
export const R2_222 = SUPPLEMENTARIES.map((d0) => {
  const exercise = frontAndFinish(d0, '2-222', [...frontSideStep(LEFT), ...frontSideStep(RIGHT)])
  return {
    ...exercise,
    card: 'ahead' as const,
    stopAt: { x: 0.4, z: -0.45 },
    steps: roundTheCards(exercise.steps, 0.25),
  }
})

/**
 * 1-102 Za pohybu – úkrok vpravo (p. 30): "Za stálého pohybu udělá psovod před kartou úkrok
 * stranou doprava, pes se pohybuje současně a rovnoběžně s ním. Následně bez zastavení tým
 * míjí kartu po své levé straně." The side step of 2-207, straight out to the right, taken
 * out of the walk with no stop, and walking straight on — the dog staying on its legs.
 */
export const R1_102: Exercise = {
  code: '1-102',
  card: 'ahead',
  stopAt: stopForSideStep(RIGHT),
  steps: [
    // The last step of the walk with the left foot, the right one out to its level, the left
    // one closing up — and on (the author).
    { walk: 3.5, caption: 'approachTurn' },
    { footwork: stepAside(RIGHT), fromFoot: 0, caption: 'sideStepWalking' },
    { walk: 3, pace: 'normal', caption: 'passCardLeft' },
  ],
}
export const R2_229 = stopSideStepStop('2-229', LEFT)

/**
 * 2-232 Obrat proti sobě (p. 50): "Tým před kartou vykoná obrat o 180° směrem k sobě. Jakmile
 * se pes nachází u druhé nohy psovoda, tým se rozchází novým směrem." The handler turns left
 * on the spot, towards the dog, the dog right, towards the handler, round its front paws.
 */
export const R2_232: Exercise = {
  code: '2-232',
  card: 'ahead',
  steps: [
    { walk: 3.5, caption: 'approachTurn' },
    {
      turn: -180,
      radius: 0,
      // Round its front paws, giving a little room to the handler turning towards it.
      dogTurns: { way: RIGHT, pivot: { x: 0, z: 0.2 }, out: 0.15 },
      caption: 'turnTowardsEachOther',
    },
    leaveRight('ahead'),
  ],
}

export const R2_209: Exercise = {
  code: '2-209',
  steps: [
    ...stopSit(),
    { dog: 'stand', caption: 'standUp' },
    { wait: 1, caption: 'standHold' },
    leave(),
  ],
}

/**
 * 3-306 Zastavení – 3 kroky vzad – vpřed (p. 53): "pes zůstane stát u nohy psovoda, aniž by
 * si předtím sedl. Tým provede 3 zřetelné kroky vzad, pes po celou dobu následuje psovoda,
 * přičemž si nesmí sedat nebo jít stranou. Následně jde tým vpřed k dalšímu cviku."
 */
export const R3_306: Exercise = {
  code: '3-306',
  steps: [
    ...stopStand(),
    { footwork: stepsBack(3), caption: 'threeStepsBackHeel' },
    { wait: 0.6, caption: 'standHold' },
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

/**
 * 2-208 Pes okolo psovoda v pohybu (p. 41): "Psovod zahájí cvik v místě pro vykonání cviku
 * tím, že velí psovi, aby jej za pohybu zepředu oběhl." `DOG_WALKING_AROUND`, over enough of
 * the walk that the dog always goes forward over the ground.
 */
export const R2_208: Exercise = {
  code: '2-208',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: 3, pace: 'slow', dogChanges: 'around', caption: 'dogAroundWalking' },
    leave(),
  ],
}

/**
 * 2-219 Pes otočka vně od psovoda – za pohybu (p. 45): "psovod velí psovi povel pro provedení
 * otočky vně od psovoda. Po dokončení otočky se pes vrací k noze. Cvik se provádí za
 * nepřerušované chůze." The dog turns once round to the left where it is, the handler
 * walking on, then catches up into heel (`exercise.ts`).
 */
export const R2_219: Exercise = {
  code: '2-219',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: 3.5, dogChanges: 'spin', caption: 'dogSpinOut' },
    leave(),
  ],
}

/**
 * 2-228 Stop – 1 krok vzad – stop (p. 48): "Tým zastaví … a zaujímá základní pozici. Psovod
 * udělá krok vzad a pes jej couváním následuje. Poté tým opět zaujímá základní pozici."
 */
export const R2_228: Exercise = {
  code: '2-228',
  steps: [
    ...stopSit(),
    { footwork: stepsBack(1), caption: 'oneStepBackHeel' },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
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

/**
 * 3-315 Pes otočka od psovoda – psovod otočka od psa (p. 57): "psovod velí psovi povel pro
 * provedení otočky vně od psovoda a současně psovod vykonává otočku směrem od psa. Po
 * dokončení otoček se tým střetává v pozici u nohy a pokračují k další kartě. Cvik se
 * provádí za nepřerušované chůze." The handler walks a small circle round to the right, the
 * dog turns once round to the left where it is; they meet back at heel and walk on.
 */
export const R3_315: Exercise = {
  code: '3-315',
  // Round to the right in the back left of the space, clear of the card.
  stopAt: { x: 0.15, z: -0.3 },
  steps: [
    { walk: 3.5, caption: 'approach' },
    {
      turn: 360,
      radius: 0.25,
      dogTurns: { way: LEFT, pivot: { x: 0, z: 0 }, degrees: 360, seconds: 4 },
      caption: 'bothSpinOut',
    },
    leave(),
  ],
}

/**
 * 3-325 / 3-326 Výměna při obratu o 180° vpravo / vlevo (p. 61): "Tým se před kartou otočí o
 * 180° doprava a poté pokračují v opačném směru. Pes změní pozici vedení." Both turn the
 * same way, the handler on the spot, the dog round its front paws — so it ends at the
 * handler's other leg.
 */
const turnAboutChange = (code: string, sign: 1 | -1): Exercise => ({
  code,
  card: 'ahead',
  steps: [
    { walk: 3.5, caption: 'approachTurn' },
    {
      turn: sign === RIGHT ? 180 : -180,
      radius: 0,
      // Turning right, towards the handler, round its front paws, its rear swinging out;
      // turning left, away from them, round its middle while it moves out sideways, so its
      // rear keeps off the handler turning towards it — never stepping back.
      dogTurns:
        sign === RIGHT
          ? { way: sign, pivot: { x: 0, z: 0.2 } }
          : { way: sign, pivot: { x: 0, z: 0 }, out: 0.35 },
      caption: sign === RIGHT ? 'turnAboutChangeRight' : 'turnAboutChangeLeft',
    },
    leaveRight('ahead'),
  ],
})
export const R3_325 = turnAboutChange('3-325', RIGHT)
export const R3_326 = turnAboutChange('3-326', LEFT)

/**
 * 3-327 Výměna strany před psovodem – za pohybu (p. 61): "pes před psovodem změní stranu a na
 * druhé straně zaujme pozici u nohy. Pes pozici změní tak, že běží diagonálně před
 * psovodem … Nesmí běhat v kruhu" — `DOG_WALKING_IN_FRONT`.
 */
export const R3_327: Exercise = {
  code: '3-327',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: 3, dogChanges: 'inFront', caption: 'changeInFrontWalking' },
    leaveRight(),
  ],
}

/** The RO1–RO3 exercises, in card order (with a D0 card, once per supplementary card). */
export const HIGHER_EXERCISES: Exercise[] = [
  R1_101,
  R1_102,
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
  ...R1_114,
  ...R1_115,
  R1_116,
  R1_117,
  R1_118,
  R1_119,
  R1_120,
  R1_121,
  R1_122,
  R1_123,
  R1_124,
  R1_125,
  R2_201,
  R2_202,
  R2_203,
  R2_204,
  R2_205,
  R2_206,
  R2_207,
  R2_208,
  R2_209,
  R2_210,
  R2_220,
  R2_219,
  ...R2_221,
  ...R2_222,
  R2_223,
  R2_224,
  R2_225,
  R2_226,
  R2_227,
  R2_228,
  R2_229,
  R2_232,
  R3_303,
  R3_304,
  R3_305,
  R3_306,
  R3_315,
  R3_316,
  R3_317,
  R3_318,
  R3_325,
  R3_326,
  R3_327,
]
