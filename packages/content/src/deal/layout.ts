import type { Card } from '../schema'
import {
  approachOf,
  CARD_SPACING,
  distance,
  EDGE,
  GAP_MAX,
  GAP_MIN,
  MAX_JUMPS,
  normalize,
  offset,
  PROP_SPACING,
  shapeOf,
  signOf,
  turnsOf,
  type PlacedProp,
  type Shape,
} from './geometry'
import { pickWeighted } from './prng'
import type { Placement, Point, Pose, Side } from './types'

/**
 * Turns between cards with their weights: straight ahead preferred ("přirozeně ve směru
 * postupu"), then right-angle corners, an occasional diagonal — the way judges draw FCI
 * courses on a 1 m grid. Card turns are multiples of 45° too, so the course stays on
 * that lattice.
 */
const BENDS: [number, number][] = [
  [0, 6],
  [90, 2],
  [-90, 2],
  [45, 1],
  [-45, 1],
]
/** Weight factor for a placement that leaves the team walking diagonally. */
const DIAGONAL = 0.2
/** Distance from where the team left the previous exercise, sampled every metre. */
const GAPS = [GAP_MIN, 4, GAP_MAX]

type Previous = { card: Card; at: Placement; side: Side }

/**
 * Lays a deck out on the field while it is dealt (plan §5, FCI): the start somewhere on the
 * edge, then each card 3–5 m on from the end of the previous exercise, with its equipment,
 * inside the field and clear of the other cards. `place` refuses a card that does not fit
 * — the dealer then draws another — and keeps room for at least one more card, so the
 * finish always fits.
 */
export class FieldPlanner {
  readonly start: Pose
  /** Where every exercise so far is done, the start included. */
  private stations: Point[]
  /** Where their cards stand. */
  private signs: Point[]
  /** Equipment of every card but the last one (a leave card's recall cone is still open). */
  private props: PlacedProp[] = []
  private previous: Previous | undefined

  constructor(
    readonly width: number,
    readonly height: number,
    private random: () => number,
  ) {
    this.start = this.edgeStart()
    this.stations = [this.start]
    this.signs = [signOf('A', this.start)]
  }

  /** Where `card` stands, with the dog on `side` — or `undefined` if it cannot fit. */
  place(card: Card, side: Side): Placement | undefined {
    const recallFollows = !!card.sequencing.onlyAfterLeave
    // A recall card needs its leave card on the same field.
    if (recallFollows && !this.previous) return undefined
    const previousShape = this.shapeOfPrevious(recallFollows)
    const exit = previousShape?.exit ?? this.start
    const approach = approachOf(previousShape, card)
    const props = [...this.props, ...(previousShape?.props ?? [])]

    const gaps = approach.min === approach.max ? [approach.min] : GAPS
    const options = BENDS.filter(([bend]) => Math.abs(bend) <= approach.maxBend).flatMap(
      ([bend, weight]) =>
        gaps.flatMap((gap) =>
          turnsOf(card).map((turn) => ({
            bend,
            gap,
            turn,
            // Back onto the grid after a diagonal; stay off diagonals otherwise.
            weight: weight * (normalize(exit.heading + bend + turn) % 90 ? DIAGONAL : 1),
          })),
        ),
    )
    while (options.length) {
      const option = pickWeighted(options, (o) => o.weight, this.random)
      if (!option) break
      options.splice(options.indexOf(option), 1)
      const heading = normalize(exit.heading + option.bend)
      const at: Placement = { ...offset(exit, heading, option.gap), heading, turn: option.turn }
      const shape = shapeOf(card, at, side, false)
      if (this.fits(card, at, shape, props)) {
        this.props = props
        this.stations.push(at)
        this.signs.push(signOf(card.placement, at))
        this.previous = { card, at, side }
        return at
      }
    }
    return undefined
  }

  /** The finish, 3–5 m after the last exercise. */
  finish(): Pose | undefined {
    const shape = this.shapeOfPrevious(false)
    const exit = shape?.exit ?? this.start
    const approach = approachOf(shape, undefined)
    const props = [...this.props, ...(shape?.props ?? [])]
    const options = BENDS.flatMap(([bend, weight]) =>
      (approach.min === approach.max ? [approach.min] : GAPS).map((gap) => ({
        bend,
        gap,
        weight,
      })),
    )
    while (options.length) {
      const option = pickWeighted(options, (o) => o.weight, this.random)
      if (!option) break
      options.splice(options.indexOf(option), 1)
      const heading = normalize(exit.heading + option.bend)
      const finish = { ...offset(exit, heading, option.gap), heading }
      if (this.free(finish, 'A', this.signs, props)) return finish
    }
    return undefined
  }

  private shapeOfPrevious(recallFollows: boolean): Shape | undefined {
    const p = this.previous
    return p && shapeOf(p.card, p.at, p.side, recallFollows)
  }

  private inside = (p: Point) =>
    p.x >= EDGE && p.x <= this.width - EDGE && p.y >= EDGE && p.y <= this.height - EDGE

  /** An exercise could be done at `at`, with its card standing clear of the others. */
  private free(at: Pose, placement: Card['placement'], signs: Point[], props: PlacedProp[]) {
    const sign = signOf(placement, at)
    return (
      this.inside(at) &&
      this.inside(sign) &&
      signs.every((s) => distance(s, sign) >= CARD_SPACING) &&
      props.every((q) => distance(q, at) >= PROP_SPACING && distance(q, sign) >= PROP_SPACING)
    )
  }

  private fits(card: Card, at: Placement, shape: Shape, props: PlacedProp[]): boolean {
    if (!this.free(at, card.placement, this.signs, props) || !this.inside(shape.exit)) return false
    const near = (p: Point) => (q: Point) => distance(p, q) < PROP_SPACING
    for (const prop of shape.props) {
      if (!this.inside(prop)) return false
      if (this.stations.some(near(prop)) || this.signs.some(near(prop))) return false
      if (props.some(near(prop))) return false
    }
    const jumps = [...props, ...shape.props].filter((p) => p.kind === 'jump').length
    if (jumps > MAX_JUMPS) return false
    // Room for one more card (or the finish) after this one.
    const signs = [...this.signs, signOf(card.placement, at)]
    const allProps = [...props, ...shape.props]
    const approach = approachOf(shape, undefined)
    return BENDS.some(([bend]) =>
      (approach.min === approach.max ? [approach.min] : GAPS).some((gap) => {
        const heading = normalize(shape.exit.heading + bend)
        const next = { ...offset(shape.exit, heading, gap), heading }
        return this.free(next, 'A', signs, allProps)
      }),
    )
  }

  /** Anywhere along one of the four edges, facing into the field. */
  private edgeStart(): Pose {
    const along = (length: number) => GAP_MIN + this.random() * (length - 2 * GAP_MIN)
    const edge = Math.floor(this.random() * 4)
    const round = (n: number) => Math.round(n * 2) / 2
    if (edge === 0) return { x: round(along(this.width)), y: this.height - EDGE, heading: 0 }
    if (edge === 1) return { x: EDGE, y: round(along(this.height)), heading: 90 }
    if (edge === 2) return { x: round(along(this.width)), y: EDGE, heading: 180 }
    return { x: this.width - EDGE, y: round(along(this.height)), heading: 270 }
  }
}
