import type { Card, Prop } from '../schema'
import type { Placement, Point, Pose, Side } from './types'

/**
 * Field geometry shared by the course layout (`layout.ts`), the validator and the field
 * plan in the app. It only interprets card metadata (`Card.geometry`); what may stand
 * where is decided in `layout.ts` and re-checked independently in `validate.ts`.
 * Distances in metres, headings in degrees clockwise from "up".
 */

/** §3.5: "V závislosti na průběhu parkuru a na dané kartě je vzdálenost mezi cviky přibližně 3-5 m." */
export const GAP_MIN = 3
export const GAP_MAX = 5
/**
 * §4.8: the recall cone stands "5 m rovně dopředu od karty"; "Následující cvik musí být ve
 * vzdálenosti 5 m od přivolávacího kužele".
 */
export const RECALL_DISTANCE = 5
/** §3.5: the recall cone "1 m od linie chůze (na opačné straně, než je veden pes)". */
const RECALL_CONE_SIDE = 1
/** Kept clear along the edge of the field. */
export const EDGE = 1
/**
 * Minimum distance between two cards (where they stand, see `signOf`). §3.5: the team must not "nepřiměřeně přiblíží ke
 * stojanům s kartami jiných cviků a jiných překážek".
 */
export const CARD_SPACING = 3
/** Minimum distance between a cone, bowl or jump and another exercise's card or equipment. */
export const PROP_SPACING = 1.5
/**
 * The direction changes only on the cards (author, 2026-10-21; §3.5: "Cviky musí být
 * umístěny přirozeně ve směru postupu týmu"): between two cards the team walks straight on
 * the way the exercise ends. After a turn about on the spot it walks back beside its way in
 * (a hairpin on the plan), this many metres to the side it turned — straight back it would
 * run into the cards it has just passed.
 */
export const HAIRPIN_WIDTHS = [1, 2, 3]
/** §3.5: "V parkuru mohou být celkem dvě překážky". */
export const MAX_JUMPS = 2

export type PlacedProp = Point & { kind: Prop['kind']; heading: number }

/** What an exercise sets out on the field and where the team leaves it. */
export type Shape = {
  props: PlacedProp[]
  /** Where and in which direction the team walks off after the exercise. */
  exit: Pose
  /** Steps back end here; the team then walks on past its card (kept clear of the others). */
  back?: Point
  /**
   * The exercise turns the team about on the spot: the walk on goes back beside the way in,
   * to this side of the exit heading (1 = right, −1 = left).
   */
  hairpin?: 1 | -1
  /** The recall cone is part of the exercise: the next card stands 5 m past it. */
  recallCone: boolean
}

/**
 * How the next card is approached from the previous exercise: straight on, `min`–`max` m
 * ahead, shifted to the side by one of `shifts` (metres, right positive — 0 but after a
 * turn about).
 */
export type Approach = { min: number; max: number; shifts: number[] }

const rad = (deg: number) => (deg * Math.PI) / 180

/** Degrees into [0, 360). */
export const normalize = (deg: number) => ((deg % 360) + 360) % 360

/** Signed difference `to − from` in (−180, 180]. */
export function angleDiff(from: number, to: number): number {
  const d = normalize(to - from)
  return d > 180 ? d - 360 : d
}

/** The point `ahead` metres along `heading` and `right` metres to its right. */
export function offset(p: Point, heading: number, ahead: number, right = 0): Point {
  const h = rad(heading)
  return {
    x: p.x + Math.sin(h) * ahead + Math.cos(h) * right,
    y: p.y - Math.cos(h) * ahead + Math.sin(h) * right,
  }
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Heading of the line from `a` to `b`. */
export const bearing = (a: Point, b: Point) =>
  normalize((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI)

/** How far the card stands from where its exercise is done. */
const SIGN_OFFSET = 1.1

/**
 * Where the card itself stands (§4.3): "Pokud se směr trasy nemění, provádí se cvik na
 * levé straně karty (A)" — the card is to the team's right; "Pokud se mění směr postupu
 * … provádí se cvik před kartou (B)" — the card is ahead. Start, finish, recall (C) and
 * jump cards (D) stand like A.
 */
export function signOf(placement: Card['placement'], at: Pose): Point {
  return placement === 'B'
    ? offset(at, at.heading, SIGN_OFFSET)
    : offset(at, at.heading, 0.2, SIGN_OFFSET)
}

/** The turns a card allows (0 for cards done without turning). */
export function turnsOf(card: Card): number[] {
  const turn = card.geometry?.turn ?? 0
  return Array.isArray(turn) ? turn : [turn]
}

/**
 * The exercise laid out at `at`. `recallFollows`: a recall card comes next — then a leave
 * card (319, 408, 409) has no recall cone of its own.
 */
export function shapeOf(card: Card, at: Placement, side: Side, recallFollows: boolean): Shape {
  const geometry = card.geometry ?? {}
  const toDog = side === 'right' ? 1 : -1
  const props: PlacedProp[] = (geometry.props ?? []).map((p) => ({
    kind: p.kind,
    heading: at.heading,
    ...offset(at, at.heading, p.ahead, p.side * toDog),
  }))
  // After steps back the team walks on forward, past its own card.
  const back =
    geometry.exit && geometry.exit < 0 ? offset(at, at.heading, geometry.exit) : undefined
  let ahead = Math.max(geometry.exit ?? 0, 0)
  const recallCone = !!geometry.recallCone && !recallFollows
  if (recallCone) {
    props.push({
      kind: 'cone',
      heading: at.heading,
      ...offset(at, at.heading, RECALL_DISTANCE, -RECALL_CONE_SIDE * toDog),
    })
    ahead = Math.max(ahead, RECALL_DISTANCE)
  }
  // Turned about where the exercise is done: a right turn brings the team back on the
  // right of its way in, which is the left of the way out.
  const hairpin = !ahead && normalize(at.turn) === 180 ? (at.turn > 0 ? -1 : 1) : undefined
  return {
    props,
    exit: { ...offset(at, at.heading, ahead), heading: normalize(at.heading + at.turn) },
    ...(back && { back }),
    ...(hairpin && { hairpin }),
    recallCone,
  }
}

/** How far and where the next card stands from the end of the previous exercise. */
export function approachOf(previous: Shape | undefined, next: Card | undefined): Approach {
  const fromPrevious = next?.geometry?.fromPrevious
  const side = previous?.hairpin
  const shifts = side ? HAIRPIN_WIDTHS.map((w) => w * side) : [0]
  // A recall card stands straight ahead of the leave card, at the distance it states.
  if (fromPrevious) return { min: fromPrevious, max: fromPrevious, shifts: [0] }
  if (previous?.recallCone) return { min: RECALL_DISTANCE, max: RECALL_DISTANCE, shifts }
  return { min: GAP_MIN, max: GAP_MAX, shifts }
}

/** Where the team comes walking `ahead` m straight on from `from`, `across` m to the side. */
export function walkTo(from: Pose, ahead: number, across = 0): Pose {
  return { ...offset(from, from.heading, ahead, across), heading: from.heading }
}

/**
 * The walk from `from` to `to` read back off their poses: how far ahead and how far to the
 * side (right positive) `to` stands. `undefined` if the team would arrive facing another
 * way — a change of direction between the cards.
 */
export function walkOf(from: Pose, to: Pose): { ahead: number; across: number } | undefined {
  if (Math.abs(angleDiff(from.heading, to.heading)) > 1) return undefined
  const h = rad(from.heading)
  const dx = to.x - from.x
  const dy = to.y - from.y
  return {
    ahead: dx * Math.sin(h) - dy * Math.cos(h),
    across: dx * Math.cos(h) + dy * Math.sin(h),
  }
}

/** Shortest distance from `p` to the segment `a`–`b`. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  )
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy })
}
