'use client'

import { useImperativeHandle, useMemo, useRef, type Ref } from 'react'
import { Matrix4, MeshStandardMaterial, type Group } from 'three'

import type { FigureFrame } from '@/lib/figures/team'
import { jointFrames, lowestPoint, type Joint, type Paint } from '@/lib/figures/rig'

/**
 * Colours of the box figures. 3D materials need real colours, not the UI's tokens; left
 * and right are the same two colours on the dog's paws and the handler's shoes.
 */
const PAINT: Record<Paint, string> = {
  coat: '#5b4636',
  coatDark: '#efe6d8',
  nose: '#2a211b',
  leftMark: '#2f6fe0',
  rightMark: '#f08a24',
  skin: '#e2b48f',
  hair: '#5a3d2b',
  eye: '#1c1c20',
  shirt: '#3b8f86',
  trousers: '#3d4452',
  shoe: '#26272b',
}

export type FigureHandle = { apply: (frame: FigureFrame) => void }

/** Scratch matrix for setting the joints' rotations. */
const matrix = new Matrix4()

export function Figure({ rig, ref }: { rig: Joint; ref: Ref<FigureHandle> }) {
  const placement = useRef<Group>(null)
  const joints = useRef(new Map<string, Group>())
  const materials = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(PAINT).map(([paint, color]) => [
          paint,
          new MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 }),
        ]),
      ) as Record<Paint, MeshStandardMaterial>,
    [],
  )

  useImperativeHandle(
    ref,
    () => ({
      apply(frame) {
        const frames = jointFrames(rig, frame.pose)
        for (const [name, group] of joints.current) {
          const m = frames.get(name)?.local
          if (!m) continue
          matrix.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1)
          group.quaternion.setFromRotationMatrix(matrix)
        }
        const root = joints.current.get(rig.name)
        if (root) root.position.y = -lowestPoint(rig, frame.pose) + (frame.lift ?? 0)
        placement.current?.position.set(frame.x, 0, frame.z)
        placement.current?.rotation.set(0, frame.heading, 0)
      },
    }),
    [rig],
  )

  const render = (joint: Joint, isRoot: boolean) => (
    <group
      key={joint.name}
      position={isRoot ? [0, 0, 0] : [...joint.pivot]}
      ref={(group) => {
        if (group) joints.current.set(joint.name, group)
        else joints.current.delete(joint.name)
      }}
    >
      {joint.boxes.map((b, i) => (
        <mesh key={i} position={[...b.at]} material={materials[b.paint]} castShadow>
          <boxGeometry args={[...b.size]} />
        </mesh>
      ))}
      {joint.children?.map((child) => render(child, false))}
    </group>
  )

  return <group ref={placement}>{render(rig, true)}</group>
}
