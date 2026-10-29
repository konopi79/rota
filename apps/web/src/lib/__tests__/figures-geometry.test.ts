import { describe, expect, test } from 'bun:test'

import { geometry as layout, getCard, type Card } from '@rota/content'

import { ExercisePlayer, type Exercise } from '../figures/exercise'
import { EXERCISES } from '../figures/exercises'

/**
 * What an exercise does on the field, read off its script: where the team is when it walks
 * off (the last step) and how far it has turned, from the plan's station — where it stopped
 * after the approach (the first step), less how far off the usual place the script stops it
 * (`stopAt`) — metres ahead and to the left, degrees right.
 */
function measure(exercise: Exercise) {
  const player = new ExercisePlayer(exercise)
  let frame = player.step(0)
  while (!frame.finished && frame.stepIndex < 1) frame = player.step(1 / 60)
  const stop = frame.team
  const last = exercise.steps.length - 1
  while (!frame.finished && frame.stepIndex < last) frame = player.step(1 / 60)
  const end = frame.team
  // The station's frame: the team arrives along +z, +x is its left.
  const [dx, dz] = [end.x - stop.x, end.z - stop.z]
  const [c, s] = [Math.cos(stop.heading), Math.sin(stop.heading)]
  const off = exercise.stopAt ?? { x: 0, z: 0 }
  return {
    left: dx * c - dz * s + off.x,
    ahead: dx * s + dz * c + off.z,
    turn: (-(end.heading - stop.heading) * 180) / Math.PI,
  }
}

const mod360 = (deg: number) => ((Math.round(deg) % 360) + 360) % 360

describe('course plan geometry matches the animations (R14)', () => {
  // Each animated card once (the D0 variants and Z-017's paces share one geometry).
  const exercises = EXERCISES.filter((e, i) => EXERCISES.findIndex((f) => f.code === e.code) === i)

  test('the card before the team for a change of direction or a side step (§5.3.1)', () => {
    for (const e of exercises) {
      const card = getCard('CZ', e.code) as Card
      expect([e.code, card.placement === 'B']).toEqual([e.code, e.card === 'ahead'])
    }
  })

  test('the turn, where the team walks off, and where the card stands', () => {
    for (const e of exercises) {
      const card = getCard('CZ', e.code) as Card
      const g = card.geometry ?? {}
      const { left, ahead, turn } = measure(e)
      const turns = layout.turnsOf(card)
      expect([e.code, mod360(turn)]).toEqual([e.code, mod360(turns[0] ?? 0)])
      // An arc or a step in the new direction moves a turning team a little.
      const near = turns.some((t) => t % 360) ? 0.7 : 0.3
      expect([e.code, Math.abs(ahead - (g.exit ?? 0)) < near]).toEqual([e.code, true])
      expect([e.code, Math.abs(left - (g.exitSide ?? 0)) < near]).toEqual([e.code, true])
      // Where the card stands when not in its usual place (beside a line of cones).
      const own =
        e.cardAt && g.card && Math.hypot(g.card.ahead - e.cardAt.z, g.card.side - e.cardAt.x)
      expect([e.code, !!g.card, (own ?? 0) < 0.1]).toEqual([e.code, !!e.cardAt, true])
    }
  }, 120_000)

  test('the same cones and bowls in the same places', () => {
    const sorted = (props: { kind: string; ahead: number; side: number }[]) =>
      [...props].sort((a, b) => a.ahead - b.ahead || a.side - b.side)
    for (const e of exercises) {
      const card = getCard('CZ', e.code) as Card
      const animated = sorted([
        ...(e.cones ?? []).map((c) => ({ kind: 'cone', ahead: c.z, side: c.x })),
        ...(e.bowls ?? []).map((c) => ({ kind: 'bowl', ahead: c.z, side: c.x })),
      ])
      const planned = sorted(card.geometry?.props ?? [])
      expect([e.code, planned.map((p) => p.kind)]).toEqual([e.code, animated.map((p) => p.kind)])
      planned.forEach((p, i) => {
        const a = animated[i] as (typeof animated)[number]
        const off = Math.hypot(p.ahead - a.ahead, p.side - a.side)
        expect([e.code, i, off < 0.1]).toEqual([e.code, i, true])
      })
    }
  })
})
