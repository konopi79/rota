import { describe, expect, test } from 'bun:test'

import { dealDeck, getClass, type ClassId } from '@rota/content'

import { DOG } from '../figures/dog'
import { ExercisePlayer, type Pose } from '../figures/exercise'
import { acrossBar, alongBar, BAR_HEIGHT, JUMP_WIDTH } from '../figures/leap'
import { apply } from '../figures/math'
import { jointFrames, lowestPoint } from '../figures/rig'
import { canWalkThrough, walkthroughOf } from '../figures/walkthrough'
import { onField } from '../figures/team'

/** A dealt course, the start "R" every third one. */
const courseOf = (classId: ClassId, seed: number) => {
  const cls = getClass(classId)!
  const deck = dealDeck({
    classId,
    scope: 'all',
    count: cls.course.maxCards,
    equipment: ['cones', 'bowls', 'jump'],
    startSide: seed % 3 ? 'left' : 'right',
    competition: true,
    seed,
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
const walkable = (classId: ClassId, n: number) => {
  const seeds: number[] = []
  for (let seed = 0; seeds.length < n && seed < 30; seed++)
    if (canWalkThrough(courseOf(classId, seed).deck)) seeds.push(seed)
  return seeds
}

describe('a course walked through in animation (R16, R17)', () => {
  const courses = (['RO-Z', 'RO1', 'RO2', 'RO3', 'RO-V'] as const).flatMap((classId) =>
    walkable(classId, classId === 'RO3' ? 3 : 4).map(
      (seed) => [`${classId} seed ${seed}`, classId, seed] as const,
    ),
  )

  test.each(courses)(
    '%s: goes card by card to the finish',
    (_, classId, seed) => {
      const { cls, deck } = courseOf(classId, seed)
      expect(canWalkThrough(deck)).toBe(true)
      const w = walkthroughOf(deck, cls)
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
          const at = w.stations[watching.i]!.at
          const miss = Math.hypot(frame.team.x - at.x, frame.team.z - at.z)
          nearest[watching.i] = Math.min(nearest[watching.i]!, miss)
          if (frames >= watching.until) watching = null
        }
        // Nobody through a card's stand (the start and finish too), a cone or a bowl.
        const bodies = [onField(frame.team, frame.handler), onField(frame.team, frame.dog)]
        for (const b of bodies)
          for (const q of [w.startCard, w.finishCard, ...(w.startMark ? [w.startMark] : [])])
            expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(0.3)
        // Nobody into a jump's uprights; the dog over each bar, clear of it.
        for (const b of bodies)
          for (const q of uprights) expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(0.25)
        bars.forEach((bar, i) => {
          cleared[i] = Math.min(cleared[i]!, overBar(frame as never, bar))
        })
        for (const st of w.stations) {
          const stands = [st.card, ...(st.d0 ? [st.d0] : [])]
          for (const b of bodies) {
            for (const q of stands) expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(0.3)
            for (const q of [...st.cones, ...st.bowls])
              expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(0.2)
          }
        }
      }
      expect(frame.finished).toBe(true)
      expect(next).toBe(deck.entries.length)
      for (const low of cleared) expect(low).toBeGreaterThan(BAR_HEIGHT + 0.02)
      for (const low of cleared) expect(low).toBeLessThan(Infinity)
      // Within a short step: steps out of the walk on a set foot (1-102) start where it lands.
      for (const [i, miss] of nearest.entries()) expect([i, miss < 0.15]).toEqual([i, true])
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
