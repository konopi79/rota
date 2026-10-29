import { ease } from './math'

/**
 * Paths the handler walks apart from the team — around the dog now, around cones later.
 * Coordinates are the team's: the handler's base place at the origin facing +z, +x to the
 * left (the dog's side).
 */

export type PathPoint = { x: number; z: number; heading: number }

export type Path = {
  /** Length in metres. */
  length: number
  /** Where the walker is after `s` metres, facing along the path (heading 0 = +z). */
  at: (s: number) => PathPoint
}

/**
 * Which way a walker along `points` faces at each of them — turning on continuously, never
 * jumping by a whole turn where the angle wraps round — so between two points it can turn
 * smoothly from one to the next.
 */
export const smoothHeadings = (points: readonly { x: number; z: number }[]): number[] => {
  const headings: number[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)]!
    const b = points[Math.min(points.length - 1, i + 1)]!
    const raw = Math.atan2(b.x - a.x, b.z - a.z)
    const before = headings[i - 1]
    headings.push(
      before === undefined
        ? raw
        : before + Math.atan2(Math.sin(raw - before), Math.cos(raw - before)),
    )
  }
  return headings
}

/** A path from a curve over t ∈ [0, 1], walked at even speed (sampled by arc length). */
export const pathFromCurve = (
  curve: (t: number) => { x: number; z: number },
  samples = 400,
): Path => {
  const points = Array.from({ length: samples + 1 }, (_, i) => curve(i / samples))
  const lengths = [0]
  for (let i = 1; i <= samples; i++)
    lengths.push(
      lengths[i - 1]! +
        Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z),
    )
  const length = lengths[samples]!
  const headings = smoothHeadings(points)
  return {
    length,
    at(s) {
      const target = Math.min(Math.max(s, 0), length)
      let i = 1
      while (i < samples && lengths[i]! < target) i++
      const k = (target - lengths[i - 1]!) / (lengths[i]! - lengths[i - 1]! || 1)
      const a = points[i - 1]!
      const b = points[i]!
      const heading = headings[i - 1]! + (headings[i]! - headings[i - 1]!) * k
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, heading }
    },
  }
}

/** How far behind the handler's base place the path round the dog goes, metres. */
const BEHIND_DOG = 1.25

/**
 * Around the dog at heel, "zepředu" (regulation p. 19, Z-004/Z-005; 3-303 standing): a step
 * forward, across in front of the dog, back along its far side, behind it and up to the
 * base place again. Half an ellipse 1.1 m across (round enough for a person to walk without
 * crossing their feet) and 0.9 m ahead, then a deeper one behind — clear of the rump and the
 * tail, on the ground behind a sitting or lying dog, up behind a standing one — coming back
 * up to the base place from straight behind. Round its tight ends the handler slows down.
 */
export const AROUND_DOG: Path = pathFromCurve((t) => {
  const angle = 2 * Math.PI * t
  const sin = Math.sin(angle)
  return { x: 0.55 - 0.55 * Math.cos(angle), z: sin * (sin > 0 ? 0.9 : BEHIND_DOG) }
})

/** How sharply the path bends from `behind` before `s` to `ahead` past it, at most: radians per metre. */
export const bendAhead = (path: Path, s: number, ahead = 0.4, behind = 0.25): number => {
  const STEP = 0.05
  let most = 0
  // A little behind too: out of a bend a walker picks up speed only once round it.
  for (let d = -Math.min(behind, s); d < ahead && s + d < path.length; d += STEP) {
    const a = path.at(s + d).heading
    const b = path.at(s + d + STEP).heading
    most = Math.max(most, Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) / STEP)
  }
  return most
}

/** Pieces of a path, each over u ∈ [0, 1], walked one after another. */
const chain =
  (...pieces: ((u: number) => { x: number; z: number })[]) =>
  (t: number) => {
    const k = Math.min(pieces.length - 1, Math.floor(t * pieces.length))
    return pieces[k]!(t * pieces.length - k)
  }

/** A cubic Bézier curve from p0 to p3: it leaves p0 towards p1 and arrives at p3 from p2. */
const bezier =
  (p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number]) =>
  (u: number) => {
    const v = 1 - u
    const w = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u] as const
    return {
      x: w[0] * p0[0] + w[1] * p1[0] + w[2] * p2[0] + w[3] * p3[0],
      z: w[0] * p0[1] + w[1] * p1[1] + w[2] * p2[1] + w[3] * p3[1],
    }
  }

/**
 * The dog's paths around the handler, who stands at the origin facing +z; the dog's places
 * are those of `team.ts` — at heel (0.42, −0.2) and in front (0, `FRONT`) facing the handler.
 */

/**
 * How far in front of the handler the dog sits or stands facing them, middle to middle,
 * metres: its head clear of the handler's knees, even as one comes forward with a step back.
 */
export const FRONT = 0.64

/** From a dog's middle to its shoulders (its front paws' line), metres. */
const SHOULDERS = 0.22

/**
 * A dog that leads with its front and swings its rear round: its shoulders go along
 * `front`, and it turns from heading `from` to `to` — the turn starting a little after the
 * front sets off and ending a little after it arrives, the rear "drifting" into place.
 * Measured in metres of the shoulders' way plus the turn (at the dog's half length), so a
 * walker along it goes as far as the dog's paws do.
 */
const drift = (front: Path, from: number, to: number): Path => {
  const turn = Math.abs(to - from) * SHOULDERS
  const length = front.length + turn
  return {
    length,
    at(s) {
      const p = Math.min(1, Math.max(0, s / length))
      const f = front.at(front.length * ease(p / 0.75))
      const heading = from + (to - from) * ease((p - 0.15) / 0.85)
      return {
        x: f.x - SHOULDERS * Math.sin(heading),
        z: f.z - SHOULDERS * Math.cos(heading),
        heading,
      }
    },
  }
}

/**
 * Předsednutí (Z-014, p. 22): from heel the dog's front goes straight ahead and across in
 * front of the handler, and its rear swings out to the left and round — the author: "jít
 * předními přímo před psovoda a dotočit to zadkem". It ends sitting in front, facing them.
 */
export const DOG_TO_FRONT: Path = drift(
  pathFromCurve(bezier([0.42, 0.02], [0.42, 0.3], [0.15, FRONT - 0.18], [0, FRONT - SHOULDERS])),
  0,
  -Math.PI,
)

/**
 * D0a/D0c "Přiřazení okolo" (p. 17): from the front the dog runs round the handler "z pravé
 * strany" — past their right side, behind them — and comes up on the left into heel. It
 * sets off the way it faces, bends out to the handler's right side and follows an ellipse
 * round the handler, 0.45 m to the sides and 0.6 m behind.
 */
export const DOG_AROUND_HANDLER: Path = pathFromCurve(
  chain(bezier([0, FRONT], [0, FRONT - 0.15], [-0.45, 0.4], [-0.45, 0]), (u) => {
    const angle = Math.PI / 2 + u * (Math.PI / 2 + 1.2)
    return { x: -0.45 * Math.sin(angle), z: 0.6 * Math.cos(angle) }
  }),
)

/**
 * Z-023 "Pes oběhne psovoda zepředu" (p. 26): from heel the dog goes ahead and across in front
 * of the handler, then round the handler's right side and behind them back into heel — the
 * same ellipse round the handler as for D0a.
 */
export const DOG_AROUND_FROM_HEEL: Path = pathFromCurve(
  chain(bezier([0.42, -0.2], [0.42, 0.35], [0.3, 0.6], [0, 0.6]), (u) => {
    const angle = u * (Math.PI + 1.2)
    return { x: -0.45 * Math.sin(angle), z: 0.6 * Math.cos(angle) }
  }),
)

/**
 * D0b/D0d "Přiřazení přímo" (p. 17): from the front straight to the left leg, without going
 * round the handler: the dog's front steps across to the handler's left leg while its rear
 * swings out to the left and round behind, into heel.
 */
export const DOG_TO_HEEL: Path = drift(
  // Its shoulders swing out wide to the left while it turns, its head clear of the handler's
  // left leg, and come in to heel from the front.
  pathFromCurve(bezier([0, FRONT - SHOULDERS], [0.3, 0.45], [0.62, 0.3], [0.42, 0.02])),
  Math.PI,
  2 * Math.PI,
)

/** The dog turning on the spot at `at` from heading `from` to `to` (as far as its paws go). */
const spin = (at: { x: number; z: number }, from: number, to: number): Path => {
  const length = Math.abs(to - from) * SHOULDERS
  return {
    length,
    at: (s) => ({
      ...at,
      heading: from + (to - from) * ease(Math.min(1, Math.max(0, s / length))),
    }),
  }
}

/** The dog going straight from `from` to `to`, facing `heading` all the way (backing up). */
const straight = (
  from: { x: number; z: number },
  to: { x: number; z: number },
  heading: number,
): Path => {
  const length = Math.hypot(to.x - from.x, to.z - from.z)
  return {
    length,
    at(s) {
      const k = Math.min(1, Math.max(0, s / length))
      return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, heading }
    },
  }
}

/** The first `length` metres of `path`. */
export const partOf = (path: Path, length: number): Path => ({
  length,
  at: (s) => path.at(Math.min(s, length)),
})

/** Paths one after another. */
const joined = (...paths: Path[]): Path => ({
  length: paths.reduce((sum, p) => sum + p.length, 0),
  at(s) {
    let left = s
    for (const p of paths.slice(0, -1)) {
      if (left <= p.length) return p.at(left)
      left -= p.length
    }
    return paths.at(-1)!.at(left)
  },
})

/**
 * 1-124 Stop – změna za psovodem – stop (p. 38): "pes za zády psovoda změní stranu a
 * následně se posadí vedle druhé nohy psovoda." Straight behind the handler's back, as in
 * the video (the author): the dog backs a step out of heel, turns right towards the
 * handler's back — its head passing behind their legs, its rear swinging out — crosses
 * close behind them and turns into the right leg, facing on.
 */
const BACKED = { x: 0.42, z: -0.5 }
const BEHIND_TO = -0.52
export const DOG_BEHIND_TO_RIGHT: Path = joined(
  straight({ x: 0.42, z: -0.2 }, BACKED, 0),
  spin(BACKED, 0, -Math.PI / 2),
  pathFromCurve(bezier([BACKED.x, BACKED.z], [0.1, -0.5], [-0.27, -0.46], [-0.42, -0.2])),
  spin({ x: -0.42, z: -0.2 }, BEHIND_TO, 0),
)

/**
 * 1-125 Stop – změna před psovodem – stop (p. 38): "pes jej zepředu obejde a přiřadí se k
 * druhé noze psovoda, kde usedá." Ahead from the left leg, across in front of the handler,
 * down past their right side and round, turning in behind them, up into the right leg —
 * its rear swinging out, never in at the handler. The turn in is an even half circle, so the
 * dog can go the whole way at one pace (the author).
 */
const TURN_IN = 0.25
export const DOG_FRONT_TO_RIGHT: Path = joined(
  pathFromCurve(
    bezier([0.42, -0.2], [0.42, 0.85], [-0.42 - 2 * TURN_IN, 0.85], [-0.42 - 2 * TURN_IN, -0.3]),
  ),
  pathFromCurve((u) => {
    const angle = Math.PI * (1 + u)
    return { x: -0.42 - TURN_IN + TURN_IN * Math.cos(angle), z: -0.3 + TURN_IN * Math.sin(angle) }
  }),
  pathFromCurve((u) => ({ x: -0.42, z: -0.3 + 0.1 * u })),
)

/**
 * Changing sides while the team walks on, in the team's frame (it moves with the handler):
 * 1-123 "Pes … provede za psovodem výměnu strany … Pes nesmí při výměně udělat velký
 * oblouk" (p. 38) — dropping back close behind the handler; 3-327 "běží diagonálně před
 * psovodem a zaujme novou pozici nohy na druhé straně. Nesmí běhat v kruhu" (p. 61) —
 * ahead across in front. The dog faces the way it goes over the ground (`exercise.ts`).
 */
export const DOG_WALKING_BEHIND: Path = pathFromCurve(
  bezier([0.42, -0.2], [0.42, -1.0], [-0.42, -1.0], [-0.42, -0.2]),
)
export const DOG_WALKING_IN_FRONT: Path = joined(
  // Across a little ahead of the handler — not so far it has to wait for them (the author) —
  // then straight back down into the right leg, square to it by then.
  pathFromCurve(bezier([0.42, -0.2], [0.3, 0.75], [-0.42, 0.85], [-0.42, 0.4])),
  pathFromCurve((u) => ({ x: -0.42, z: 0.4 - 0.6 * u })),
)

/**
 * 2-208 Pes okolo psovoda v pohybu (p. 41): "velí psovi, aby jej za pohybu zepředu oběhl."
 * Round the walking handler, in the team's frame: ahead and across in front, down the right
 * side, behind and up into the left leg — wider than round a standing handler (Z-023), clear
 * of legs that keep walking.
 */
/** Where the left leg's place lies on that ellipse (radians). */
const AROUND_FROM = Math.atan2((0.42 + 0.15) / 0.6, (-0.2 - 0.15) / 0.85)
export const DOG_WALKING_AROUND: Path = pathFromCurve((u) => {
  // An ellipse round the handler through the left leg — no corners, so the dog turns evenly
  // all the way: up the left side, across 1 m ahead, down the right side 0.75 m off, behind.
  const angle = AROUND_FROM - 2 * Math.PI * u
  return { x: -0.15 + 0.6 * Math.sin(angle), z: 0.15 + 0.85 * Math.cos(angle) }
})

/** The dog's place at the handler's left leg (`team.ts`), facing on. */
const HEEL_PLACE = { x: 0.42, z: -0.2 }

/** Further round than this from where it faces, a dog called first turns towards the handler. */
const TURNS_FIRST = Math.PI / 3
/** A dog called comes into its place along the way it then faces over this much at least, metres. */
const INTO_PLACE = 0.6

/**
 * A dog called from where it was left: from `at` (the handler's frame) it runs in a smooth
 * curve to `to`, arriving along `heading` — first turning on the spot towards the handler if
 * it faces away from them (a dog left facing on, the handler having walked round it).
 */
const runTo = (at: PathPoint, to: { x: number; z: number }, heading: number): Path => {
  const d = Math.hypot(to.x - at.x, to.z - at.z)
  const towards = Math.atan2(to.x - at.x, to.z - at.z)
  const turn = Math.atan2(Math.sin(towards - at.heading), Math.cos(towards - at.heading))
  const first = Math.abs(turn) > TURNS_FIRST ? at.heading + turn : at.heading
  // It comes in along `heading` from well behind its place — not turning into it at the end,
  // its head swinging in at the handler.
  const reach = Math.min(1.2, d / 3)
  const into = Math.min(1.2, Math.max(INTO_PLACE, d / 3))
  const run = pathFromCurve(
    bezier(
      [at.x, at.z],
      [at.x + reach * Math.sin(first), at.z + reach * Math.cos(first)],
      [to.x - into * Math.sin(heading), to.z - into * Math.cos(heading)],
      [to.x, to.z],
    ),
  )
  return first === at.heading ? run : joined(spin(at, at.heading, first), run)
}

/**
 * The recalls (2-214 "přivolá do předsednutí", 2-216 "přivolá k levé noze", 3-321 …): the dog
 * runs from where it was left into the front, facing the handler. From behind them (3-319
 * "bez otočení … Pes musí přijít do předsednutí z té strany, na které se nacházel") it runs up
 * past their left side and turns in ahead of them, round into the front.
 */
export const recallToFront = (at: PathPoint): Path => {
  if (at.z > 0) return runTo(at, { x: 0, z: FRONT }, Math.PI)
  const r = PAST_LEFT / 2
  return joined(
    runTo(at, { x: PAST_LEFT, z: FRONT + 0.2 }, 0),
    // Round towards the handler, from running on up their left side to facing them.
    pathFromCurve((u) => {
      const angle = Math.PI * u
      return { x: r + r * Math.cos(angle), z: FRONT + 0.2 + r * Math.sin(angle) }
    }),
    pathFromCurve((u) => ({ x: 0, z: FRONT + 0.2 - 0.2 * u })),
  )
}

/**
 * Coming to the left leg of a handler facing it, the dog runs past their left side and turns
 * about behind them, towards them, into heel: down the left side this far out (metres), round
 * a half circle of this radius whose bottom is this far behind the handler.
 */
const PAST_LEFT = HEEL_PLACE.x + 2 * 0.165
const ABOUT_RADIUS = 0.165
const ABOUT_BEHIND = -0.5

/**
 * …or to the left leg: from in front of the handler (2-216, "způsob přiřazení není daný") it
 * runs past their left side and turns about behind them into heel, never stopping; from
 * behind or beside them (2-215 "bez otočení", 2-230) it comes up into heel, facing on.
 */
export const recallToHeel = (at: PathPoint): Path => {
  if (at.z <= FRONT) return runTo(at, HEEL_PLACE, 0)
  const centre = { x: PAST_LEFT - ABOUT_RADIUS, z: ABOUT_BEHIND }
  return joined(
    runTo(at, { x: PAST_LEFT, z: 0.2 }, Math.PI),
    pathFromCurve((u) => ({ x: PAST_LEFT, z: 0.2 + (ABOUT_BEHIND - 0.2) * u })),
    // Round towards the handler: from going back down their left side to going on into heel.
    pathFromCurve((u) => {
      const angle = Math.PI * u
      return {
        x: centre.x + ABOUT_RADIUS * Math.cos(angle),
        z: centre.z - ABOUT_RADIUS * Math.sin(angle),
      }
    }),
    pathFromCurve((u) => ({
      x: HEEL_PLACE.x,
      z: ABOUT_BEHIND + (HEEL_PLACE.z - ABOUT_BEHIND) * u,
    })),
  )
}
