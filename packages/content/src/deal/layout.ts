import type { Card } from '../schema'
import {
  approachOf,
  CARD_SPACING,
  distance,
  distanceToSegment,
  EDGE,
  GAP_MIN,
  legsOf,
  MAX_JUMPS,
  normalize,
  PROP_SPACING,
  shapeOf,
  signOf,
  turnsOf,
  walkTo,
  type Approach,
  type Legs,
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

type WalkOption = { bend: number; legs: Legs; weight: number }
const walkCache = new Map<string, WalkOption[]>()

/** Every walk on within `approach`; each turn keeps its weight, shared by its legs. */
function walksFrom(approach: Approach): WalkOption[] {
  const key = `${approach.min}/${approach.max}/${approach.maxBend}`
  let walks = walkCache.get(key)
  if (!walks) {
    walks = BENDS.filter(([bend]) => Math.abs(bend) <= approach.maxBend).flatMap(
      ([bend, weight]) => {
        const legs = legsOf(approach, bend)
        return legs.map((l) => ({ bend, legs: l, weight: weight / legs.length }))
      },
    )
    walkCache.set(key, walks)
  }
  return walks
}

type Previous = { card: Card; at: Placement; side: Side }

/**
 * Lays a deck out on the field while it is dealt (plan §5, FCI): the start somewhere on the
 * edge, then each card 3–5 m on from the end of the previous exercise — leaving it in the
 * direction the exercise ends, any turn of its own on the way — with its equipment,
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
  /** Where the team steps back (from the card to `back`): kept clear like equipment. */
  private backs: [Point, Point][] = []
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

    const options = walksFrom(approach).flatMap(({ bend, legs, weight }) =>
      turnsOf(card).map((turn) => ({
        bend,
        legs,
        turn,
        // Back onto the grid after a diagonal; stay off diagonals otherwise.
        weight: weight * (normalize(exit.heading + bend + turn) % 90 ? DIAGONAL : 1),
      })),
    )
    while (options.length) {
      const option = pickWeighted(options, (o) => o.weight, this.random)
      if (!option) break
      options.splice(options.indexOf(option), 1)
      const at: Placement = { ...walkTo(exit, option.bend, option.legs), turn: option.turn }
      // The cheap check first: most places are taken once the field fills up.
      if (!this.free(at, card.placement, this.signs, props)) continue
      const shape = shapeOf(card, at, side, false)
      if (this.fits(card, at, shape, props)) {
        this.props = props
        this.stations.push(at)
        this.signs.push(signOf(card.placement, at))
        if (shape.back) this.backs.push([at, shape.back])
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
    const options = [...walksFrom(approach)]
    while (options.length) {
      const option = pickWeighted(options, (o) => o.weight, this.random)
      if (!option) break
      options.splice(options.indexOf(option), 1)
      const finish = walkTo(exit, option.bend, option.legs)
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
      props.every((q) => distance(q, at) >= PROP_SPACING && distance(q, sign) >= PROP_SPACING) &&
      [at, sign].every(this.clearOfBacks)
    )
  }

  private clearOfBacks = (p: Point) =>
    this.backs.every(([a, b]) => distanceToSegment(p, a, b) >= PROP_SPACING)

  /** The rest of the exercise fits too (`at` itself is `free`). */
  private fits(card: Card, at: Placement, shape: Shape, props: PlacedProp[]): boolean {
    if (!this.inside(shape.exit)) return false
    // Steps back stay clear of the other exercises, their cards and equipment.
    const back = shape.back
    if (back) {
      if (!this.inside(back)) return false
      const clear = (p: { x: number; y: number }) => distanceToSegment(p, at, back) >= PROP_SPACING
      if (![...this.stations, ...this.signs, ...props].every(clear)) return false
    }
    const near = (p: Point) => (q: Point) => distance(p, q) < PROP_SPACING
    for (const prop of shape.props) {
      if (!this.inside(prop)) return false
      if (this.stations.some(near(prop)) || this.signs.some(near(prop))) return false
      if (props.some(near(prop)) || !this.clearOfBacks(prop)) return false
    }
    const jumps = [...props, ...shape.props].filter((p) => p.kind === 'jump').length
    if (jumps > MAX_JUMPS) return false
    // Room for one more card (or the finish) after this one.
    const signs = [...this.signs, signOf(card.placement, at)]
    const allProps = [...props, ...shape.props]
    return walksFrom(approachOf(shape, undefined)).some(({ bend, legs }) =>
      this.free(walkTo(shape.exit, bend, legs), 'A', signs, allProps),
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
