import { IDENTITY, add, apply, mul, rotX, rotY, rotZ, transpose, type M3, type V3 } from './math'

/**
 * Box figures for the exercise animations: a figure is a tree of joints, each with boxes
 * attached. The tree is plain data, so the renderer (`components/figures/`), the ground
 * solver and the leg solvers read the same description.
 *
 * Coordinates are three.js ones, in metres: the figure faces +z, y is up, +x is the
 * figure's **left**. A joint turns by three angles, applied yaw (about y) → roll (about z)
 * → pitch (about x): a positive pitch swings a limb that hangs down **backwards** and tips
 * the nose of a body that points forward **down**; a positive roll swings a hanging limb
 * towards +x; a positive yaw turns +z towards +x.
 */

export type Vec3 = V3

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
   * The joint is turned relative to the figure, not to its parent (feet, paws): its yaw
   * and pitch are measured from the figure's own frame and it is never rolled, so with no
   * angles in the pose it stays level whatever the leg above does.
   */
  level?: boolean
  children?: Joint[]
}

/**
 * Joint angles in radians: `name` is the pitch, `name.yaw` and `name.roll` the other two.
 * A missing angle is 0.
 */
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

/** A joint's rotation from its pose angles: yaw → roll → pitch. */
const rotationOf = (pose: Pose, name: string): M3 =>
  mul(mul(rotY(pose[`${name}.yaw`] ?? 0), rotZ(pose[`${name}.roll`] ?? 0)), rotX(pose[name] ?? 0))

export type JointFrame = {
  joint: Joint
  /** Where the joint is, with the root joint at the origin, in the figure's frame. */
  position: V3
  /** Its rotation in the figure's frame, and relative to its parent (what the renderer sets). */
  rotation: M3
  local: M3
}

/** Every joint's place and rotation for a pose. */
export const jointFrames = (root: Joint, pose: Pose): Map<string, JointFrame> => {
  const out = new Map<string, JointFrame>()
  const walk = (joint: Joint, origin: V3, parent: M3) => {
    const own = rotationOf(pose, joint.name)
    const rotation = joint.level
      ? mul(rotY(pose[`${joint.name}.yaw`] ?? 0), rotX(pose[joint.name] ?? 0))
      : mul(parent, own)
    const local = joint.level ? mul(transpose(parent), rotation) : own
    const position = add(origin, apply(parent, joint.pivot))
    out.set(joint.name, { joint, position, rotation, local })
    for (const child of joint.children ?? []) walk(child, position, rotation)
  }
  walk(root, [0, 0, 0], IDENTITY)
  return out
}

/**
 * Lowest y of the figure's boxes with the root joint at the origin. The renderer lifts the
 * root by minus this, so the figure stands — or sits, or lies — on the ground in any pose.
 */
export const lowestPoint = (root: Joint, pose: Pose): number => {
  let lowest = Infinity
  for (const { joint, position, rotation } of jointFrames(root, pose).values()) {
    for (const box of joint.boxes) {
      const [w, h, d] = box.size
      for (const cx of [-w / 2, w / 2])
        for (const cy of [-h / 2, h / 2])
          for (const cz of [-d / 2, d / 2]) {
            const corner = apply(rotation, [box.at[0] + cx, box.at[1] + cy, box.at[2] + cz])
            lowest = Math.min(lowest, position[1] + corner[1])
          }
    }
  }
  return lowest
}

/** Linear blend of two poses; angles missing in one count as 0. */
export const blendPoses = (a: Pose, b: Pose, t: number): Pose => {
  const out: Pose = {}
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const from = a[name] ?? 0
    out[name] = from + ((b[name] ?? 0) - from) * t
  }
  return out
}

/** Sum of poses — a swing added on top of a base pose. */
export const addPoses = (...poses: Pose[]): Pose => {
  const out: Pose = {}
  for (const pose of poses) {
    for (const [name, angle] of Object.entries(pose)) out[name] = (out[name] ?? 0) + angle
  }
  return out
}

/** Pose scaled by `k` — a swing faded in or out. */
export const scalePose = (pose: Pose, k: number): Pose =>
  Object.fromEntries(Object.entries(pose).map(([name, angle]) => [name, angle * k]))
