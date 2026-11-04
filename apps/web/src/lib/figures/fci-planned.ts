import type { Exercise } from './exercise'

/**
 * An FCI figure round cones (its card set beside them, `cardAt`) with the dog on the right,
 * where the course plan has it (plan R19): the plan keeps a card's cones where they are, from
 * where its exercise is placed, and the handler goes round them on another line than from the
 * left (the dog's side of each bend) — walked through, the team stops so that its cones and
 * card come where the left's do. (`stopAt` moves neither in the card's own animation: they are
 * set from where the team stops.) Any other exercise as it is: the plan places its equipment
 * from where the team stops on the right (`geometry.rightStop`).
 */
export function asPlanned(left: Exercise, right: Exercise): Exercise {
  if (!right.cardAt || !left.cones?.length || !right.cones?.length) return right
  const stopL = left.stopAt ?? { x: 0, z: 0 }
  const [l, r] = [left.cones[0]!, right.cones[0]!]
  return { ...right, stopAt: { x: stopL.x + l.x - r.x, z: stopL.z + l.z - r.z } }
}
