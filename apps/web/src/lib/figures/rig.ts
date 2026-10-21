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
   * The joint's pitch is measured from the ground, not from its parent (feet, paws): with
   * no angle in the pose its boxes stay level whatever the leg above does.
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

/** A point (y, z) turned by `pitch` about the x axis. */
export const pitchPoint = (y: number, z: number, pitch: number): [number, number] => [
  y * Math.cos(pitch) - z * Math.sin(pitch),
  y * Math.sin(pitch) + z * Math.cos(pitch),
]

/** The angle actually applied to each joint: `level` joints have the inherited pitch removed. */
export const resolvePose = (root: Joint, pose: Pose): Pose => {
  const out: Pose = {}
  const walk = (joint: Joint, inherited: number) => {
    const angle = (pose[joint.name] ?? 0) - (joint.level ? inherited : 0)
    out[joint.name] = angle
    for (const child of joint.children ?? []) walk(child, inherited + angle)
  }
  walk(root, 0)
  return out
}

/** Where each joint is (y, z) and its world pitch, with the root joint at the origin. */
export const jointFrames = (
  root: Joint,
  pose: Pose,
): Map<string, { joint: Joint; y: number; z: number; pitch: number }> => {
  const angles = resolvePose(root, pose)
  const out = new Map<string, { joint: Joint; y: number; z: number; pitch: number }>()
  const walk = (joint: Joint, oy: number, oz: number, parentPitch: number) => {
    const [dy, dz] = pitchPoint(joint.pivot[1], joint.pivot[2], parentPitch)
    const frame = {
      joint,
      y: oy + dy,
      z: oz + dz,
      pitch: parentPitch + (angles[joint.name] ?? 0),
    }
    out.set(joint.name, frame)
    for (const child of joint.children ?? []) walk(child, frame.y, frame.z, frame.pitch)
  }
  walk(root, 0, 0, 0)
  return out
}

/**
 * Lowest y of the figure's boxes with the root joint at the origin. The renderer lifts the
 * root by minus this, so the figure stands — or sits, or lies — on the ground in any pose.
 */
export const lowestPoint = (root: Joint, pose: Pose): number => {
  let lowest = Infinity
  for (const { joint, y, pitch } of jointFrames(root, pose).values()) {
    for (const box of joint.boxes) {
      const [, h, d] = box.size
      for (const cy of [box.at[1] - h / 2, box.at[1] + h / 2]) {
        for (const cz of [box.at[2] - d / 2, box.at[2] + d / 2]) {
          lowest = Math.min(lowest, y + pitchPoint(cy, cz, pitch)[0])
        }
      }
    }
  }
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
