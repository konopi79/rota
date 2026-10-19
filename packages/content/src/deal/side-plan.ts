import type { RoClass } from '../schema'
import type { Side } from './types'

type RightHand = NonNullable<RoClass['course']['rightHand']>

/** Random integer in [min, max]. */
const between = (min: number, max: number, random: () => number) =>
  min + Math.floor(random() * (max - min + 1))

/**
 * Where a national competition course changes the dog's side (`course.rightHand`): the
 * positions (0-based) that must hold a side-change card — every other position must not.
 * The pattern follows the start side: a start "R" changes by card `startBy`; otherwise the
 * course goes to the finish on the right. With a mid-course stretch allowed, a course has
 * either that stretch plus its start or finish one, or (start "R" only) both of those.
 */
export function planSideChanges(
  rule: RightHand,
  count: number,
  startSide: Side,
  random: () => number,
): Set<number> {
  const withStart = startSide === 'right'
  // A start "R" with a mid-course stretch allowed: either that stretch, or the finish too.
  const both = withStart && rule.midLength !== undefined && random() < 0.5
  const withEnd = !withStart || both
  const withMid = rule.midLength !== undefined && !both

  const changes = new Set<number>()
  const start = withStart ? between(0, rule.startBy - 1, random) : -1
  const end = withEnd ? between(count - rule.endWithin, count - 1, random) : count
  if (withStart) changes.add(start)
  if (withEnd) changes.add(end)
  if (withMid) {
    const length = between(0, rule.midLength ?? 0, random)
    // Leave at least one card on the left on both sides of the stretch.
    const from = between(start + 2, end - length - 3, random)
    changes.add(from)
    changes.add(from + length + 1)
  }
  return changes
}
