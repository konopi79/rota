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
  const heading = (i: number) => {
    const a = points[Math.max(0, i - 1)]!
    const b = points[Math.min(samples, i + 1)]!
    return Math.atan2(b.x - a.x, b.z - a.z)
  }
  return {
    length,
    at(s) {
      const target = Math.min(Math.max(s, 0), length)
      let i = 1
      while (i < samples && lengths[i]! < target) i++
      const k = (target - lengths[i - 1]!) / (lengths[i]! - lengths[i - 1]! || 1)
      const a = points[i - 1]!
      const b = points[i]!
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, heading: heading(i) }
    },
  }
}

/**
 * Around the dog sitting or lying at heel, "zepředu" (regulation p. 19, Z-004/Z-005): a step
 * forward, across in front of the dog, back along its far side, behind it and up to the
 * base place again. An ellipse through the handler's place, 1.1 m across (round enough for
 * a person to walk without crossing their feet), 0.9 m ahead of and behind the handler —
 * clear of a lying dog and its tail too. Round its tight ends the handler slows down.
 */
export const AROUND_DOG: Path = pathFromCurve((t) => {
  const angle = 2 * Math.PI * t
  return { x: 0.55 - 0.55 * Math.cos(angle), z: 0.9 * Math.sin(angle) }
})

/** How sharply the path bends over the next `ahead` metres from `s`, at most: radians per metre. */
export const bendAhead = (path: Path, s: number, ahead = 0.4): number => {
  const STEP = 0.05
  let most = 0
  for (let d = 0; d < ahead && s + d < path.length; d += STEP) {
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
 * are those of `team.ts` — at heel (0.42, −0.2) and in front (0, 0.6) facing the handler.
 */

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
  pathFromCurve(bezier([0.42, 0.02], [0.42, 0.3], [0.15, 0.42], [0, 0.38])),
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
  chain(bezier([0, 0.6], [0, 0.45], [-0.45, 0.4], [-0.45, 0]), (u) => {
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
  pathFromCurve(bezier([0, 0.38], [0.15, 0.3], [0.42, 0.2], [0.42, 0.02])),
  Math.PI,
  2 * Math.PI,
)
