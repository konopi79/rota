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
