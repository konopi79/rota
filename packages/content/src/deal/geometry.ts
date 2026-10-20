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
/** The largest turn the team takes on its own between two cards. */
export const MAX_BEND = 90
/**
 * A turn between two cards is taken on the way, not at the card: the team first walks on
 * in the direction the exercise ends (so a card's own turn stays what the card says —
 * handler feedback, 2026-10-20), turns, and comes straight to the next card. Lengths of
 * those two legs in metres; together the 3–5 m between exercises.
 */
export const LEGS_OUT = [1, 2, 3]
export const LEGS_IN = [2, 3, 4]
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
  /** The recall cone is part of the exercise: the next card stands 5 m past it. */
  recallCone: boolean
}

/** How the next card is approached from the previous exercise. */
export type Approach = { min: number; max: number; maxBend: number }

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
  return {
    props,
    exit: { ...offset(at, at.heading, ahead), heading: normalize(at.heading + at.turn) },
    ...(back && { back }),
    recallCone,
  }
}

/**
 * How far (walked) and how straight the next card stands from the end of the previous
 * exercise.
 */
export function approachOf(previous: Shape | undefined, next: Card | undefined): Approach {
  const fromPrevious = next?.geometry?.fromPrevious
  // A recall card stands straight ahead of the leave card, at the distance it states.
  if (fromPrevious) return { min: fromPrevious, max: fromPrevious, maxBend: 0 }
  if (previous?.recallCone) return { min: RECALL_DISTANCE, max: RECALL_DISTANCE, maxBend: MAX_BEND }
  return { min: GAP_MIN, max: GAP_MAX, maxBend: MAX_BEND }
}

/** The two legs of a walk between cards: on from the previous exercise, then into the next. */
export type Legs = { out: number; in: number }

/**
 * The legs a walk with a turn of `bend` may take within `approach`: straight on, the whole
 * distance is the leg into the card; with a turn, the team walks on 1–3 m first.
 */
export function legsOf(approach: Approach, bend: number): Legs[] {
  const exact = approach.min === approach.max
  if (!bend) return (exact ? [approach.min] : [GAP_MIN, 4, GAP_MAX]).map((d) => ({ out: 0, in: d }))
  return LEGS_OUT.flatMap((out) =>
    (exact ? [approach.min - out] : LEGS_IN)
      .filter(
        (d) => d >= Math.min(...LEGS_IN) && out + d >= approach.min && out + d <= approach.max,
      )
      .map((d) => ({ out, in: d })),
  )
}

/** Where a walk from `from` with a turn of `bend` and these legs arrives, facing on. */
export function walkTo(from: Pose, bend: number, legs: Legs): Pose {
  const corner = offset(from, from.heading, legs.out)
  const heading = normalize(from.heading + bend)
  return { ...offset(corner, heading, legs.in), heading }
}

export type Walk = Legs & {
  /** From, the corner if the walk turns, to. */
  points: Point[]
  length: number
}

/**
 * The walk from `from` to `to` read back off their poses: straight on when both face the
 * same way, otherwise on along `from.heading` to a corner and along `to.heading` into
 * `to`. `undefined` when no such walk leads forward from one to the other.
 */
export function walkOf(from: Pose, to: Pose): Walk | undefined {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const u = offset({ x: 0, y: 0 }, from.heading, 1)
  const v = offset({ x: 0, y: 0 }, to.heading, 1)
  const det = u.x * v.y - u.y * v.x
  if (Math.abs(det) < 1e-6) {
    // The same (or the opposite) direction: only straight on, along the line.
    const ahead = dx * u.x + dy * u.y
    const across = dx * u.y - dy * u.x
    if (Math.abs(angleDiff(from.heading, to.heading)) > 1 || Math.abs(across) > 0.05) return
    if (ahead <= 0) return
    return { out: 0, in: ahead, points: [from, to], length: ahead }
  }
  // from + out·u + in·v = to
  const out = (dx * v.y - dy * v.x) / det
  const into = (u.x * dy - u.y * dx) / det
  if (out < -0.05 || into <= 0) return
  const corner = offset(from, from.heading, out)
  return { out, in: into, points: [from, corner, to], length: out + into }
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
