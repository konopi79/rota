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
/**
 * How far the course keeps inside the field: where the team walks and works, steps back,
 * its equipment — the dog walks beside the handler's line. The cards' stands do not count:
 * a card may stand over the edge, the course may not (author, 2026-10-22).
 */
export const EDGE = 0.5
/**
 * Minimum distance between two cards (where they stand, see `signOf`). §3.5: the team must not "nepřiměřeně přiblíží ke
 * stojanům s kartami jiných cviků a jiných překážek".
 */
export const CARD_SPACING = 3
/** Minimum distance between a cone, bowl or jump and another exercise's card or equipment. */
export const PROP_SPACING = 1.5
/**
 * National courses: how far the way between two cards keeps from the other exercises, their
 * cards and equipment — "Dráha v uličce s kartami musí být široká nejméně 1,5 m" (Směrnice
 * §1.1.3, p. 3), the team in its middle.
 */
export const WALK_SPACING = 0.75
/**
 * …and the cards' stands and the equipment further: a stand is half a metre wide, and the
 * dog walks a little aside of the handler — at 0.75 m a dog passing on that side brushed a
 * stand or a cone (walked through in animation, R16).
 */
export const STAND_SPACING = 1
/**
 * The direction changes only on the cards (author, 2026-10-21; §3.5: "Cviky musí být
 * umístěny přirozeně ve směru postupu týmu"): between two cards the team walks straight on
 * the way the exercise ends. After a turn about on the spot it walks back beside its way in
 * (a hairpin on the plan), this many metres to the side it turned — straight back it would
 * run into the cards it has just passed.
 */
export const HAIRPIN_WIDTHS = [1, 2, 3]
/** §3.5: "V parkuru mohou být celkem dvě překážky" (FCI; `course.maxJumps` per class). */
export const MAX_JUMPS = 2

export type PlacedProp = Point & {
  kind: Prop['kind']
  heading: number
  /** Nothing else within this many metres (`Prop.clear`), else `PROP_SPACING`. */
  clear?: number
}

/**
 * A jump's uprights stand this far either side of its middle, metres: the bar "1–1,5 m"
 * wide (řád p. 10), 1.2 m as animated.
 */
export const JUMP_HALF_WIDTH = 0.6

/**
 * What a way walked keeps clear of for a piece of equipment: a jump its middle and both its
 * uprights, the bar across `heading` — a way 1 m from its middle could pass 0.4 m from an
 * upright (walked through in animation, R17).
 */
export const propPoints = (p: PlacedProp): Point[] =>
  p.kind === 'jump'
    ? [p, offset(p, p.heading, 0, -JUMP_HALF_WIDTH), offset(p, p.heading, 0, JUMP_HALF_WIDTH)]
    : [p]

/** What an exercise sets out on the field and where the team leaves it. */
export type Shape = {
  props: PlacedProp[]
  /** Where and in which direction the team walks off after the exercise. */
  exit: Pose
  /** Steps back end here; the team then walks on past its card (kept clear of the others). */
  back?: Point
  /**
   * National exercises that take the team on (a slalom, a figure eight, steps forward):
   * the way from where they start to where they end (`CardGeometry.via` between), kept
   * clear like the way between two cards.
   */
  walk?: Point[]
  /**
   * The exercise turns the team about on the spot: the walk on goes back beside the way in,
   * to this side of the exit heading (1 = right, −1 = left).
   */
  hairpin?: 1 | -1
  /** The recall cone is part of the exercise: the next card stands 5 m past it. */
  recallCone: boolean
  /** The next exercise at least this far past the exit (`CardGeometry.gap`). */
  minNext?: number
  /** A leave card: where its follow-up stands (`CardGeometry.followUp`). */
  followUp?: { ahead: number; shifts?: number[] }
}

/**
 * How the next card is approached from the previous exercise: straight on, `min`–`max` m
 * ahead, shifted to the side by one of `shifts` (metres, right positive — 0 but after a
 * turn about or for a recall card set to the side). `hairpin`: after a turn about the
 * shift may be anywhere between the smallest and the largest of `shifts`.
 */
export type Approach = { min: number; max: number; shifts: number[]; hairpin?: boolean }

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

/**
 * The D0 card stands "těsně vpravo vedle … hlavní karty" (řád §5.3, p. 8): its stand this far
 * to the right of the main card's, as the team faces them, metres (as in the animations).
 */
export const D0_BESIDE = 0.55

/** How far the card stands from where its exercise is done (FCI). */
const SIGN_OFFSET = 1.1
/**
 * National cards (§5.3.1, p. 8): the exercise starts in a 120 cm square "vlevo před kartou"
 * — the card at its front right corner, as in the animations — or, for a change of
 * direction or a side step, "cca 120 cm přímo před příslušnou kartou".
 */
const NATIONAL_SIGN = { ahead: 0.45, right: 0.75, before: 1.2 }

type Placed = Pick<Card, 'ruleset' | 'placement' | 'geometry'>

/**
 * The way a card's sideways distances point: FCI towards the dog's side, national always
 * to the left — national cards keep their layout with the dog on the right.
 */
/**
 * Which way the dog's side is (1 right, −1 left) for an exercise's geometry: FCI's follows the
 * dog, national geometry is the card's own — a turn to the right stays one with the dog on the
 * right — but for a jump, which stands on the dog's side: the dog goes over it beside the
 * handler (walked through in animation, R17).
 */
const toDogOf = (card: Pick<Card, 'ruleset' | 'geometry'>, side: Side) =>
  (card.ruleset === 'FCI' || !!card.geometry?.props?.some((p) => p.kind === 'jump')) &&
  side === 'right'
    ? 1
    : -1

/**
 * Where the card itself stands. FCI §4.3: "Pokud se směr trasy nemění, provádí se cvik na
 * levé straně karty (A)" — the card is to the team's right; "Pokud se mění směr postupu
 * … provádí se cvik před kartou (B)" — the card is ahead. Start, finish, recall (C) and
 * jump cards (D) stand like A. National cards the same way (`NATIONAL_SIGN`), or where
 * their geometry says (beside a line of cones). Without a card: a start or a finish.
 */
export function signOf(card: Placed | undefined, at: Pose): Point {
  const own = card?.geometry?.card
  if (own) return offset(at, at.heading, own.ahead, own.side * toDogOf(card, 'left'))
  const before = card?.placement === 'B'
  if (card?.ruleset === 'CZ') {
    return before
      ? offset(at, at.heading, NATIONAL_SIGN.before)
      : offset(at, at.heading, NATIONAL_SIGN.ahead, NATIONAL_SIGN.right)
  }
  return before ? offset(at, at.heading, SIGN_OFFSET) : offset(at, at.heading, 0.2, SIGN_OFFSET)
}

/** The stand of the D0 card dealt with a national card that needs one, beside the card. */
export function d0StandOf(card: Placed & Pick<Card, 'sequencing'>, at: Pose): Point | undefined {
  if (card.ruleset !== 'CZ' || !card.sequencing.requiresSupplementary) return undefined
  return offset(signOf(card, at), at.heading, 0, D0_BESIDE)
}

/**
 * Several cards at one station (CNDC, plan R18): "Cviky s několika dílčími cviky … mohou
 * zahrnovat až 3 cviky umístěné přímo vedle sebe" (řád p. 16). The first card stands where its
 * own placement puts it — a group with a change of direction starts with one (Směrnice §1.1.6),
 * so its cards stand in the team's way then — each next one beside the one before, its D0
 * card in between ("302 + D0c + 031" on a real plan), on one line facing the team as it comes
 * in to the first.
 */
export function standsOf(
  station: { card: Placed & Pick<Card, 'sequencing'>; at: Pose }[],
): { sign: Point; d0?: Point }[] {
  const first = station[0]
  if (!first) return []
  const heading = first.at.heading
  let next = signOf(first.card, first.at)
  return station.map(({ card }) => {
    const sign = next
    const d0 =
      card.ruleset === 'CZ' && card.sequencing.requiresSupplementary
        ? offset(sign, heading, 0, D0_BESIDE)
        : undefined
    next = offset(d0 ?? sign, heading, 0, D0_BESIDE)
    return { sign, ...(d0 && { d0 }) }
  })
}

/**
 * The next exercise of a CNDC starts where the one before ends — "bezprostředně za sebou nebo s
 * mezikrokem" — after a dynamic one past "krok dopředu pro ukončení cviku" (řád p. 16): a
 * step this long, metres (as animated, `SCRIPTED_STEP`). The optional step between is left out.
 */
export const CNDC_STEP = 0.55
/**
 * After a CNDC with a dynamic exercise the next station stands further: "Při stavbě CNDC s
 * dynamickými cviky (B) … se minimální vzdálenost zvyšuje o 1 m" (Směrnice §1.1.2) — the
 * steps forward and between shorten the way to it. Metres, onto the 3–5 m of `approachOf`.
 */
export const CNDC_EXTRA = 1

/**
 * A card done at a station of several (CNDC) where the station's cards stand: each either where
 * its own card would stand, or further along the station's line of cards from there (its
 * exercise keeps clear of its own card as on its own, and the station's line goes on away from
 * the team) — within `OWN_PLACE` of that line — or `CNDC_ROOM` from where it is done: after a
 * turn the station's stand is no longer where the exercise has its card, and a handler going
 * round the dog came within 0.2 m of it (walked through in animation). Not along the line for
 * the cards whose dog works between the handler and the card (`ROOM_BEFORE`).
 */
export const CNDC_ROOM = 1.5
const OWN_PLACE = 0.3
export function clearOfStation(
  card: Placed & Pick<Card, 'code'>,
  at: Pose,
  stands: Point[],
  side: Side,
): boolean {
  const near = ROOM_BEFORE[side].has(card.code) ? () => false : alongOwnCard(card, at)
  return stands.every((p) => distance(p, at) >= CNDC_ROOM || near(p))
}

/**
 * Whether a card of a station of several (CNDC) stands where `card`, done at `at`, has its own
 * card, or further along the station's line of cards from there, away from the team
 * (`OWN_PLACE` either way) — its exercise and the way on keep clear of such a stand as of its
 * own card; of any other the way on keeps clear like of another station's.
 */
export function alongOwnCard(card: Placed, at: Pose): (p: Point) => boolean {
  const own = walkOf(at, { ...signOf(card, at), heading: at.heading }) as Walk
  return (p) => {
    const stand = walkOf(at, { ...p, heading: at.heading }) as Walk
    return Math.abs(stand.ahead - own.ahead) <= OWN_PLACE && stand.across >= own.across - OWN_PLACE
  }
}
type Walk = { ahead: number; across: number }

/**
 * The cards whose animation stops the handler further from the card than usual, the dog working
 * between them — in front (Z-014, 1-124, 1-125, …) or round them (3-315, 3-318), with the dog on
 * the right also the handler round the dog (Z-004, Z-005, 3-303) and its spin ahead (2-219):
 * done where the exercise before ends, the station's cards stood too close (walked through in
 * animation; the animations' `stopAt`, kept in step by a test).
 */
const ROOM_BEFORE_LEFT = [
  'Z-014',
  'Z-025',
  'Z-032',
  '1-108',
  '1-114',
  '1-115',
  '1-116',
  '1-121',
  '1-122',
  '1-124',
  '1-125',
  '2-221',
  '2-222',
  '3-315',
  '3-318',
]
export const ROOM_BEFORE: Record<Side, Set<string>> = {
  left: new Set(ROOM_BEFORE_LEFT),
  right: new Set([...ROOM_BEFORE_LEFT, 'Z-004', 'Z-005', '2-219', '3-303']),
}

/** The approach to the next station after a CNDC with a dynamic exercise (`CNDC_EXTRA`). */
export function afterDynamicStation(approach: Approach): Approach {
  // A follow-up stands where its leave card says.
  if (approach.min === approach.max) return approach
  return { ...approach, min: approach.min + CNDC_EXTRA, max: approach.max + CNDC_EXTRA }
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
  const toDog = toDogOf(card, side)
  const props: PlacedProp[] = (geometry.props ?? []).map((p) => ({
    kind: p.kind,
    heading: at.heading,
    ...offset(at, at.heading, p.ahead, p.side * toDog),
    ...(p.clear && { clear: p.clear }),
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
  const across = (geometry.exitSide ?? 0) * toDog
  // Turned about where the exercise is done: a right turn brings the team back on the
  // right of its way in, which is the left of the way out.
  const hairpin =
    !ahead && !across && normalize(at.turn) === 180 ? (at.turn > 0 ? -1 : 1) : undefined
  const exit = {
    ...offset(at, at.heading, ahead, across),
    heading: normalize(at.heading + at.turn),
  }
  const minNext = geometry.gap && Math.max(0, geometry.gap - distance(at, exit))
  const via = (geometry.via ?? []).map(([a, s]) => offset(at, at.heading, a, s * toDog))
  const walk =
    card.ruleset === 'CZ' && (via.length || distance(at, exit) >= 1)
      ? [at, ...via, exit]
      : undefined
  const followUp = geometry.followUp && {
    ahead: geometry.followUp.ahead,
    ...(geometry.followUp.sides && { shifts: geometry.followUp.sides.map((s) => s * toDog) }),
  }
  return {
    props,
    exit,
    ...(back && { back }),
    ...(walk && { walk }),
    ...(hairpin && { hairpin }),
    recallCone,
    ...(minNext && { minNext }),
    ...(followUp && { followUp }),
  }
}

/** How far and where the next card stands from the end of the previous exercise. */
export function approachOf(previous: Shape | undefined, next: Card | undefined): Approach {
  const own = next?.geometry
  const lead = previous?.followUp
  // A recall card stands straight ahead of the leave card, at the distance it states —
  // or the leave card's, if further — and to the side if either of them says so.
  if (own?.fromPrevious || lead) {
    const ahead = Math.max(own?.fromPrevious ?? 0, lead?.ahead ?? 0)
    const shifts = lead?.shifts ??
      own?.fromPreviousSides?.map((s) => s * toDogOf(next as Card, 'left')) ?? [0]
    return { min: ahead, max: ahead, shifts }
  }
  const side = previous?.hairpin
  const shifts = side ? HAIRPIN_WIDTHS.map((w) => w * side) : [0]
  const hairpin = !!side
  if (previous?.recallCone) {
    return { min: RECALL_DISTANCE, max: RECALL_DISTANCE, shifts, hairpin }
  }
  // Some exercises need more room before the next one (`CardGeometry.gap`).
  const min = Math.max(GAP_MIN, previous?.minNext ?? 0)
  return { min, max: Math.max(GAP_MAX, min + GAP_MAX - GAP_MIN), shifts, hairpin }
}

/** Going on past a leave card's jump, the handler is this far past it before turning off, metres. */
export const PAST_THE_JUMP = 1

/**
 * After a turn about the team gets over beside its way in within this far, and as far again
 * as it goes aside, metres — as it is walked through in animation (R16).
 */
export const HAIRPIN_JOIN = 1.2
/**
 * …and at the latest this far before the finish line (`toFinish`; a card's place: 0.5 m) —
 * walked through in animation, the team joins the line before it straightens up for it, and
 * over later its dog went along the end of a jump (R17). Before every card too, the courses
 * of RO3 would not fit as often, and take much longer to deal.
 */
export const FINISH_STRAIGHT = 1.5

/**
 * The way to the next card, from where the exercise ends to where `to` is: straight on — or
 * after a turn about over beside the way in first (`HAIRPIN_JOIN`), then straight on.
 */
export function wayTo(
  previous: Shape | undefined,
  from: Pose,
  to: Point,
  toFinish = false,
): Point[] {
  // From a leave card with a jump to a follow-up set aside (3-314): on past the jump first,
  // along it, then over at a slant — as walked through in animation (a card stood on that way).
  const jump = previous?.followUp?.shifts && previous.props.find((p) => p.kind === 'jump')
  if (jump) {
    const ahead = (walkOf(from, { ...jump, heading: from.heading }) as { ahead: number }).ahead
    return [from, offset(from, from.heading, ahead + PAST_THE_JUMP), to]
  }
  if (!previous?.hairpin) return [from, to]
  const walk = walkOf(from, { ...to, heading: from.heading })
  if (!walk) return [from, to]
  const join = Math.min(
    HAIRPIN_JOIN + Math.abs(walk.across),
    Math.max(0, walk.ahead - (toFinish ? FINISH_STRAIGHT : 0.5)),
  )
  return [from, offset(from, from.heading, join, walk.across), to]
}

/**
 * The dog's way when a national follow-up calls it (2-213–2-216, 3-302, 3-308, …): from where
 * it was left — about where the leave card was done — over the leave card's jump if it has one
 * (2-218, 3-314), to the handler at the follow-up. It runs straight there, not along the
 * handler's way (at a slant to a card set aside, 3-301, 3-314): it is kept clear like a way
 * walked (walked through in animation, a dog ran past another station's card).
 */
export function dogWayOf(leave: Placement, leaveShape: Shape, to: Point): Point[] {
  const jump = leaveShape.props.find((p) => p.kind === 'jump')
  return [leave, ...(jump ? [jump] : []), to]
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

/** Shortest distance from `p` to a way of straight pieces through `points`. */
export function distanceToWay(p: Point, points: Point[]): number {
  if (points.length === 1) return distance(p, points[0] as Point)
  let least = Infinity
  for (let i = 1; i < points.length; i++) {
    least = Math.min(least, distanceToSegment(p, points[i - 1] as Point, points[i] as Point))
  }
  return least
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
