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

type Sides = NonNullable<RoClass['course']['sides']>

/**
 * The right-hand stretches of a course, read off where its side changes are (0-based card
 * positions): each stretch from a change to the right (or a start "R", `from` −1) to the change
 * back (or the finish, `to` = count), and how many exercises it has on the right.
 */
export function stretchesOf(changes: number[], count: number, startSide: Side) {
  const stretches: { from: number; to: number; exercises: number }[] = []
  const at = [...changes]
  let from = startSide === 'right' ? -1 : at.shift()
  while (from !== undefined) {
    const to = at.shift() ?? count
    stretches.push({ from, to, exercises: to - from - 1 })
    from = at.shift()
  }
  return stretches
}

/** What a course's side changes break of `rule` (`course.sides`), none if it keeps it. */
export type SidesBroken =
  'stretch' | 'left-to-right' | 'min-changes' | 'min-right' | 'max-right' | 'ends' | 'back-to-back'

export function sidesBroken(
  rule: Sides,
  changes: number[],
  count: number,
  startSide: Side,
): SidesBroken[] {
  const broken: SidesBroken[] = []
  const stretches = stretchesOf(changes, count, startSide)
  const right = stretches.reduce((sum, s) => sum + s.exercises, 0)
  const toRight = stretches.filter((s) => s.from >= 0).length
  if (rule.stretch !== undefined && stretches.some((s) => s.exercises > rule.stretch!)) {
    broken.push('stretch')
  }
  if (rule.leftToRight !== undefined) {
    const allowed = rule.leftToRight - (startSide === 'right' ? 1 : 0)
    if (toRight > allowed) broken.push('left-to-right')
  }
  if (rule.minChanges !== undefined && changes.length < rule.minChanges) broken.push('min-changes')
  if (rule.minRight !== undefined && right < rule.minRight) broken.push('min-right')
  if (rule.maxRightShare !== undefined && right > Math.floor(count * rule.maxRightShare)) {
    broken.push('max-right')
  }
  if (rule.ends) {
    const end = startSide === 'right' ? 0 : count - 1
    if (changes.length !== 1 || changes[0] !== end) broken.push('ends')
  }
  // A change straight after a change back: no card on the left between two stretches.
  if (changes.some((c, i) => i > 0 && c === changes[i - 1]! + 1 && isBackThenOn(i, startSide))) {
    broken.push('back-to-back')
  }
  return broken
}

/** Whether change `i` turns right again straight after a change back to the left. */
const isBackThenOn = (i: number, startSide: Side) =>
  // Changes alternate: from a start "L" the even ones go right, from a start "R" the odd ones.
  startSide === 'left' ? i % 2 === 0 : i % 2 === 1

/**
 * Where a 2027 national competition course changes the dog's side (`course.sides`): the card
 * positions that must hold a side-change card — every other position must not. Drawn at random
 * until a pattern keeps the rule (a few tries at most for the class sizes of §5).
 */
export function planSides(
  rule: Sides,
  count: number,
  startSide: Side,
  random: () => number,
): Set<number> {
  if (rule.ends) return new Set([startSide === 'right' ? 0 : count - 1])
  const longest = rule.stretch ?? Math.max(1, Math.floor(count * (rule.maxRightShare ?? 1)))
  for (let attempt = 0; attempt < 500; attempt++) {
    const changes: number[] = []
    let at = 0
    if (startSide === 'right') {
      const length = between(0, Math.min(longest, count - 1), random)
      changes.push(length)
      at = length + 2
    }
    let toRight = 0
    const allowed = (rule.leftToRight ?? count) - (startSide === 'right' ? 1 : 0)
    // About one stretch per eight cards, so a course is not mostly side changes.
    while (at < count && toRight < allowed) {
      if (random() < 0.15) {
        const length = between(rule.stretch === 0 ? 0 : 1, longest, random)
        changes.push(at)
        toRight++
        if (at + length + 1 >= count) break // on the right to the finish
        changes.push(at + length + 1)
        at += length + 3
      } else {
        at++
      }
    }
    if (sidesBroken(rule, changes, count, startSide).length === 0) return new Set(changes)
  }
  throw new Error(`No side pattern for ${count} cards keeps ${JSON.stringify(rule)}`)
}
