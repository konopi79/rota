/**
 * Box figures for the exercise animations (POC): a figure is a tree of joints, each with
 * boxes attached, posed by one angle per joint. The tree is plain data, so the renderer
 * (`components/figures/`) and the ground solver below read the same description.
 *
 * Coordinates are three.js ones, in metres: the figure faces +z, y is up, +x is the
 * figure's **left**. Every joint rotates about its local x axis only (pitch): a positive
 * angle swings a limb that hangs down **backwards** and tips the nose of a body that
 * points forward **down**. That keeps the ground solver two-dimensional (y, z).
 */

export type Vec3 = readonly [number, number, number]

/** Named colours, mapped to materials by the renderer. */
export type Paint =
  'coat' | 'coatDark' | 'nose' | 'leftMark' | 'rightMark' | 'skin' | 'shirt' | 'trousers' | 'shoe'

export type Box = {
  /** Width (x), height (y), depth (z). */
  size: Vec3
  /** Centre, relative to the joint. */
  at: Vec3
  paint: Paint
}

export type Joint = {
  name: string
  /** Position of the joint relative to its parent joint. */
  pivot: Vec3
  boxes: Box[]
  /**
   * The joint keeps its boxes level with the ground whatever its parents do (feet, paws):
   * its own angle is set to cancel the pitch it inherits.
   */
  level?: boolean
  children?: Joint[]
}

/** Joint name → pitch in radians; a missing joint stays at 0. */
export type Pose = Record<string, number>

/** Every joint name of a figure, root first. */
export const jointNames = (root: Joint): string[] => [
  root.name,
  ...(root.children ?? []).flatMap(jointNames),
]

/**
 * The angle actually applied to each joint: the pose, with `level` joints overridden so
 * that their world pitch is 0.
 */
export const resolvePose = (root: Joint, pose: Pose): Pose => {
  const out: Pose = {}
  const walk = (joint: Joint, inherited: number) => {
    const angle = joint.level ? -inherited : (pose[joint.name] ?? 0)
    out[joint.name] = angle
    for (const child of joint.children ?? []) walk(child, inherited + angle)
  }
  walk(root, 0)
  return out
}

/**
 * Lowest y of the figure's boxes with the root joint at the origin. The renderer lifts the
 * root by minus this, so the figure stands — or sits, or lies — on the ground in any pose.
 */
export const lowestPoint = (root: Joint, pose: Pose): number => {
  const angles = resolvePose(root, pose)
  let lowest = Infinity
  // Rotation about x by θ: y' = y cos θ − z sin θ, z' = y sin θ + z cos θ.
  const walk = (joint: Joint, oy: number, oz: number, parentPitch: number) => {
    const [, py, pz] = joint.pivot
    const c0 = Math.cos(parentPitch)
    const s0 = Math.sin(parentPitch)
    const y = oy + py * c0 - pz * s0
    const z = oz + py * s0 + pz * c0
    const pitch = parentPitch + (angles[joint.name] ?? 0)
    const c = Math.cos(pitch)
    const s = Math.sin(pitch)
    for (const box of joint.boxes) {
      const [, h, d] = box.size
      for (const cy of [box.at[1] - h / 2, box.at[1] + h / 2]) {
        for (const cz of [box.at[2] - d / 2, box.at[2] + d / 2]) {
          lowest = Math.min(lowest, y + cy * c - cz * s)
        }
      }
    }
    for (const child of joint.children ?? []) walk(child, y, z, pitch)
  }
  walk(root, 0, 0, 0)
  return lowest
}

/** Linear blend of two poses; joints missing in one count as 0. */
export const blendPoses = (a: Pose, b: Pose, t: number): Pose => {
  const out: Pose = {}
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const from = a[name] ?? 0
    out[name] = from + ((b[name] ?? 0) - from) * t
  }
  return out
}

/** Sum of poses — a gait's swing added on top of a base pose. */
export const addPoses = (...poses: Pose[]): Pose => {
  const out: Pose = {}
  for (const pose of poses) {
    for (const [name, angle] of Object.entries(pose)) out[name] = (out[name] ?? 0) + angle
  }
  return out
}
