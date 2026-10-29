import { RIGHT_SIDE_CARDS } from './animated'
import type { Exercise } from './exercise'
import { JUMP_EXERCISES } from './jump-exercises'
import { LEAVE_EXERCISES } from './leave-exercises'
import { HIGHER_EXERCISES, LEFT, RIGHT, turnAboutChange } from './ro123-exercises'
import {
  ROZ_EXERCISES,
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
 * Walking round the dog (Z-004, Z-005) the handler goes out past the dog's far side — on the
 * right, towards the card: stopping further left and back in the square, the way round
 * passes in front of the card.
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
const STEP_LATER = new Set(['Z-018', 'Z-026', '1-123', '3-327'])

const fromTheRight = (e: Exercise): Exercise => {
  const own = OWN_WAY[e.code] ?? e
  const card = own.cardAt ? null : (own.card ?? 'side')
  const goesRound = own.steps.some((step) => 'around' in step)
  const room =
    card === 'side' ? (goesRound ? ROOM_TO_GO_ROUND : ROOM_BY_THE_CARD) : card && ROOM_AHEAD
  const stop = own.stopAt ?? { x: 0, z: 0 }
  const [first, ...rest] = own.steps
  return {
    ...own,
    dogStarts: 'right',
    ...(room && { stopAt: { x: stop.x + room.x, z: stop.z + room.z } }),
    steps:
      first && 'walk' in first && STEP_LATER.has(e.code)
        ? [{ ...first, walk: first.walk + A_STEP_LATER }, ...rest]
        : own.steps,
  }
}

/** The exercises of `RIGHT_SIDE_CARDS` with the dog starting at the right leg, in card order. */
export const RIGHT_EXERCISES: Exercise[] = EXERCISES.filter((e) =>
  RIGHT_SIDE_CARDS.includes(e.code),
).map(fromTheRight)
