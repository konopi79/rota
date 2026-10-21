'use client'

import { useImperativeHandle, useMemo, useRef, type Ref } from 'react'
import { MeshStandardMaterial, type Group } from 'three'

import type { FigureFrame } from '@/lib/figures/team'
import { lowestPoint, resolvePose, type Joint, type Paint } from '@/lib/figures/rig'

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
  shirt: '#3b8f86',
  trousers: '#3d4452',
  shoe: '#26272b',
}

export type FigureHandle = { apply: (frame: FigureFrame) => void }

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
        const angles = resolvePose(rig, frame.pose)
        for (const [name, group] of joints.current) group.rotation.x = angles[name] ?? 0
        const root = joints.current.get(rig.name)
        if (root) root.position.y = -lowestPoint(rig, frame.pose)
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
