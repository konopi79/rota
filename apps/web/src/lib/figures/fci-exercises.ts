import type { Exercise, ExerciseStep } from './exercise'
import { EXERCISES } from './exercises'
import { LEFT, RIGHT, stepAside, stopForSideStep } from './ro123-exercises'
import { stepsBack, stepsForward, turnOnTheSpot, turnSteps } from './roz-exercises'

/**
 * FCI exercises (plan R19), from the national ones where the FCI rules describe the same
 * exercise (Zkušební řád & Směrnice pro Mezinárodní soutěže FCI Rally Obedience, the Czech
 * translation valid from 1 Feb 2025, §5): only the card, its place and its exercise space are
 * FCI's (`ruleset`, §4.3). Where FCI says otherwise — 1–2 m between two turns about, a sit
 * before the stand — the script is put together here from the same building blocks.
 */

/** A national exercise, or its variant (a D0 card, the pace before). */
const national = (code: string, variant?: string): Exercise => {
  const all = EXERCISES.filter((e) => e.code === code)
  const found = variant
    ? all.find((e) => e.supplementary === variant || e.fromPace === variant)
    : all[0]
  if (!found) throw new Error(`No national exercise ${code} ${variant ?? ''}`)
  return found
}

/**
 * The FCI card `code` played as the national exercise `from`: no D0 card (an FCI card says
 * how the dog finishes), the FCI card and space.
 */
const fci = (code: string, from: Exercise, patch: Partial<Exercise> = {}): Exercise => {
  const { supplementary: _, pairedWith: __, stopAt, ...rest } = from
  const clamp = (v: number) => Math.max(-MOST_OFF, Math.min(MOST_OFF, v))
  return {
    ...rest,
    ...(stopAt && { stopAt: { x: clamp(stopAt.x), z: clamp(stopAt.z) } }),
    code,
    ruleset: 'FCI',
    ...patch,
  }
}

/**
 * A national exercise that stops the handler off the middle of its square (room for the dog in
 * front, round the handler, a side step to come) stops at most this far off it in FCI's smaller
 * square (1 m, §4.3), metres — the shoes still in it.
 */
const MOST_OFF = 0.3

/** FCI card → the national exercise that is the same (variant: its D0 card or pace). */
const SAME: [string, string, string?][] = [
  // 101 Lehni: "Psovod se zastaví a pes ulehá přímo vedle psovoda" — 1-109 Zastavit – lehni.
  ['101', '1-109'],
  ['102', 'Z-002'],
  ['103', 'Z-004'],
  ['104', 'Z-005'],
  // "Tým společně provede těsný obrat o 180°" — within 50 cm (§4.6).
  ['105', 'Z-008'],
  ['106', 'Z-009'],
  // 107 / 108 Smyčka vpravo / vlevo: "Tým společně provede těsný obrat (smyčku) vpravo tak, že
  // překříží původní směr trasy. Úhel obratu (smyčky) musí být mezi 180° a 270°." On the spot as
  // in the FCI video (the author), 225° as the card draws it — Z-028 / Z-029; the way on crosses
  // the way in where the team turned.
  ['107', 'Z-028'],
  ['108', 'Z-029'],
  ['109', 'Z-011'],
  ['110', 'Z-012'],
  ['111', 'Z-013'],
  ['113', 'Z-010'],
  // "Psovod provede na místě obrat vpravo v bok o 90° a zůstane stát" — on an A4 (§4.6).
  ['114', '1-105'],
  ['115', '1-106'],
  ['116', 'Z-015'],
  ['117', 'Z-016'],
  ['118', 'Z-017', 'slow'],
  ['118', 'Z-017', 'fast'],
  // 119 / 120 Spirála vpravo / vlevo: "Tým nejdříve obejde tři kužely po jejich levé straně,
  // následně obejde bližší dva kužely, poté první kužel" — the national spiral's way (its
  // execution diagram), out between the first and the second cone square to the way in, as in
  // the FCI video. The cones 1.5 m apart ("1,5 – 2 m").
  ['119', 'Z-018'],
  ['120', 'Z-019'],
  // "první kužel se vždy nachází po jeho levé straně" — as the national slaloms.
  ['121', 'Z-020'],
  ['122', 'Z-021'],
  ['204', 'Z-003'],
  ['205', '2-209'],
  ['206', '2-210'],
  ['207', '3-304'],
  ['213', '2-205'],
  ['214', '2-206'],
  ['215', '2-203'],
  ['216', '2-204'],
  ['217', '2-201'],
  ['218', '2-202'],
  ['219', '1-107'],
  // 220 Otočka: "pes provede v přímém směru kruhovou otočku ve směru od psovoda" — 2-219.
  ['220', '2-219'],
  ['301', '1-102'],
  ['303', '2-207'],
  ['304', '2-229'],
  // 306: the steps back of 1-108, then "velí psa do přiřazení k levé noze a pes usedá vlevo
  // vedle psovoda" — straight to the left leg, as D0b.
  ['306', '1-108', 'D0b'],
  // "Psovod se zastaví a pes vedle psovoda zůstane v pozici stůj" — without sitting first.
  ['307', '3-316'],
  ['308', '3-317'],
  ['309', '3-318'],
  ['310', '2-232'],
  ['311', '1-123'],
  // "pes i psovod provedou každý zvlášť těsný obrat o 180°" — the dog changes side.
  ['313', '3-325'],
  ['314', '3-326'],
  ['315', '1-124'],
  ['316', '1-125'],
  ['406', '3-327'],
  ['407', '2-208'],
]

/** The 1–2 m the team walks between two turns about (201–203: "Po 1 - 2 m"), metres. */
const BETWEEN_TURNS = 1.5

/** A national exercise with a walk put in after its step `after` (201–203). */
const walkAfter = (e: Exercise, after: number, walk: ExerciseStep): ExerciseStep[] => [
  ...e.steps.slice(0, after + 1),
  walk,
  ...e.steps.slice(after + 1),
]

/** The turn steps of a national exercise: where the walk goes in. */
const turnIndex = (e: Exercise) => e.steps.findIndex((s) => 'turn' in s)

/**
 * 201 2x čelem vzad, pes za psovodem: 1-116's two turns, but "Po 1 - 2 m provede psovod znovu
 * obrat" — 1-116 turns again at once.
 */
const R201 = (() => {
  const from = national('1-116')
  return fci('201', from, {
    steps: walkAfter(from, turnIndex(from), {
      walk: BETWEEN_TURNS,
      caption: 'onBetweenTurns',
    }),
  })
})()

/**
 * 202 / 203 Dvojitý obrat o 180°: 1-121's / 1-122's two turns on the spot, "Po 1 - 2 m" apart —
 * walked at the team's pace instead of 1-121's two steps.
 */
const doubleTurn = (code: string, nationalCode: string): Exercise => {
  const from = national(nationalCode)
  return fci(code, from, {
    steps: from.steps.map((s) =>
      'walk' in s && s.caption === 'twoStepsOn'
        ? { walk: BETWEEN_TURNS, caption: 'onBetweenTurns' }
        : s,
    ),
  })
}

/**
 * 208 Stop, stůj, okolo psa: "Psovod se zastaví a pes si sedá u nohy psovoda. Psovod velí psa do
 * pozice stůj. Zatímco pes zůstává stát, psovod jej obchází zepředu" — 3-303 stops into the
 * stand without sitting, so its own script: sit, stand, then round the standing dog.
 */
/**
 * 112 360° vlevo: "Tým společně provádí těsnou otočku o 360° vlevo", within 50 cm (§4.6) — as 111
 * the other way, the handler turning on the spot and the dog at heel backing and swinging round
 * (Z-012's way to the dog's side). Not 1-101, whose handler walks a circle round the dog (the
 * author: "u 112 rotuje kolem psa a to … neni spravne").
 */
/**
 * 209 / 210 Stop, předsednutí, přiřazení zprava doleva / přímo doleva: "Psovod se zastaví a pes
 * si sedá u nohy psovoda. Následně je pes velen do předsednutí" — Z-014 with D0a / D0b, but the
 * dog sits at heel first (the FCI video, 2026-11-02): nationally it goes on into the front
 * without stopping.
 */
const sitThenFront = (code: string, d0: 'D0a' | 'D0b'): Exercise => {
  const from = national('Z-014', d0)
  const [approach, ...rest] = from.steps
  return fci(code, from, {
    steps: [
      approach!,
      { stop: true, caption: 'stop' },
      { dog: 'sit', caption: 'sit' },
      { wait: 1, caption: 'basePosition' },
      ...rest,
    ],
  })
}

const R112: Exercise = {
  ...turnOnTheSpot('112', -360, 'turnLeft360', 'side'),
  ruleset: 'FCI',
  // Swinging round at heel, the dog's head came over the card's stand: the team turns a little
  // left and back in its square.
  stopAt: { x: 0.2, z: -0.15 },
}

const R208: Exercise = {
  code: '208',
  ruleset: 'FCI',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.8, caption: 'basePosition' },
    { dog: 'stand', caption: 'standUp' },
    { wait: 0.8, caption: 'standHold' },
    { around: 'dog', caption: 'aroundStandingDog' },
    { wait: 1, caption: 'standHold' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Before a card ahead (B) the team turns this much nearer the card than nationally, metres —
 * into the square in front of it (§4.3: no gap between the square and the card), as far as the
 * card stays clear (measured, the tests' limits plus 5 cm, with FCI's smaller card,
 * `cardFootprint`), at most to 0.45 m before it, where the teams of the FCI video turn ("Demo of
 * Signs": the card right at their feet). Turning left the dog keeps inside the turn and the
 * side steps go aside, so most come that near; turning right the dog swings out round the
 * front, over where the card stands, so 105, 113, 114 and 217 stay about a metre off (the dog
 * would have to go round the card, which it does not yet).
 */
const INTO_THE_SQUARE: Record<string, number> = {
  '105': 0.15,
  '106': 0.5,
  '107': 0.4,
  '108': 0.4,
  '109': 0.4,
  '110': 0.4,
  '113': 0.15,
  '114': 0.15,
  '115': 0.6,
  '213': 0.35,
  '214': 0.75,
  '215': 0.35,
  '216': 0.75,
  '217': 0.15,
  '218': 0.6,
  '301': 0.75,
  '303': 0.75,
  '304': 0.75,
  '307': 0.4,
  '308': 0.75,
  '310': 0.75,
  '313': 0.75,
  '314': 0.75,
}

/**
 * 416 Předsednutí, úkrok vlevo, sedni, krok vpravo, sedni: 2-222's steps aside with the dog in
 * front, then "aby se přiřadil k levé noze a zaujal pozici vsedě" — straight, as D0b. Its card's
 * letter is A, left of the card (2-222's place is before it): the handler stops in the square
 * close by the card, 0.5 m left of it and 0.5 m before it, and the team walks away straight on —
 * 2-222 stops further left and back and bends round the cards ahead (the author: "mohli prijit
 * blize ke karte a u odchodu jit hned a celou dobu primo rovne").
 */
const R416 = (() => {
  const from = fci('416', national('2-222', 'D0b'), { card: 'side' })
  const round = from.steps.findIndex((s) => 'course' in s)
  const leaving = from.steps[round]!.caption
  return {
    ...from,
    stopAt: { x: -0.25, z: 0 },
    steps: [...from.steps.slice(0, round), { walk: 3, caption: leaving }],
  }
})()

/** The team arrives and stops, the dog sitting at heel (FCI: "pes si sedá u nohy psovoda"). */
const stopSit = (card: 'side' | 'ahead' = 'side'): ExerciseStep[] => [
  { walk: 3.5, caption: card === 'ahead' ? 'approachTurn' : 'approach' },
  { stop: true, caption: card === 'ahead' ? 'stopAhead' : 'stop' },
  { dog: 'sit', caption: 'sit' },
  { wait: 1, caption: 'basePosition' },
]

/** The team walks on to the next card. */
const leave = (card: 'side' | 'ahead' = 'side'): ExerciseStep => ({
  walk: 3,
  pace: 'normal',
  caption: card === 'ahead' ? 'leaveTurn' : 'leave',
})

/**
 * 305 Stop, 1 krok vzad, sedni, 2 kroky vzad, sedni: "Psovod udělá jeden krok vzad a zastaví se.
 * Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici
 * sedni. Poté psovod udělá dva kroky vzad" — the dog backing at heel as in 2-228.
 */
const R305: Exercise = {
  code: '305',
  ruleset: 'FCI',
  steps: [
    ...stopSit(),
    { footwork: stepsBack(1), caption: 'oneStepBackHeelSit' },
    { dog: 'sit', caption: 'oneStepBackHeelSit' },
    { wait: 1, caption: 'basePosition' },
    { footwork: stepsBack(2), caption: 'twoStepsBackHeelSit' },
    { dog: 'sit', caption: 'twoStepsBackHeelSit' },
    { wait: 1, caption: 'basePosition' },
    leave(),
  ],
}

/**
 * 413 Stop, 1 krok zpět, stůj, 2 kroky zpět, sedni, 3 kroky zpět, lehni: 1-107's steps and
 * positions, backwards — the dog backing at heel ("Pes se pohybuje současně a rovnoběžně s
 * psovodem"), stopping into the position as the handler stops.
 */
const R413: Exercise = {
  code: '413',
  ruleset: 'FCI',
  steps: [
    ...stopSit(),
    { footwork: stepsBack(1), caption: 'oneStepBackHeelStand' },
    { wait: 1, caption: 'standHold' },
    { footwork: stepsBack(2), caption: 'twoStepsBackHeelSit' },
    { dog: 'sit', caption: 'twoStepsBackHeelSit' },
    { wait: 1, caption: 'basePosition' },
    { footwork: stepsBack(3), caption: 'threeStepsBackHeelDown' },
    { dog: 'down', caption: 'threeStepsBackHeelDown' },
    { wait: 1, caption: 'downHold' },
    leave(),
  ],
}

/**
 * Side steps (302, 401–404): 1-102's step straight out and the other foot closing up, once or
 * twice. `walking` (302, 401, 402 "Za stálého pohybu"): out of the walk with no stop — its last
 * step with the foot away from the step, as 1-102 — and walking on; otherwise (403, 404 "Psovod
 * se zastaví … udělá dva úkroky … a zastaví") from the base position, the dog sitting again.
 * The team passes the card on the side away from the step, as 1-102 / 2-207 (FCI says nothing).
 */
const sideSteps = (code: string, sign: 1 | -1, count: 1 | 2, walking: boolean): Exercise => {
  const caption = walking
    ? sign === RIGHT
      ? 'sideStepsWalkingRight'
      : 'sideStepsWalkingLeft'
    : sign === RIGHT
      ? 'sideStepsRight'
      : 'sideStepsLeft'
  const steps: ExerciseStep[] = Array.from({ length: count }, (_, i) => ({
    footwork: stepAside(sign),
    ...(walking && i === 0 && { fromFoot: sign === RIGHT ? (0 as const) : (1 as const) }),
    caption,
  }))
  const on: ExerciseStep = {
    walk: 3,
    pace: 'normal',
    caption: sign === RIGHT ? 'passCardLeft' : 'passCardRight',
  }
  return {
    code,
    ruleset: 'FCI',
    card: 'ahead',
    // Into FCI's square before the card, as 301, 303, 304 (`INTO_THE_SQUARE`) — stepping left
    // out of the walk, the handler walks on towards the card until the step: not as near.
    stopAt: stopForSideStep(sign, walking && sign === LEFT ? 0.3 : SIDE_STEPS_NEARER),
    steps: walking
      ? [{ walk: 3.5, caption: 'approachTurn' }, ...steps, on]
      : [
          ...stopSit('ahead'),
          ...steps,
          { dog: 'sit', caption: 'finishSit' },
          { wait: 1, caption: 'basePosition' },
          on,
        ],
  }
}

/**
 * 414 / 415 Stop, 90° vpravo / vlevo, stůj, … sedni, … lehni: "psovod provede na místě obrat o
 * 90° vpravo a zastaví. Pes jej následuje …, jakmile psovod zastaví, pes zaujímá pozici stůj" —
 * then sedni, then lehni, as the card draws it (the Czech title says "stůj" twice). Each turn in
 * Z-030's three steps; "Nový směr postupu je 90° vlevo od původního směru trasy".
 */
const threeTurns = (code: string, sign: 1 | -1): Exercise => {
  const side = sign === RIGHT ? 'Right' : 'Left'
  return {
    code,
    ruleset: 'FCI',
    card: 'ahead',
    // Into the square before the card, as near it as it stays clear (measured as
    // `INTO_THE_SQUARE`; at the edge of the square they were too far, the author). Turning
    // right the dog, outside, swings round ahead after the first turn — over towards the card:
    // the handler stops right in the square, 0.9 m before it; turning left, 0.7 m.
    stopAt: sign === RIGHT ? { x: -MOST_OFF, z: 0.3 } : { x: 0, z: 0.5 },
    steps: [
      ...stopSit('ahead'),
      { footwork: turnSteps(sign), caption: `turn${side}90Stand` },
      { wait: 1, caption: 'standHold' },
      { footwork: turnSteps(sign), caption: `turn${side}90Sit` },
      { dog: 'sit', caption: `turn${side}90Sit` },
      { wait: 1, caption: 'basePosition' },
      { footwork: turnSteps(sign), caption: `turn${side}90Down` },
      { dog: 'down', caption: `turn${side}90Down` },
      { wait: 1, caption: 'downHold' },
      leave('ahead'),
    ],
  }
}

/**
 * 317 / 318 / 419 Odložení do stoje / lehu / sedu, okolo psa: "Za pohybu je pes velen do pozice
 * stůj, zatímco psovod pokračuje bez zastavení vpřed, obchází psa zepředu, vrací se do výchozí
 * pozice po boku psa a zastaví. Pes zůstává stát, dokud tým nepokračuje vpřed." The dog stops
 * into its position within a body length as on 3-310–3-312 (`dropsDog`), the handler goes on
 * round it (`roundLeftDog`).
 */
const dropAndRound = (code: string, posture: 'stand' | 'down' | 'sit'): Exercise => ({
  code,
  ruleset: 'FCI',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: 0.2, dropsDog: posture, caption: DROP_CAPTION[posture] },
    { roundLeftDog: true, caption: 'roundDogFront' },
    { wait: 0.6, caption: HOLD_CAPTION[posture] },
    leave(),
  ],
})
const DROP_CAPTION = { sit: 'dropSit', down: 'dropDown', stand: 'dropStand' } as const
const HOLD_CAPTION = { sit: 'basePosition', down: 'downHold', stand: 'standHold' } as const

/**
 * 405 Otočka od sebe: "Za stálého pohybu provede tým těsnou otočku o 180° přičemž se (pes i
 * psovod) otáčí směrem od sebe a následně pokračují v opačném směru. Tato karta mění stranu
 * vedení psa." 2-232 the other way round: the handler turns right on the spot, away from the
 * dog, the dog left round its middle, away from the handler, moving a little out — each turns
 * its back on the other and the dog ends at the right leg.
 */
const R405: Exercise = {
  code: '405',
  ruleset: 'FCI',
  card: 'ahead',
  // Into the square before the card as 313 / 314 (`INTO_THE_SQUARE`).
  stopAt: { x: 0, z: 0.75 },
  steps: [
    { walk: 3.5, caption: 'approachTurn' },
    {
      turn: 180,
      radius: 0,
      dogTurns: { way: LEFT, pivot: { x: 0, z: 0 }, out: 0.15 },
      bySide: true,
      caption: 'turnAwayFromEachOther',
    },
    { walk: 3, pace: 'normal', caption: 'leaveTurnRight' },
  ],
}

/**
 * 412 3 kroky vzad: "Za pohybu psovod udělá minimálně tři kroky vzad. Pes jej následuje a
 * pohybuje se současně a rovnoběžně s ním. Jakmile tým dokončí cvik, pokračuje vpřed." 3-306's
 * three steps back with the dog backing at heel — out of the walk, the handler only halting to
 * step back, the dog not sitting.
 */
const R412: Exercise = {
  code: '412',
  ruleset: 'FCI',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'threeStepsBackWalking' },
    // The feet come to rest side by side before stepping back.
    { wait: 0.5, caption: 'threeStepsBackWalking' },
    { footwork: stepsBack(3), caption: 'threeStepsBackWalking' },
    { wait: 0.4, caption: 'threeStepsBackWalking' },
    leave(),
  ],
}

/**
 * 211 / 212 Stop, 1 krok vpřed, 90° vpravo / vlevo v bok, 1 krok, přivolání, stop: "Pes zůstává
 * sedět, zatímco psovod provede 1 krok vpřed, zastaví se, následně provede obrat vpravo v bok o
 * 90° a udělá opět 1 krok vpřed v novém směru a zastaví se. … Následně psovod přivolává psa,
 * který usedá u stejné nohy psovoda jako na začátku cviku." 2-230 / 2-231 with the step forward
 * first — the turn in Z-030's three steps ("Krok … může být proveden buď rovnou nebo se psovod
 * otočí na místě a poté provede 1 krok"); a step ahead, turning left the handler is clear of
 * the dog's head.
 */
const stepTurnStepRecall = (code: string, sign: 1 | -1): Exercise => ({
  code,
  ruleset: 'FCI',
  card: 'ahead',
  // As near the card as it stays clear (measured as `INTO_THE_SQUARE`). After the step towards
  // it and a turn right the dog is called to the left leg — the side towards the card: the
  // handler stops in the right of the square (the dog before the card), 0.9 m before it, and
  // turns away from it. Straight before it they had to stop 1.4 m off, at the edge of the
  // square (the author).
  stopAt: sign === RIGHT ? { x: -0.5, z: 0.3 } : { x: 0, z: 0.2 },
  steps: [
    ...stopSit('ahead'),
    { dogStays: true, caption: 'staySit' },
    { footwork: stepsForward(1), caption: 'oneStepAlone' },
    {
      footwork: turnSteps(sign),
      caption: sign === RIGHT ? 'turnRight90Alone' : 'turnLeft90Alone',
    },
    { footwork: stepsForward(1), caption: 'oneStepAlone' },
    { recall: 'heel', caption: 'recallBase' },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    leave('ahead'),
  ],
})

/**
 * 221 Rušivé vlivy: "Dva kužely jsou umístěny 2,5 - 3 m od sebe. Vzdálenost dalších dvou rušivých
 * prvků je 1,5 - 2 m od sebe. Tým … kolem kuželů provede kompletní figuru 8, přičemž spojnici mezi
 * rušivými prvky překročí celkem 3x." 1-117's figure eight — round the two on its long diagonal
 * (3 m), three times between the two on its short one (1.5 m) — with cones where the team goes
 * round and the distractions (in bowls) where it passes between.
 */
const R221 = (() => {
  const from = fci('221', national('1-117'))
  const [left, right, near, far] = from.bowls!
  return { ...from, cones: [left!, right!], bowls: [near!, far!] }
})()

/** How much nearer the card the side steps begin than nationally, metres (301, 303, 304's). */
const SIDE_STEPS_NEARER = 0.75

/** The national exercise as FCI's card, a little nearer its card where it has to be. */
const same = (code: string, from: string, variant?: string): Exercise => {
  const e = fci(code, national(from, variant))
  const nearer = INTO_THE_SQUARE[code]
  if (!nearer) return e
  const stop = e.stopAt ?? { x: 0, z: 0 }
  return { ...e, stopAt: { x: stop.x, z: stop.z + nearer } }
}

/** The FCI exercises, in card order. */
export const FCI_EXERCISES: Exercise[] = [
  ...SAME.map(([code, from, variant]) => same(code, from, variant)),
  R201,
  doubleTurn('202', '1-121'),
  doubleTurn('203', '1-122'),
  R112,
  R416,
  sitThenFront('209', 'D0a'),
  sitThenFront('210', 'D0b'),
  R208,
  R305,
  R413,
  sideSteps('302', LEFT, 1, true),
  sideSteps('401', RIGHT, 2, true),
  sideSteps('402', LEFT, 2, true),
  sideSteps('403', RIGHT, 2, false),
  sideSteps('404', LEFT, 2, false),
  threeTurns('414', RIGHT),
  threeTurns('415', LEFT),
  dropAndRound('317', 'stand'),
  dropAndRound('318', 'down'),
  dropAndRound('419', 'sit'),
  R405,
  R412,
  stepTurnStepRecall('211', RIGHT),
  stepTurnStepRecall('212', LEFT),
  R221,
].sort((a, b) => a.code.localeCompare(b.code))
