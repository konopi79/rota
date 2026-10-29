import { describe, expect, test } from 'bun:test'

import { dealDeck, getClass, type ClassId } from '@rota/content'

import { ExercisePlayer } from '../figures/exercise'
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

describe('a course walked through in animation (R16)', () => {
  const courses = (['RO-Z', 'RO1'] as const).flatMap((classId) =>
    [0, 1, 2, 3].map((seed) => [`${classId} seed ${seed}`, classId, seed] as const),
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
      let watching: { i: number; until: number } | null = null
      let next = 0
      for (; !frame.finished && frames < 60 * 600; frames++) {
        frame = player.step(1 / 60)
        // A way to a card is played as two steps (`walkTo`): station i's exercise starts at
        // step firstStep + i + 2.
        const s = w.stations[next]
        if (s && frame.stepIndex >= s.firstStep + next + 2) {
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

  test('classes with a card not animated cannot be walked through', () => {
    const { deck } = courseOf('RO2', 0)
    expect(canWalkThrough(deck)).toBe(false)
  })
})
