import { describe, expect, test } from 'bun:test'

import { dealDeck, getClass, type ClassId } from '@rota/content'

import { DOG } from '../figures/dog'
import { cardFootprint, ExercisePlayer, offStand, tailTip, type Pose } from '../figures/exercise'
import { acrossBar, alongBar, BAR_HEIGHT, JUMP_WIDTH } from '../figures/leap'
import { apply } from '../figures/math'
import { jointFrames, lowestPoint } from '../figures/rig'
import { canWalkThrough, walkthroughOf } from '../figures/walkthrough'
import { onField } from '../figures/team'

/** The dog's parts that reach out furthest (as in figures.test.ts). */
const DOG_REACH = ['head', 'leftFrontPaw', 'rightFrontPaw', 'leftHindPaw', 'rightHindPaw']

/**
 * Out of the walk into steps the steps begin where the foot lands, as in the card's animation —
 * up to this far before or past the station, metres (302 / 402 from the left before, from the
 * right and 312 past).
 */
const WALKS_ON_TO_THE_FOOT = 0.6

/**
 * A dealt course, the start "R" every third one — with several cards at one station (CNDC), on
 * the class's larger field (`big`, FCI's 20 × 30 m).
 */
const courseOf = (classId: ClassId, seed: number, cndc = false, big = false) => {
  const cls = getClass(classId)!
  const deck = dealDeck({
    classId,
    scope: 'all',
    count: cls.course.maxCards,
    equipment: ['cones', 'bowls', 'jump'],
    startSide: seed % 3 ? 'left' : 'right',
    competition: true,
    seed,
    cndc,
    ...(big && { field: cls.course.fields!.at(-1)! }),
  })
  return { cls, deck }
}

/** The lowest the dog comes over a jump's bar (`Infinity` if it is not over it now), metres. */
function overBar(
  frame: { team: Pose; dog: { x: number; z: number; heading: number; pose: never; lift?: number } },
  bar: Pose,
) {
  const dog = onField(frame.team, frame.dog)
  if (Math.abs(alongBar(bar, dog)) > 1 || Math.abs(acrossBar(bar, dog)) > JUMP_WIDTH / 2 + 0.5)
    return Infinity
  const up = -lowestPoint(DOG, frame.dog.pose) + (frame.dog.lift ?? 0)
  const [c, s] = [Math.cos(dog.heading), Math.sin(dog.heading)]
  let lowest = Infinity
  for (const { joint, position, rotation } of jointFrames(DOG, frame.dog.pose).values())
    for (const box of joint.boxes) {
      const corners = [-1, 1].flatMap((sx) =>
        [-1, 1].flatMap((sy) =>
          [-1, 1].map((sz) => {
            const p = apply(rotation, [
              box.at[0] + (sx * box.size[0]) / 2,
              box.at[1] + (sy * box.size[1]) / 2,
              box.at[2] + (sz * box.size[2]) / 2,
            ])
            const [lx, lz] = [position[0] + p[0], position[2] + p[2]]
            const at = { x: dog.x + c * lx + s * lz, z: dog.z - s * lx + c * lz }
            return {
              along: alongBar(bar, at),
              across: acrossBar(bar, at),
              y: position[1] + p[1] + up,
            }
          }),
        ),
      )
      // A box over the bar: its corners either side of it, within its width.
      const along = corners.map((p) => p.along)
      if (Math.min(...along) > 0.015 || Math.max(...along) < -0.015) continue
      if (corners.every((p) => Math.abs(p.across) > JUMP_WIDTH / 2)) continue
      lowest = Math.min(lowest, ...corners.map((p) => p.y))
    }
  return lowest
}

/** The first `n` courses of a class that can be walked through (some need a card not animated yet on the right). */
const walkable = (classId: ClassId, n: number, cndc = false, big = false) => {
  const seeds: number[] = []
  for (let seed = 0; seeds.length < n && seed < 30; seed++)
    if (canWalkThrough(courseOf(classId, seed, cndc, big).deck)) seeds.push(seed)
  return seeds
}

describe('a course walked through in animation (R16, R17, R19)', () => {
  const courses = [
    ...(['RO-Z', 'RO1', 'RO2', 'RO3', 'RO-V'] as const).flatMap((classId) =>
      walkable(classId, classId === 'RO3' ? 3 : 4).map(
        (seed) => [`${classId} seed ${seed}`, classId, seed, false, false] as const,
      ),
    ),
    // 2027's (R22b), every class, those with no D0e dealt (not animated yet).
    ...(['RO-Z-2027', 'RO1-2027', 'RO2-2027', 'RO3-2027', 'RO-V-2027'] as const).flatMap(
      (classId) =>
        walkable(classId, 3).map(
          (seed) => [`${classId} seed ${seed}`, classId, seed, false, false] as const,
        ),
    ),
    // FCI's (R19), the start "R" every third one, on both fields.
    ...walkable('FCI-ROB', 8).map(
      (seed) => [`FCI-ROB seed ${seed}`, 'FCI-ROB' as const, seed, false, false] as const,
    ),
    ...walkable('FCI-ROB', 3, false, true).map(
      (seed) =>
        [`FCI-ROB seed ${seed} on 20 × 30 m`, 'FCI-ROB' as const, seed, false, true] as const,
    ),
    // Several cards at one station (CNDC, R18).
    ...(['RO1', 'RO2', 'RO3', 'RO-V'] as const).flatMap((classId) =>
      walkable(classId, 2, true).map(
        (seed) => [`${classId} seed ${seed} with CNDC`, classId, seed, true, false] as const,
      ),
    ),
  ]

  test.each(courses)(
    '%s: goes card by card to the finish',
    (_, classId, seed, cndc, big) => {
      const { cls, deck } = courseOf(classId, seed, cndc, big)
      expect(canWalkThrough(deck)).toBe(true)
      const w = walkthroughOf(deck, cls)
      // A body's middle off a card's stand by half its width and 5 cm (FCI's card is smaller).
      const clear = cardFootprint({ ...(cls.ruleset === 'FCI' && { ruleset: 'FCI' }) }).half + 0.05
      const player = new ExercisePlayer(w.exercise)
      let frame = player.step(0)
      let frames = 0
      // The nearest the team comes to each station over two seconds from getting there.
      const nearest = w.stations.map(() => Infinity)
      const bars = w.stations.flatMap((s) => s.jumps)
      const uprights = bars.flatMap((j) =>
        [-1, 1].map((end) => onField(j, { x: (end * JUMP_WIDTH) / 2, z: 0, heading: 0 })),
      )
      // The lowest the dog comes over each bar.
      const cleared = bars.map(() => Infinity)
      let watching: { i: number; until: number } | null = null
      let next = 0
      for (; !frame.finished && frames < 60 * 600; frames++) {
        frame = player.step(1 / 60)
        // Station i's exercise starts with the step after the way there.
        const s = w.stations[next]
        if (s && frame.scriptStep >= s.exerciseStep) {
          watching = { i: next, until: frames + 120 }
          next++
        }
        if (watching) {
          // (Along the way only across it, a step before or past it: `WALKS_ON_TO_THE_FOOT`.)
          const at = w.stations[watching.i]!.at
          const [dx, dz] = [frame.team.x - at.x, frame.team.z - at.z]
          const ahead = dx * Math.sin(at.heading) + dz * Math.cos(at.heading)
          const across = dx * Math.cos(at.heading) - dz * Math.sin(at.heading)
          const miss =
            Math.abs(ahead) < WALKS_ON_TO_THE_FOOT ? Math.abs(across) : Math.hypot(dx, dz)
          nearest[watching.i] = Math.min(nearest[watching.i]!, miss)
          if (frames >= watching.until) watching = null
        }
        // Nobody through a card's stand (the start and finish too), a cone or a bowl.
        const bodies = [onField(frame.team, frame.handler), onField(frame.team, frame.dog)]
        for (const b of bodies)
          for (const q of [w.startCard, w.finishCard, ...(w.startMark ? [w.startMark] : [])])
            expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(clear)
        // Nobody into a jump's uprights; the dog over each bar, clear of it.
        for (const b of bodies)
          for (const q of uprights) expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(0.25)
        bars.forEach((bar, i) => {
          cleared[i] = Math.min(cleared[i]!, overBar(frame as never, bar))
        })
        // …nor the dog's tail through one (carried up over it, `tailUp`).
        const tip = tailTip(frame.team, frame.dog as never)
        for (const q of w.exercise.stands ?? [])
          expect(offStand(tip, q, q.heading, cardFootprint(w.exercise))).toBeGreaterThan(0.005)
        // …nor its head and paws (312's dog went under the handler into its card: the long
        // stride ended short of where the animation has it) — a centimetre off, where the
        // card's own animation keeps two (the ways between the cards join it a little aside:
        // 418's dog, 2.5 cm off its card alone, came 1.6 cm off).
        const dog = bodies[1]!
        const joints = jointFrames(DOG, frame.dog.pose)
        for (const joint of DOG_REACH) {
          const [x, , z] = joints.get(joint)!.position
          const at = { ...onField(dog, { x, z, heading: 0 }), y: 0 }
          for (const q of w.exercise.stands ?? [])
            expect(offStand(at, q, q.heading, cardFootprint(w.exercise))).toBeGreaterThan(0.01)
        }
        for (const st of w.stations) {
          const stands = [st.card, ...(st.d0 ? [st.d0] : [])]
          for (const b of bodies) {
            for (const q of stands) expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(clear)
            for (const q of [...st.cones, ...st.bowls])
              expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(0.2)
          }
        }
      }
      expect(frame.finished).toBe(true)
      expect(next).toBe(deck.entries.length)
      for (const low of cleared) expect(low).toBeGreaterThan(BAR_HEIGHT + 0.02)
      for (const low of cleared) expect(low).toBeLessThan(Infinity)
      // Within a short step: steps out of the walk on a set foot (1-102) start where it lands. A
      // card at the station of the one before (CNDC) starts where that exercise really ends —
      // as near the plan as its geometry is to the animation (a turning team: 0.7 m).
      for (const [i, miss] of nearest.entries()) {
        const near = w.stations[i]!.withPrevious ? 0.7 : 0.15
        expect([i, miss < near]).toEqual([i, true])
      }
    },
    60_000,
  )

  test('starting at a card, the team sets off just before it', () => {
    const { cls, deck } = courseOf('RO1', 1)
    const w = walkthroughOf(deck, cls, 5)
    expect(w.stations.map((s) => s.index)).toEqual(deck.entries.slice(5).map((_, i) => i + 5))
    const first = w.stations[0]!.at
    expect(Math.hypot(first.x, first.z)).toBeCloseTo(3, 0)
  })

  test('a card that follows a leave card starts with the leave card', () => {
    for (let seed = 0; seed < 30; seed++) {
      const { cls, deck } = courseOf('RO2', seed)
      const i = deck.entries.findIndex((e) => e.code === '2-213' || e.code === '2-216')
      if (i < 0 || !canWalkThrough(deck)) continue
      expect(walkthroughOf(deck, cls, i).from).toBe(i - 1)
      return
    }
    throw new Error('no RO2 course with a follow-up')
  })

  test('courses with a card not animated on the side of the dog cannot be walked through', () => {
    const { deck } = courseOf('RO3', 1)
    expect(canWalkThrough(deck)).toBe(true)
    // 3-324 is not animated with the dog on the right (only a training deck deals it there).
    const entries = deck.entries.map((e, i) =>
      i ? e : { ...e, code: '3-324', side: 'right' as const },
    )
    expect(canWalkThrough({ ...deck, entries })).toBe(false)
  })
})
