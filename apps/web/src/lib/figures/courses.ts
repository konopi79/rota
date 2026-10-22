import { smoothHeadings, type Path } from './paths'

/**
 * Courses the whole team walks round equipment — spirals and slaloms round cones (regulation
 * p. 24–28). Coordinates are those of the place where the course begins: the handler there
 * at the origin facing +z, +x to the handler's left (the dog's side). The path is the
 * handler's; the dog keeps to its place at heel, outside or inside the bends.
 */

type Point = { x: number; z: number }
type Piece = (u: number) => Point

/** A course: the handler's path, where each of its parts begins (metres), its equipment. */
export type Course = {
  path: Path
  starts: number[]
  cones: Point[]
  bowls?: Point[]
  /** Where the card stands, when the course says. */
  card?: Point
}

/** Cones in a row "s rozestupem 1,5 m od sebe" (p. 24–28). */
export const CONE_GAP = 1.5

const line =
  (ax: number, az: number, bx: number, bz: number): Piece =>
  (u) => ({ x: ax + (bx - ax) * u, z: az + (bz - az) * u })

/** Round (cx, cz) at radius r, from angle a to b (radians; 0 = +x, π/2 = +z). */
const arc =
  (cx: number, cz: number, r: number, a: number, b: number): Piece =>
  (u) => ({ x: cx + r * Math.cos(a + (b - a) * u), z: cz + r * Math.sin(a + (b - a) * u) })

/** The pieces one after another as a path walked at even speed, and where each begins. */
const course = (pieces: Piece[], cones: Point[], mirror = false): Course => {
  const flip = (p: Point) => (mirror ? { x: -p.x, z: p.z } : p)
  return walked(pieces, flip, cones.map(flip))
}

/** A figure with bowls instead of cones, moved into place by `place`. */
const placed = (pieces: Piece[], place: (p: Point) => Point, bowls: Point[]): Course => ({
  ...walked(pieces, place, []),
  bowls,
})

/** The pieces, each point moved by `move`, as a path walked at even speed. */
const walked = (pieces: Piece[], move: (p: Point) => Point, cones: Point[]): Course => {
  const points: Point[] = []
  const starts: number[] = []
  const lengths: number[] = []
  let length = 0
  for (const piece of pieces) {
    starts.push(length)
    for (let i = points.length ? 1 : 0; i <= PIECE_SAMPLES; i++) {
      const p = move(piece(i / PIECE_SAMPLES))
      const last = points.at(-1)
      if (last) length += Math.hypot(p.x - last.x, p.z - last.z)
      points.push(p)
      lengths.push(length)
    }
  }
  const headings = smoothHeadings(points)
  const path: Path = {
    length,
    at(s) {
      const target = Math.min(Math.max(s, 0), length)
      // The first sample at or past `target`.
      let lo = 1
      let hi = points.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (lengths[mid]! < target) lo = mid + 1
        else hi = mid
      }
      const k = (target - lengths[lo - 1]!) / (lengths[lo]! - lengths[lo - 1]! || 1)
      const a = points[lo - 1]!
      const b = points[lo]!
      const heading = headings[lo - 1]! + (headings[lo]! - headings[lo - 1]!) * k
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, heading }
    },
  }
  return { path, starts, cones }
}
const PIECE_SAMPLES = 300

/** The first cone, this far ahead of where the course begins, metres — the loops round it keep clear of the card. */
const FIRST_CONE = 2.5
const conesAt = (x: number) => [0, 1, 2].map((i) => ({ x, z: FIRST_CONE + i * CONE_GAP }))

/**
 * How far the handler keeps from the cones, metres: with the dog outside the bends just
 * clear of them, with the dog inside (between the handler and the cones) far enough for it.
 */
export const CONE_CLEARANCE = { dogOutside: 0.5, dogInside: 0.95 }

/**
 * Z-018 / Z-019 Spirála (p. 24): past the card and the cones, round the third (furthest) and
 * back to the first, round it; round the second and back to the first — the execution
 * diagram on the card. Round the first cone the last time the team turns 270° and leaves
 * straight on between the first and the second cone, square to the way in (the video; the
 * author). Built turning right, cones on the handler's right; `left` mirrors it. Parts: 0
 * to the third cone and back, 4 to the second and back, 7 round the first, 8 away.
 */
export const spiral = (left: boolean): Course => {
  const r = left ? CONE_CLEARANCE.dogInside : CONE_CLEARANCE.dogOutside
  const [z1, z2, z3] = conesAt(0).map((c) => c.z) as [number, number, number]
  const round = (z: number): Piece[] => [
    line(0, z === z3 ? 0 : z1, 0, z),
    arc(-r, z, r, 0, Math.PI),
    line(-2 * r, z, -2 * r, z1),
    arc(-r, z1, r, Math.PI, 2 * Math.PI),
  ]
  return course(
    [
      ...round(z3),
      ...round(z2).slice(0, 3),
      arc(-r, z1, r, Math.PI, (5 * Math.PI) / 2),
      line(-r, z1 + r, -r - 2.5, z1 + r),
    ],
    conesAt(-r),
    left,
  )
}

/**
 * Z-026 / Z-027 Kruhová spirála (p. 27): round the first cone, on to the second and round it,
 * then round the third; on past it. Turning right, cones on the handler's right; `left`
 * mirrors it. Parts: 1, 3, 5 round the first, second, third cone.
 */
export const circleSpiral = (left: boolean): Course => {
  const r = left ? CONE_CLEARANCE.dogInside : CONE_CLEARANCE.dogOutside
  const zs = conesAt(0).map((c) => c.z) as [number, number, number]
  return course(
    [
      line(0, 0, 0, zs[0]),
      arc(-r, zs[0], r, 0, 2 * Math.PI),
      line(0, zs[0], 0, zs[1]),
      arc(-r, zs[1], r, 0, 2 * Math.PI),
      line(0, zs[1], 0, zs[2]),
      arc(-r, zs[2], r, 0, 2 * Math.PI),
      line(0, zs[2], 0, zs[2] + 1),
    ],
    conesAt(-r),
    left,
  )
}

/** Slalom: how far the middle of the team swings off the cones' line, metres. */
const WEAVE = 0.6
/** From the handler to the middle of the team (the dog at heel on the left), metres. */
const TEAM_MIDDLE = 0.21

/**
 * Z-020 / Z-021 Slalom (p. 25): four cones; "Tým vstupuje do slalomu vždy zprava (tj. první
 * kužel po své levé straně)" and weaves through, the team's middle swinging `WEAVE` to
 * either side of each cone — the dog passes between handler and cone where the cone is on
 * the left. `back`: round the last cone and through again the other way. Parts: 0 to the
 * slalom, 1 through it, 2 round the last cone, 3 back through.
 */
export const slalom = (back: boolean): Course => {
  const cone = TEAM_MIDDLE + WEAVE
  const zs = [0, 1, 2, 3].map((i) => FIRST_CONE + i * CONE_GAP)
  const first = zs[0]!
  const last = zs[3]!
  const weave =
    (centre: number, from: number, to: number): Piece =>
    (u) => {
      const z = from + (to - from) * u
      return { x: centre - WEAVE * Math.cos((Math.PI * (z - from)) / CONE_GAP), z }
    }
  const there = weave(WEAVE, first, last)
  const pieces = back
    ? [
        line(0, 0, 0, first),
        there,
        // Round the last cone (on the right) to its far side, then back through.
        arc(cone, last, 2 * WEAVE - cone, 0, Math.PI),
        weave(cone + TEAM_MIDDLE, last, first),
        line(cone + TEAM_MIDDLE + WEAVE, first, cone + TEAM_MIDDLE + WEAVE, first - 1),
      ]
    : [line(0, 0, 0, first), there, line(2 * WEAVE, last, 2 * WEAVE, last + 1)]
  return course(
    pieces,
    zs.map((z) => ({ x: cone, z })),
  )
}

/**
 * Z-022 Figura 8 bez rušivého vlivu (p. 25): four covered bowls on the corners of a rhombus,
 * "delší pomyslná spojnice dvou protilehlých misek je 3 m a kratší … 1,5 m"; "tým musí
 * celkem 3x protnout pomyslný střed obrazce, přičemž vždy postupně obchází misky ležící na
 * delší pomyslné spojnici. Východ z figury se vždy nachází na protilehlé straně proti
 * vstupu." As the card draws it (the author): the short diagonal points the way the team
 * comes, the card stands on its line below the near corner, the bowls to go round are left
 * and right. The team comes up right of that line — the card on the dog's left — bends left
 * round the near bowl into the middle (once), round the left bowl, through the middle
 * (twice), round the right bowl, through the middle (three times), and bends right to leave
 * upwards, on the far side. Round the left bowl the dog is inside, so the handler keeps
 * `dogInside` off it; through the middle the team's middle passes the figure's. Parts: 0 to
 * the figure, 1 in through the middle, 2 round the left bowl, 3 back through, 4 round the
 * right bowl, 5 through again, 6 out.
 */
export const figureEight = (): Course => {
  const half = 1.5
  const outer = CONE_CLEARANCE.dogInside
  const inner = outer - 2 * TEAM_MIDDLE
  // Through the middle the handler goes at a slant to the long diagonal, just clearing
  // the bowls at its ends; one way it heads `through`, back the other way.
  const slant = Math.asin((outer - TEAM_MIDDLE) / half)
  const [s, c] = [Math.sin(slant), Math.cos(slant)]
  // The middle at the origin, the short diagonal along z (the way in), the long one along x:
  // the left bowl (+x) gone round turning left, the right one (-x) turning right.
  const leftBowl = { x: half, z: 0 }
  const rightBowl = { x: -half, z: 0 }
  const through = Math.PI / 2 - slant // heading up and to the left
  const dir = { x: c, z: s }
  const leftOf = (h: number) => ({ x: Math.cos(h), z: -Math.sin(h) })
  const back = through + Math.PI + 2 * slant // heading back through, down to the right
  const t1 = minus(leftBowl, leftOf(through), outer) // round the left bowl from here
  const t2 = minus(leftBowl, leftOf(back), outer) // back from it
  const t3 = plus(rightBowl, leftOf(back), inner) // round the right bowl from here
  const t4 = plus(rightBowl, leftOf(through), inner) // back from it
  const angle = (p: Point, centre: Point) => Math.atan2(p.z - centre.z, p.x - centre.x)
  const round = Math.PI + 2 * slant

  // In: up right of the short diagonal, then a left bend onto the way through.
  const bend = 0.9
  const upRight = -0.95
  const reach = (upRight - t4.x - bend * (Math.cos(through) - 1)) / dir.x
  const joinIn = plus(t4, dir, reach)
  const centreIn = plus(joinIn, leftOf(through), bend)
  const endUp = { x: centreIn.x - bend, z: centreIn.z }
  const start = { x: upRight, z: endUp.z - 2 }
  // Out: on the third time through, a right bend to head up and away.
  const joinOut = plus(t4, dir, reach + 2.2)
  const centreOut = minus(joinOut, leftOf(through), bend)
  const leave = { x: centreOut.x + bend, z: centreOut.z }

  const pieces: Piece[] = [
    line(start.x, start.z, endUp.x, endUp.z),
    // Turning left the angle round a centre falls; turning right it rises.
    arc(centreIn.x, centreIn.z, bend, Math.PI, Math.PI - through),
    line(joinIn.x, joinIn.z, t1.x, t1.z),
    arc(leftBowl.x, leftBowl.z, outer, angle(t1, leftBowl), angle(t1, leftBowl) - round),
    line(t2.x, t2.z, t3.x, t3.z),
    arc(rightBowl.x, rightBowl.z, inner, angle(t3, rightBowl), angle(t3, rightBowl) + round),
    line(t4.x, t4.z, joinOut.x, joinOut.z),
    arc(centreOut.x, centreOut.z, bend, -through, 0),
    line(leave.x, leave.z, leave.x, leave.z + 2.5),
  ]
  const bowls = [leftBowl, rightBowl, { x: 0, z: -0.75 }, { x: 0, z: 0.75 }]
  // Moved so the course starts at the origin; the card on the short diagonal's line, below
  // the near bowl, passed on the dog's left on the way up.
  const place = (p: Point): Point => ({ x: p.x - start.x, z: p.z - start.z })
  return { ...placed(pieces, place, bowls.map(place)), card: place({ x: 0, z: -1.9 }) }
}

const plus = (p: Point, d: Point, k: number): Point => ({ x: p.x + d.x * k, z: p.z + d.z * k })
const minus = (p: Point, d: Point, k: number): Point => plus(p, d, -k)
