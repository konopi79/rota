import type { Card } from '../schema'
import {
  angleDiff,
  approachOf,
  bearing,
  CARD_SPACING,
  distance,
  distanceToSegment,
  EDGE,
  GAP_MAX,
  GAP_MIN,
  MAX_JUMPS,
  normalize,
  PROP_SPACING,
  shapeOf,
  signOf,
  turnsOf,
  walkTo,
  type Approach,
  type PlacedProp,
  type Shape,
} from './geometry'
import { pick, pickWeighted } from './prng'
import type { Placement, Point, Pose, Side } from './types'

/** Metres of way on (`runway`) from which a place counts as roomy. */
const ROOM = 8
/** Weight factor for a placement that leaves the team walking diagonally. */
const DIAGONAL = 0.2

type WalkOption = { ahead: number; across: number }

/** Every walk on within `approach`, distances sampled every metre. */
function walksFrom(approach: Approach): WalkOption[] {
  const aheads = approach.min === approach.max ? [approach.min] : [GAP_MIN, 4, GAP_MAX]
  return aheads.flatMap((ahead) => approach.shifts.map((across) => ({ ahead, across })))
}

type Previous = { card: Card; at: Placement; side: Side }

/** What the planner has laid out so far, to go back to (`save` / `restore`). */
export type PlannerState = {
  stations: Point[]
  signs: Point[]
  props: PlacedProp[]
  backs: [Point, Point][]
  previous: Previous | undefined
}

/**
 * Lays a deck out on the field while it is dealt (plan §5, FCI): the start somewhere on the
 * edge, then each card 3–5 m straight on from the end of the previous exercise — the
 * direction changes only on the cards — with its equipment,
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

  /**
   * How far the team could walk straight on from where the last exercise ends (on the best
   * of its lanes after a turn about) before the edge or another card — short means the next
   * card or two had better turn.
   */
  runway(): number {
    // The card just done and its sign stand right at the start of the way.
    const others = [...this.stations.slice(0, -1), ...this.signs.slice(0, -1)]
    return this.roomAfter(this.shapeOfPrevious(false), others)
  }

  private roomAfter(shape: Shape | undefined, others: Point[]): number {
    const exit = shape?.exit ?? this.start
    return Math.max(
      ...approachOf(shape, undefined).shifts.map((across) =>
        this.runwayFrom(walkTo(exit, 0, across), others),
      ),
    )
  }

  /**
   * How well a next card turning the team by `turn` heads it into the emptiest part of the
   * field (`emptiest`), from about where that card would stand: 1 straight at it, 0 away
   * from it. The dealer prefers such cards, so a course spreads over the field instead of
   * leaving a corner empty (author, 2026-10-22).
   */
  towardsEmpty(turn: number): number {
    const shape = this.shapeOfPrevious(false)
    const exit = shape?.exit ?? this.start
    const across = approachOf(shape, undefined).shifts[0] ?? 0
    const next = walkTo(exit, (GAP_MIN + GAP_MAX) / 2, across)
    const empty = this.emptiest()
    const off = angleDiff(normalize(next.heading + turn), bearing(next, empty))
    return (1 + Math.cos((off * Math.PI) / 180)) / 2
  }

  private emptiestAt: { stations: number; point: Point } | undefined

  /** The point of the field farthest from every exercise and card laid out so far (1 m grid). */
  private emptiest(): Point {
    if (this.emptiestAt?.stations === this.stations.length) return this.emptiestAt.point
    const others = [...this.stations, ...this.signs]
    let best = { point: { x: this.width / 2, y: this.height / 2 }, room: -1 }
    for (let x = 1; x < this.width; x++) {
      for (let y = 1; y < this.height; y++) {
        const point = { x, y }
        const room = Math.min(...others.map((q) => distance(point, q)))
        if (room > best.room) best = { point, room }
      }
    }
    this.emptiestAt = { stations: this.stations.length, point: best.point }
    return best.point
  }

  private runwayFrom(from: Pose, others: Point[]): number {
    const clear = (p: Point) =>
      this.inside(p) && others.every((q) => distance(p, q) >= PROP_SPACING)
    let d = 0
    while (d < ROOM && clear(walkTo(from, d + 1))) d++
    return d
  }

  save(): PlannerState {
    const { stations, signs, props, backs, previous } = this
    return {
      stations: [...stations],
      signs: [...signs],
      props: [...props],
      backs: [...backs],
      previous,
    }
  }

  restore(state: PlannerState) {
    this.stations = [...state.stations]
    this.signs = [...state.signs]
    this.props = [...state.props]
    this.backs = [...state.backs]
    this.previous = state.previous
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

    const options = walksFrom(approach).flatMap((walk) =>
      turnsOf(card).map((turn) => ({
        ...walk,
        turn,
        // Back onto the grid after a diagonal; stay off diagonals otherwise.
        weight: normalize(exit.heading + turn) % 90 ? DIAGONAL : 1,
      })),
    )
    // Of the places that fit, the first with room to go on (see `runway`), else the roomiest.
    let best: { at: Placement; shape: Shape; room: number } | undefined
    const others = [...this.stations, ...this.signs]
    while (options.length) {
      const option = pickWeighted(options, (o) => o.weight, this.random)
      if (!option) break
      options.splice(options.indexOf(option), 1)
      const at: Placement = { ...walkTo(exit, option.ahead, option.across), turn: option.turn }
      // The cheap check first: most places are taken once the field fills up.
      if (!this.free(at, card.placement, this.signs, props)) continue
      const shape = shapeOf(card, at, side, false)
      if (!this.fits(card, at, shape, props)) continue
      const room = this.roomAfter(shape, others)
      if (!best || room > best.room) best = { at, shape, room }
      if (room >= ROOM) break
    }
    if (!best) return undefined
    const { at, shape } = best
    this.props = props
    this.stations.push(at)
    this.signs.push(signOf(card.placement, at))
    if (shape.back) this.backs.push([at, shape.back])
    this.previous = { card, at, side }
    return at
  }

  /** The finish, 3–5 m after the last exercise. */
  finish(): Pose | undefined {
    const shape = this.shapeOfPrevious(false)
    const exit = shape?.exit ?? this.start
    const approach = approachOf(shape, undefined)
    const props = [...this.props, ...(shape?.props ?? [])]
    const options = walksFrom(approach)
    while (options.length) {
      const option = pick(options, this.random)
      if (!option) break
      options.splice(options.indexOf(option), 1)
      const finish = walkTo(exit, option.ahead, option.across)
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

  /**
   * An exercise could be done at `at`, with its card standing clear of the others — the
   * card may stand over the edge of the field (`EDGE`).
   */
  private free(at: Pose, placement: Card['placement'], signs: Point[], props: PlacedProp[]) {
    const sign = signOf(placement, at)
    return (
      this.inside(at) &&
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
    return walksFrom(approachOf(shape, undefined)).some(({ ahead, across }) =>
      this.free(walkTo(shape.exit, ahead, across), 'A', signs, allProps),
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
