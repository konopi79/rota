import { RIGHT_SIDE_CARDS, rightSideCards } from './animated'
import type { Exercise } from './exercise'
import { JUMP_EXERCISES, R3_313_RIGHT } from './jump-exercises'
import {
  FOLLOW_UP_PARTS,
  LEAVE_EXERCISES,
  LEAVE_PARTS,
  pair,
  stayTurnStepRecall,
} from './leave-exercises'
import {
  HIGHER_EXERCISES,
  higherExercises2027,
  LEFT,
  RIGHT,
  turnAboutChange,
} from './ro123-exercises'
import {
  ROZ_EXERCISES,
  ROZ_EXERCISES_2027,
  circleSpiralExercise,
  eightExercise,
  slalomExercise,
  spiralExercise,
} from './roz-exercises'

/** Card order: RO-Z first, then by number (a stable sort keeps each card's variants in order). */
const cardOrder = (code: string) => code.replace('Z-', '0-')

/** Every exercise the animations can play, in card order. */
export const EXERCISES: Exercise[] = [
  ...ROZ_EXERCISES,
  ...HIGHER_EXERCISES,
  ...LEAVE_EXERCISES,
  ...JUMP_EXERCISES,
].sort((a, b) => cardOrder(a.code).localeCompare(cardOrder(b.code)))

export { RIGHT_SIDE_CARDS } from './animated'

/**
 * Where the dog on the right changes more than the way it goes round the handler: round
 * cones and bowls the handler keeps the distance the dog's side of each bend needs, and 3-325
 * / 3-326 turn the dog on the other side of the handler.
 */
const OWN_WAY: Record<string, Exercise> = {
  'Z-018': spiralExercise('Z-018', false, true),
  'Z-019': spiralExercise('Z-019', true, true),
  'Z-020': slalomExercise('Z-020', false, false, true),
  'Z-021': slalomExercise('Z-021', true, false, true),
  'Z-022': eightExercise('Z-022', true),
  'Z-026': circleSpiralExercise('Z-026', false, true),
  'Z-027': circleSpiralExercise('Z-027', true, true),
  '1-111': slalomExercise('1-111', false, true, true),
  '1-117': eightExercise('1-117', true),
  '2-220': slalomExercise('2-220', true, true, true),
  '2-230': stayTurnStepRecall('2-230', RIGHT, true),
  '2-231': stayTurnStepRecall('2-231', LEFT, true),
  '3-313': R3_313_RIGHT,
  '3-325': turnAboutChange('3-325', RIGHT, true),
  '3-326': turnAboutChange('3-326', LEFT, true),
}

/**
 * With the dog on the right a card standing right of the team (§5.3.1: the exercise starts
 * "vlevo před kartou") is on the dog's side: the handler stops this much further left in the
 * square, metres, so the dog has room by the card ("Rozhodující zde jsou nohy psovoda").
 */
const ROOM_BY_THE_CARD = { x: 0.25, z: 0 }
/**
 * Walking round the dog (Z-004, Z-005; FCI 208, 317, 318, 419) the handler goes out past the
 * dog's far side — on the right, towards the card: stopping further left and back in the
 * square, the way round passes in front of the card.
 */
const ROOM_TO_GO_ROUND = { x: 0.55, z: -0.4 }

/**
 * A card ahead (a change of direction): this much further off, metres — a dog going round
 * the outside of a turn passes it as close as from the left, a hair's breadth either way.
 */
const ROOM_AHEAD = { x: 0, z: -0.05 }
/**
 * The handler steps off with the same foot either way, so from the right the feet fall
 * differently as the dog goes its ways — where it then came into a foot (1-123 and 3-327 by
 * 7 cm, the spirals Z-018 and Z-026 by a centimetre), the way up is this much longer, metres:
 * the feet then fall as in the mirror image of the exercise from the left.
 */
const A_STEP_LATER = 0.4
/**
 * More room by the card than `ROOM_BY_THE_CARD` / `ROOM_AHEAD`, metres. 2-219's dog spins out
 * away from the handler — on the right, towards the card — and comes back into heel wide of
 * them: the spin starts at the back of the square before the card and a little further left.
 * After 2-229's step left the team passes the card on its right, the dog's side now: the
 * handler starts further left in the square, their feet still in it.
 */
const MORE_ROOM: Record<string, { x: number; z: number }> = {
  '2-219': { x: 0.3, z: -1.2 },
  '2-229': { x: 0.35, z: 0 },
}
const STEP_LATER = new Set(['Z-018', 'Z-026', '1-123', '3-327'])

/**
 * The exercise with the dog starting at the right leg: its own way where it has one, room by
 * the card on the dog's side, a jump (and its marks) on the dog's side. FCI's own scripts too
 * (`fci-exercises.ts`).
 */
export const fromTheRight = (e: Exercise): Exercise => {
  const own = OWN_WAY[e.code] ?? e
  const card = own.cardAt ? null : (own.card ?? 'side')
  // (Back to a dog left in front, D0e, is no way round a dog at heel.)
  const goesRound = own.steps.some(
    (step) => 'around' in step || ('roundLeftDog' in step && !step.beside),
  )
  const room =
    card === 'side' ? (goesRound ? ROOM_TO_GO_ROUND : ROOM_BY_THE_CARD) : card && ROOM_AHEAD
  const more = MORE_ROOM[e.code] ?? { x: 0, z: 0 }
  const stop = { x: (own.stopAt?.x ?? 0) + more.x, z: (own.stopAt?.z ?? 0) + more.z }
  const [first, ...rest] = own.steps
  // A jump stands on the dog's side (the dog goes over it beside the handler), so on the
  // right, as do the marks drawn by it (3-313's line) — as the course plan has them.
  const mirrored = <T extends { x: number }>(p: T): T => ({ ...p, x: -p.x })
  return {
    ...own,
    dogStarts: 'right',
    ...(own.jumps && { jumps: own.jumps.map(mirrored) }),
    ...(own.marks && { marks: own.marks.map(mirrored) }),
    stopAt: { x: stop.x + (room ? room.x : 0), z: stop.z + (room ? room.z : 0) },
    steps:
      first && 'walk' in first && STEP_LATER.has(e.code)
        ? [{ ...first, walk: first.walk + A_STEP_LATER }, ...rest]
        : own.steps,
  }
}

/**
 * A leave card and its follow-up with the dog on the right: each part from the right, and the
 * way between them on the other side where it goes aside.
 */
const pairFromTheRight = (e: Exercise): Exercise => {
  const [leave, followUp] = e.parts!.map((p) => fromTheRight(p.exercise)) as [Exercise, Exercise]
  return pair(e.code, leave, followUp, true)
}

/** The exercises of `RIGHT_SIDE_CARDS` with the dog starting at the right leg, in card order. */
export const RIGHT_EXERCISES: Exercise[] = EXERCISES.filter((e) =>
  RIGHT_SIDE_CARDS.includes(e.code),
).map((e) => (e.parts ? pairFromTheRight(e) : fromTheRight(e)))

/** The leave cards' and the follow-ups' parts with the dog on the right (a course walked through). */
export const RIGHT_PARTS: Exercise[] = [...LEAVE_PARTS, ...FOLLOW_UP_PARTS].map(fromTheRight)

// ——— 2027 (plan R22b) ———

/** The exercises the 2027 regulation does differently, in card order. */
export const EXERCISES_2027: Exercise[] = [
  ...ROZ_EXERCISES_2027,
  ...higherExercises2027('left'),
].sort((a, b) => cardOrder(a.code).localeCompare(cardOrder(b.code)))
const OWN_2027 = new Set(EXERCISES_2027.map((e) => e.code))

/**
 * Captions that state a 2026 rule, and what 2027 says instead: 180° "auf einem DIN A 4 Blatt"
 * (VDH 2027, S. 17), not "max. 4 kroky nohou".
 */
const CAPTIONS_2027: Record<string, string> = {
  turnRight180OnSpot: 'turnRight180OnA4',
  turnLeft180OnSpot: 'turnLeft180OnA4',
}

const in2027 = (e: Exercise): Exercise => ({
  ...e,
  steps: e.steps.map((step) =>
    CAPTIONS_2027[step.caption] ? { ...step, caption: CAPTIONS_2027[step.caption]! } : step,
  ),
  ...(e.parts && { parts: e.parts.map((p) => ({ ...p, exercise: in2027(p.exercise) })) }),
})

/**
 * D0e "Zurück zum Hund" (VDH 2027, S. 29): "Nach Vollendung der Frontposition signalisiert der HF
 * dem Hund zu bleiben. Der HF begibt sich neben seinen Hund auf die ursprüngliche Fußseite …
 * Kein Seitenwechsel … Das Team nimmt die Grundstellung ein und bewegt sich anschließend in die
 * neue Richtung" — each exercise into the front as with D0a, its finish replaced: the dog left
 * there, the handler round it behind it and up beside it, on the other way (`roundLeftDog.beside`).
 */
const withD0e = (e: Exercise): Exercise | null => {
  const finish = e.steps.findLastIndex(
    (step) => 'dogPath' in step && (step.dogPath === 'aroundHandler' || step.dogPath === 'toHeel'),
  )
  // (3-323's dog comes into the front on the run, too near the handler's way round it: not yet.)
  if (finish < 0 || e.parts || e.code === '3-323') return null
  return {
    ...e,
    supplementary: 'D0e',
    steps: [
      ...e.steps.slice(0, finish),
      // "Das Team nimmt die Grundstellung ein": a dog lying or standing in front sits up first.
      { dog: 'sit', caption: 'frontSit' },
      { dogStays: true, caption: 'frontHold' },
      {
        roundLeftDog: true,
        beside: 'left',
        way: e.card === 'ahead' ? 'front' : 'behind',
        caption: 'backToDogFront',
      },
      { walk: 3, caption: 'leaveTurn' },
    ],
  }
}

/**
 * The exercises into the front with D0e (2027), from the left leg — not played yet (R22b): from
 * right in front of the dog the way round it still goes too near its head or loops, so they are
 * left out of `EXERCISES_IN_2027` until it is worked out (`D0E_ANIMATED` empty).
 */
export const D0E_EXERCISES: Exercise[] = EXERCISES.filter((e) => e.supplementary === 'D0a')
  .map(withD0e)
  .filter((e): e is Exercise => e !== null)

/** Every exercise of the 2027 regulation: its own, and the 2026 ones it does the same way. */
export const EXERCISES_IN_2027: Exercise[] = [
  ...EXERCISES.filter((e) => !OWN_2027.has(e.code)).map(in2027),
  ...EXERCISES_2027,
].sort((a, b) => cardOrder(a.code).localeCompare(cardOrder(b.code)))

/** …with the dog starting at the right leg. */
export const RIGHT_EXERCISES_IN_2027: Exercise[] = [
  ...RIGHT_EXERCISES.filter((e) => !OWN_2027.has(e.code)).map(in2027),
  // (The turns' footwork depends on the dog's side: built for the dog at the right leg.)
  ...[...ROZ_EXERCISES_2027, ...higherExercises2027('right')]
    .filter((e) => rightSideCards('CZ-2027').includes(e.code))
    .map(fromTheRight),
].sort((a, b) => cardOrder(a.code).localeCompare(cardOrder(b.code)))

/** The exercises of an animation set, with the dog at the left leg or the right one. */
export const exercisesOf = (set: 'CZ' | 'CZ-2027', right: boolean): Exercise[] =>
  set === 'CZ-2027'
    ? right
      ? RIGHT_EXERCISES_IN_2027
      : EXERCISES_IN_2027
    : right
      ? RIGHT_EXERCISES
      : EXERCISES
