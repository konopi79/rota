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
/** §3.5: "V parkuru mohou být celkem dvě překážky". */
export const MAX_JUMPS = 2

export type PlacedProp = Point & { kind: Prop['kind']; heading: number }

/** What an exercise sets out on the field and where the team leaves it. */
export type Shape = {
  props: PlacedProp[]
  /** Where and in which direction the team walks off after the exercise. */
  exit: Pose
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
  let ahead = geometry.exit ?? 0
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
    recallCone,
  }
}

/** How far and how straight the next card stands from the end of the previous exercise. */
export function approachOf(previous: Shape | undefined, next: Card | undefined): Approach {
  const fromPrevious = next?.geometry?.fromPrevious
  // A recall card stands straight ahead of the leave card, at the distance it states.
  if (fromPrevious) return { min: fromPrevious, max: fromPrevious, maxBend: 0 }
  if (previous?.recallCone) return { min: RECALL_DISTANCE, max: RECALL_DISTANCE, maxBend: MAX_BEND }
  return { min: GAP_MIN, max: GAP_MAX, maxBend: MAX_BEND }
}
