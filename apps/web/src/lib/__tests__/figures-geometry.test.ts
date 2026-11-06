import { describe, expect, test } from 'bun:test'

import { geometry as layout, getCard, type Card } from '@rota/content'

import { ExercisePlayer, type Exercise } from '../figures/exercise'
import { EXERCISES, EXERCISES_2027, RIGHT_EXERCISES } from '../figures/exercises'
import { FCI_EXERCISES, FCI_RIGHT_EXERCISES } from '../figures/fci-exercises'
import { CONE } from '../figures/fci-leave-exercises'

/**
 * What an exercise does on the field, read off its script: where the team is when it walks
 * off (the last step) and how far it has turned, from the plan's station — where it stopped
 * after the approach (the first step), less how far off the usual place the script stops it
 * (`stopAt`) — metres ahead and to the left, degrees right.
 */
function measure(exercise: Exercise) {
  const { own, from, to } = ownPart(exercise)
  const player = new ExercisePlayer(exercise)
  let frame = player.step(0)
  while (!frame.finished && frame.stepIndex < from) frame = player.step(1 / 60)
  const stop = frame.team
  // (A step worked out as it comes — back to the dog — runs as several: the last one is the
  // one with its caption.)
  const last = exercise.steps[to]!.caption
  while (!frame.finished && (frame.stepIndex < to || frame.caption !== last))
    frame = player.step(1 / 60)
  const end = frame.team
  // The station's frame: the team arrives along +z, +x is its left.
  const [dx, dz] = [end.x - stop.x, end.z - stop.z]
  const [c, s] = [Math.cos(stop.heading), Math.sin(stop.heading)]
  const off = own.stopAt ?? { x: 0, z: 0 }
  return {
    left: dx * c - dz * s + off.x,
    ahead: dx * s + dz * c + off.z,
    turn: (-(end.heading - stop.heading) * 180) / Math.PI,
  }
}

/**
 * The card's own exercise, and the steps it runs over: from its stop (the step after the
 * approach) to where the team walks off (the last step). A leave card played with its
 * follow-up (plan R17) walks off as the dog stays; the follow-up stops once the handler is
 * at its card.
 */
function ownPart(exercise: Exercise) {
  const all = { own: exercise, from: 1, to: exercise.steps.length - 1 }
  if (!exercise.parts) return all
  const leaving = exercise.steps.findIndex((s) => 'dogStays' in s || ('walk' in s && s.dropsDog))
  // A way to the next card at a slant (after 3-301) is played as two steps.
  const slant = 'walkTo' in exercise.steps[leaving + 1]! ? 1 : 0
  return exercise.parts[0]!.exercise.code === exercise.code
    ? { own: exercise.parts[0]!.exercise, from: 1, to: leaving + 1 }
    : { ...all, own: exercise.parts[1]!.exercise, from: leaving + 2 + slant }
}

const mod360 = (deg: number) => ((Math.round(deg) % 360) + 360) % 360

describe('course plan geometry matches the animations (R14)', () => {
  // Each animated card once (the D0 variants and Z-017's paces share one geometry).
  const exercises = EXERCISES.filter((e, i) => EXERCISES.findIndex((f) => f.code === e.code) === i)

  test('the card before the team for a change of direction or a side step (§5.3.1)', () => {
    for (const e of exercises) {
      const card = getCard('CZ', e.code) as Card
      const { own } = ownPart(e)
      expect([e.code, card.placement === 'B']).toEqual([e.code, own.card === 'ahead'])
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
      // A follow-up as far on from its leave card as the plan has it, and as far aside.
      const next = e.parts?.[1]
      if (next && next.exercise.code === e.code) {
        expect([e.code, next.at]).toEqual([e.code, g.fromPrevious ?? NaN])
        const asides = g.fromPreviousSides ?? [0]
        expect([e.code, asides.includes(next.aside ?? 0)]).toEqual([e.code, true])
      }
    }
  }, 120_000)

  test('the cards that need room before their card at a CNDC are those stopped further off (R18)', () => {
    // The animation stops the handler at least 30 cm further from the card, the dog working
    // between them (`stopAt`), on either side.
    const roomy = (list: Exercise[]) => [
      ...new Set(list.filter((e) => (e.stopAt?.z ?? 0) <= -0.3).map((e) => e.code)),
    ]
    expect([...layout.ROOM_BEFORE.left].sort()).toEqual(roomy(EXERCISES).sort())
    expect([...layout.ROOM_BEFORE.right].sort()).toEqual(roomy(RIGHT_EXERCISES).sort())
  })

  test('the same cones and bowls in the same places', () => {
    const sorted = (props: { kind: string; ahead: number; side: number }[]) =>
      [...props].sort((a, b) => a.ahead - b.ahead || a.side - b.side)
    for (const e of exercises) {
      const card = getCard('CZ', e.code) as Card
      // (A pair's: the card's own exercise's.)
      const { own } = ownPart(e)
      const animated = sorted([
        ...(own.cones ?? []).map((c) => ({ kind: 'cone', ahead: c.z, side: c.x })),
        ...(own.bowls ?? []).map((c) => ({ kind: 'bowl', ahead: c.z, side: c.x })),
        ...(own.jumps ?? []).map((c) => ({ kind: 'jump', ahead: c.z, side: c.x })),
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

describe('2027 course plan geometry matches the animations (R22b)', () => {
  // Each card 2027 animates its own way, once (2026's cards keep their geometry, checked above).
  const exercises = EXERCISES_2027.filter(
    (e, i) => EXERCISES_2027.findIndex((f) => f.code === e.code) === i,
  )

  test('the card before the team for a change of direction or a side step (§3.6)', () => {
    for (const e of exercises) {
      const card = getCard('CZ-2027', e.code) as Card
      const { own } = ownPart(e)
      expect([e.code, card.placement === 'B']).toEqual([e.code, own.card === 'ahead'])
    }
  })

  test('the turn, where the team walks off, and where the card stands', () => {
    for (const e of exercises) {
      const card = getCard('CZ-2027', e.code) as Card
      const g = card.geometry ?? {}
      const { left, ahead, turn } = measure(e)
      const turns = layout.turnsOf(card)
      expect([e.code, mod360(turn)]).toEqual([e.code, mod360(turns[0] ?? 0)])
      const near = turns.some((t) => t % 360) ? 0.7 : 0.3
      expect([
        e.code,
        'exit',
        +ahead.toFixed(2),
        g.exit ?? 0,
        Math.abs(ahead - (g.exit ?? 0)) < near,
      ]).toEqual([e.code, 'exit', +ahead.toFixed(2), g.exit ?? 0, true])
      expect([
        e.code,
        'side',
        +left.toFixed(2),
        g.exitSide ?? 0,
        Math.abs(left - (g.exitSide ?? 0)) < near,
      ]).toEqual([e.code, 'side', +left.toFixed(2), g.exitSide ?? 0, true])
      const own =
        e.cardAt && g.card && Math.hypot(g.card.ahead - e.cardAt.z, g.card.side - e.cardAt.x)
      expect([e.code, !!g.card, (own ?? 0) < 0.1]).toEqual([e.code, !!e.cardAt, true])
    }
  }, 120_000)

  test('the same cones, bowls and jumps in the same places', () => {
    const sorted = (props: { kind: string; ahead: number; side: number }[]) =>
      [...props].sort((a, b) => a.ahead - b.ahead || a.side - b.side)
    for (const e of exercises) {
      const card = getCard('CZ-2027', e.code) as Card
      const { own } = ownPart(e)
      const off = own.stopAt ?? { x: 0, z: 0 }
      const at = (c: { x: number; z: number }) => ({ ahead: c.z + off.z, side: c.x + off.x })
      const animated = sorted([
        ...(own.cones ?? []).map((c) => ({ kind: 'cone', ...at(c) })),
        ...(own.bowls ?? []).map((c) => ({ kind: 'bowl', ...at(c) })),
        ...(own.jumps ?? []).map((c) => ({ kind: 'jump', ...at(c) })),
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

describe('FCI course plan geometry matches the animations (R19)', () => {
  // Each card once, and each leave card with its recall cone (its recall cards' pairs have the
  // leave card's geometry up to where the dog is left).
  const exercises = FCI_EXERCISES.filter(
    (e, i) =>
      FCI_EXERCISES.findIndex(
        (f) => f.code === e.code && (f.pairedWith === CONE) === (e.pairedWith === CONE),
      ) === i,
  )
  /** The recall cone the plan sets for a leave card without a recall card (`recallCone`). */
  const recallCone = { kind: 'cone', ahead: layout.RECALL_CONE_AHEAD, side: -1 }

  test('the turn, where the team walks off, and where the card stands', () => {
    for (const e of exercises) {
      const card = getCard('FCI', e.code) as Card
      const g = card.geometry ?? {}
      const { left, ahead, turn } = measure(e)
      const turns = layout.turnsOf(card)
      // (Turning in steps set by hand, within a degree or two.)
      const turned = turns.some((t) => Math.abs(((mod360(turn - t) + 180) % 360) - 180) < 3)
      expect([e.code, turned]).toEqual([e.code, true])
      if (e.pairedWith === CONE || (g.recallCone && !e.parts)) {
        // Called beside the recall cone, the dog catching up as the team walks on: past it.
        expect([e.code, ahead >= layout.RECALL_CONE_AHEAD]).toEqual([e.code, true])
        continue
      }
      const near = turns.some((t) => t % 360) ? 0.7 : 0.3
      expect([e.code, Math.abs(ahead - (g.exit ?? 0)) < near]).toEqual([e.code, true])
      expect([e.code, Math.abs(left - (g.exitSide ?? 0)) < near]).toEqual([e.code, true])
      // Where the card stands when not in its usual place (beside a line of cones).
      const { own } = ownPart(e)
      const off =
        own.cardAt && g.card && Math.hypot(g.card.ahead - own.cardAt.z, g.card.side - own.cardAt.x)
      expect([e.code, !!g.card, (off ?? 0) < 0.1]).toEqual([e.code, !!own.cardAt, true])
      // A recall card as far on from its leave card as the plan has it.
      const next = e.parts?.[1]
      if (next && next.exercise.code === e.code) {
        expect([e.code, next.at]).toEqual([e.code, g.fromPrevious ?? NaN])
      }
    }
  }, 120_000)

  test('the same cones, bowls and jumps in the same places', () => {
    const sorted = (props: { kind: string; ahead: number; side: number }[]) =>
      [...props].sort((a, b) => a.ahead - b.ahead || a.side - b.side)
    for (const e of exercises) {
      const card = getCard('FCI', e.code) as Card
      const { own } = ownPart(e)
      // (From where the exercise is placed, as the plan has them: the animation's are from where
      // the team stops.)
      const off = own.stopAt ?? { x: 0, z: 0 }
      const at = (c: { x: number; z: number }) => ({ ahead: c.z + off.z, side: c.x + off.x })
      const animated = sorted([
        ...(own.cones ?? []).map((c) => ({ kind: 'cone', ...at(c) })),
        ...(own.bowls ?? []).map((c) => ({ kind: 'bowl', ...at(c) })),
        ...(own.jumps ?? []).map((c) => ({ kind: 'jump', ...at(c) })),
      ])
      const planned = sorted([
        ...(card.geometry?.props ?? []),
        ...(e.pairedWith === CONE || (card.geometry?.recallCone && !e.parts) ? [recallCone] : []),
      ])
      expect([e.code, planned.map((p) => p.kind)]).toEqual([e.code, animated.map((p) => p.kind)])
      planned.forEach((p, i) => {
        const a = animated[i] as (typeof animated)[number]
        const off = Math.hypot(p.ahead - a.ahead, p.side - a.side)
        expect([e.code, i, off < 0.1]).toEqual([e.code, i, true])
      })
    }
  })

  test('with the dog on the right, the equipment from where the team stops (rightStop)', () => {
    // A figure round cones stops to have its cones where the left's are (`asPlanned`).
    for (const right of FCI_RIGHT_EXERCISES) {
      const card = getCard('FCI', right.code) as Card
      const g = card.geometry ?? {}
      if ((!g.props?.length && !g.recallCone) || right.parts || right.cardAt) continue
      const left = FCI_EXERCISES.find(
        (l) => l.code === right.code && l.pairedWith === right.pairedWith,
      )!
      const [sl, sr] = [left.stopAt ?? { x: 0, z: 0 }, right.stopAt ?? { x: 0, z: 0 }]
      const stop = g.rightStop ?? { ahead: 0, side: 0 }
      const off = Math.hypot(sr.z - sl.z - stop.ahead, sr.x - sl.x - stop.side)
      expect([right.code, off < 0.06]).toEqual([right.code, true])
    }
  })
})
