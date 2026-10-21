/**
 * Small 3D helpers for the figures — three.js conventions: y up, a figure faces +z, +x is
 * its left; rotations are right-handed. A rotation matrix is 9 numbers, row by row.
 */

export type V3 = readonly [number, number, number]
export type M3 = readonly [number, number, number, number, number, number, number, number, number]

export const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

/** About x (pitch): positive tips +z down, swings a hanging limb back. */
export const rotX = (a: number): M3 => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [1, 0, 0, 0, c, -s, 0, s, c]
}

/** About y (yaw, heading): positive turns +z towards +x, to the figure's left. */
export const rotY = (a: number): M3 => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, 0, s, 0, 1, 0, -s, 0, c]
}

/** About z (roll): positive swings a hanging limb towards +x, outwards on the left. */
export const rotZ = (a: number): M3 => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}

export const mul = (a: M3, b: M3): M3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
  a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
  a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
  a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
  a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
  a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
  a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
]

export const transpose = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]

export const apply = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
]

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

/** The shortest signed angle from `a` to `b`. */
export const angleTo = (a: number, b: number) => {
  const d = (((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)
  return d - Math.PI
}

/** 0 → 1 with zero slope at both ends. */
export const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}
