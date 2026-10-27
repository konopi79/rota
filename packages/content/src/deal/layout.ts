import type { Card } from '../schema'
import {
  MAX_JUMPS,
  angleDiff,
  approachOf,
  bearing,
  CARD_SPACING,
  distance,
  distanceToSegment,
  EDGE,
  GAP_MAX,
  GAP_MIN,
  normalize,
  PROP_SPACING,
  shapeOf,
  signOf,
  turnsOf,
  WALK_SPACING,
  walkStart,
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

/** Every walk on within `approach`: its shortest, longest and halfway. */
function walksFrom(approach: Approach): WalkOption[] {
  const { min, max } = approach
  const aheads = min === max ? [min] : [min, (min + max) / 2, max]
  return aheads.flatMap((ahead) => approach.shifts.map((across) => ({ ahead, across })))
}

/** The way `a`–`b` passes `WALK_SPACING` clear of every one of `others`. */
const clearOf = (others: Point[], [a, b]: [Point, Point]) =>
  others.every((p) => distanceToSegment(p, a, b) >= WALK_SPACING)

/** How far equipment keeps from `q`: its own clearance, or `q`'s if that is a prop. */
const spacing = (prop: PlacedProp, q: Point) =>
  Math.max(prop.clear ?? PROP_SPACING, ('clear' in q && (q as PlacedProp).clear) || 0)

type Previous = { card: Card; at: Placement; side: Side }

/** What the planner has laid out so far, to go back to (`save` / `restore`). */
export type PlannerState = {
  stations: Point[]
  signs: Point[]
  props: PlacedProp[]
  backs: [Point, Point][]
  aisles: [Point, Point][]
  previous: Previous | undefined
  room: Float64Array
}

/**
 * Lays a deck out on the field while it is dealt (plan §5, FCI and national): the start
 * somewhere on the edge, then each card 3–5 m straight on from the end of the previous
 * exercise (further where an exercise needs it) — the direction changes only on the cards
 * — with its equipment, inside the field and clear of the other cards; on a national course
 * the way to each card clear of the others too. `place` refuses a card that does not fit —
 * the dealer then draws another — and keeps room for at least one more card, so the finish
 * always fits.
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
  /** National courses: the ways walked between the cards, kept clear (`WALK_SPACING`). */
  private aisles: [Point, Point][] = []
  private previous: Previous | undefined
  /** Every metre of the field inside its edge (`emptiest`)… */
  private readonly grid: Point[] = []
  /** …and how far each is from the nearest exercise or card laid out so far. */
  private room: Float64Array

  constructor(
    readonly width: number,
    readonly height: number,
    private random: () => number,
    /** Jumps on the field at most (`course.maxJumps`). */
    private maxJumps = MAX_JUMPS,
  ) {
    this.start = this.edgeStart()
    this.stations = [this.start]
    this.signs = [signOf(undefined, this.start)]
    for (let x = 1; x < width; x++) for (let y = 1; y < height; y++) this.grid.push({ x, y })
    this.room = new Float64Array(this.grid.length).fill(Infinity)
    this.mark(this.start)
    this.mark(this.signs[0] as Point)
  }

  /** Something now stands at `p`: the grid's room shrinks around it. */
  private mark(p: Point) {
    this.grid.forEach((q, i) => {
      const d = distance(p, q)
      if (d < (this.room[i] as number)) this.room[i] = d
    })
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

  /** The point of the field farthest from every exercise and card laid out so far (1 m grid). */
  private emptiest(): Point {
    let best = { point: { x: this.width / 2, y: this.height / 2 }, room: -1 }
    this.grid.forEach((point, i) => {
      const room = this.room[i] as number
      if (room > best.room) best = { point, room }
    })
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
    const { stations, signs, props, backs, aisles, previous, room } = this
    return {
      stations: [...stations],
      signs: [...signs],
      props: [...props],
      backs: [...backs],
      aisles: [...aisles],
      previous,
      room: room.slice(),
    }
  }

  restore(state: PlannerState) {
    this.stations = [...state.stations]
    this.signs = [...state.signs]
    this.props = [...state.props]
    this.backs = [...state.backs]
    this.aisles = [...state.aisles]
    this.previous = state.previous
    this.room = state.room.slice()
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
    let best: { at: Placement; shape: Shape; room: number; aisle: [Point, Point] } | undefined
    const others = [...this.stations, ...this.signs]
    while (options.length) {
      const option = pickWeighted(options, (o) => o.weight, this.random)
      if (!option) break
      options.splice(options.indexOf(option), 1)
      const at: Placement = { ...walkTo(exit, option.ahead, option.across), turn: option.turn }
      // The cheap check first: most places are taken once the field fills up.
      if (!this.free(at, card, this.signs, props)) continue
      const aisle: [Point, Point] = [walkStart(previousShape, exit, at), at]
      if (card.ruleset === 'CZ' && !this.aisleClear(aisle)) continue
      const shape = shapeOf(card, at, side, false)
      if (!this.fits(card, at, shape, props)) continue
      const room = this.roomAfter(shape, others)
      if (!best || room > best.room) best = { at, shape, room, aisle }
      if (room >= ROOM) break
    }
    if (!best) return undefined
    const { at, shape, aisle } = best
    this.props = props
    const sign = signOf(card, at)
    this.stations.push(at)
    this.signs.push(sign)
    this.mark(at)
    this.mark(sign)
    if (shape.back) this.backs.push([at, shape.back])
    if (shape.walk) this.aisles.push(shape.walk)
    if (card.ruleset === 'CZ') this.aisles.push(aisle)
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
      if (!this.free(finish, undefined, this.signs, props)) continue
      const national = this.previous?.card.ruleset === 'CZ'
      if (!national || this.aisleClear([walkStart(shape, exit, finish), finish])) return finish
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
  private free(at: Pose, card: Card | undefined, signs: Point[], props: PlacedProp[]) {
    const sign = signOf(card, at)
    return (
      this.inside(at) &&
      signs.every((s) => distance(s, sign) >= CARD_SPACING) &&
      props.every(
        (q) => distance(q, at) >= spacing(q, at) && distance(q, sign) >= spacing(q, sign),
      ) &&
      [at, sign].every(this.clearOfBacks)
    )
  }

  private clearOfBacks = (p: Point) =>
    this.backs.every(([a, b]) => distanceToSegment(p, a, b) >= PROP_SPACING) &&
    this.aisles.every(([a, b]) => distanceToSegment(p, a, b) >= WALK_SPACING - 1e-9)

  /**
   * The way to the next card passes clear of every exercise, card and piece of equipment
   * but the one it comes from (the last laid out, or the start).
   */
  private aisleClear(aisle: [Point, Point]): boolean {
    const others = [...this.stations.slice(0, -1), ...this.signs.slice(0, -1), ...this.props]
    return clearOf(others, aisle)
  }

  /** The rest of the exercise fits too (`at` itself is `free`). */
  private fits(card: Card, at: Placement, shape: Shape, props: PlacedProp[]): boolean {
    if (!this.inside(shape.exit)) return false
    // Steps back stay clear of the other exercises, their cards and equipment — but going
    // back to the dog (2-213, 3-320, 3-322) leads to the leave card before.
    const back = shape.back
    if (back) {
      if (!this.inside(back)) return false
      const clear = (p: { x: number; y: number }) => distanceToSegment(p, at, back) >= PROP_SPACING
      const toDog = card.sequencing.onlyAfterLeave ? 1 : 0
      const stations = this.stations.slice(0, this.stations.length - toDog)
      const signs = this.signs.slice(0, this.signs.length - toDog)
      if (![...stations, ...signs, ...props].every(clear)) return false
    }
    // The way walked inside a national exercise, like the way between two cards.
    if (shape.walk && !clearOf([...this.stations, ...this.signs, ...props], shape.walk)) {
      return false
    }
    for (const prop of shape.props) {
      const near = (q: Point) => distance(prop, q) < spacing(prop, q)
      if (!this.inside(prop)) return false
      if (this.stations.some(near) || this.signs.some(near)) return false
      if (props.some(near) || !this.clearOfBacks(prop)) return false
    }
    const jumps = [...props, ...shape.props].filter((p) => p.kind === 'jump').length
    if (jumps > this.maxJumps) return false
    // Room for one more card (or the finish) after this one, the way to it clear too.
    const signs = [...this.signs, signOf(card, at)]
    const allProps = [...props, ...shape.props]
    const others = [...this.stations, ...this.signs, ...props]
    return walksFrom(approachOf(shape, undefined)).some(({ ahead, across }) => {
      const next = walkTo(shape.exit, ahead, across)
      if (!this.free(next, undefined, signs, allProps)) return false
      return card.ruleset !== 'CZ' || clearOf(others, [walkStart(shape, shape.exit, next), next])
    })
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
