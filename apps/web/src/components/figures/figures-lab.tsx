'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GridHelper } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useTranslation } from 'react-i18next'

import { Figure, type FigureHandle } from '@/components/figures/figure'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DOG } from '@/lib/figures/dog'
import { HANDLER } from '@/lib/figures/handler'
import { TeamAnimator, type TeamControls } from '@/lib/figures/team'

type CameraView = 'angle' | 'side' | 'top' | 'front'

/** Camera positions; all look at the team, a little above the ground. */
const VIEWS: Record<CameraView, [number, number, number]> = {
  angle: [3.4, 2.6, 3.6],
  side: [4.8, 1.1, 0.1],
  top: [0.2, 6, 0.01],
  front: [0.2, 1.5, 5],
}
const TARGET: [number, number, number] = [0.2, 0.75, 0.1]

const SLOW_MOTION = { quarter: 0.25, half: 0.5, full: 1 }

function Team({ controls, slowMotion }: { controls: TeamControls; slowMotion: number }) {
  const animator = useMemo(() => new TeamAnimator(), [])
  const dog = useRef<FigureHandle>(null)
  const handler = useRef<FigureHandle>(null)
  const grid = useRef<GridHelper>(null)

  useFrame((_, delta) => {
    // A dropped frame (tab in the background) must not make the figures jump.
    const frame = animator.step(Math.min(delta, 0.1) * slowMotion, controls)
    dog.current?.apply(frame.dog)
    handler.current?.apply(frame.handler)
    // The team walks on the spot; the ground slides back under it.
    grid.current?.position.setZ(-frame.groundOffset)
  })

  return (
    <>
      <Figure rig={DOG} ref={dog} />
      <Figure rig={HANDLER} ref={handler} />
      <gridHelper ref={grid} args={[30, 30, '#5f8f4a', '#6f9f58']} position={[0, 0.002, 0]} />
    </>
  )
}

function CameraRig({ view }: { view: CameraView }) {
  const { camera, gl } = useThree()
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl])

  useEffect(() => () => controls.dispose(), [controls])
  useEffect(() => {
    controls.object.position.set(...VIEWS[view])
    controls.target.set(...TARGET)
    controls.update()
  }, [controls, view])

  return null
}

export function FiguresLab() {
  const { t } = useTranslation()
  const [controls, setControls] = useState<TeamControls>({
    dog: 'stand',
    place: 'left',
    handler: 'stand',
  })
  const [view, setView] = useState<CameraView>('angle')
  const [slowMotion, setSlowMotion] = useState<keyof typeof SLOW_MOTION>('full')
  const update = (patch: Partial<TeamControls>) => setControls((c) => ({ ...c, ...patch }))

  const choice = <T extends string>(
    group: string,
    value: T,
    options: readonly T[],
    onChange: (v: T) => void,
  ) => (
    <div className="space-y-1">
      <div className="text-muted-foreground text-sm font-medium">{t(`figures.${group}.label`)}</div>
      <ToggleGroup
        variant="outline"
        className="flex-wrap *:h-10 *:px-3"
        value={[value]}
        onValueChange={(v) => v[0] && onChange(v[0] as T)}
      >
        {options.map((o) => (
          <ToggleGroupItem key={o} value={o}>
            {t(`figures.${group}.${o}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-card h-[55vh] min-h-72">
        <Canvas shadows camera={{ position: VIEWS.angle, fov: 40 }}>
          <color attach="background" args={['#cfe6f5']} />
          <hemisphereLight args={['#ffffff', '#6f9f58', 1.2]} />
          <directionalLight
            position={[3, 6, 2]}
            intensity={2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#86b86b" />
          </mesh>
          <Team controls={controls} slowMotion={SLOW_MOTION[slowMotion]} />
          <CameraRig view={view} />
        </Canvas>
      </div>
      <div className="mx-auto grid w-full max-w-md gap-3 px-4 py-4">
        {choice('dog', controls.dog, ['stand', 'sit', 'down', 'walk', 'trot'], (dog) =>
          update({ dog }),
        )}
        {choice('place', controls.place, ['left', 'right', 'front'], (place) => update({ place }))}
        {choice('handler', controls.handler, ['stand', 'slow', 'normal', 'fast'], (handler) =>
          update({ handler }),
        )}
        {choice('view', view, ['angle', 'side', 'top', 'front'], setView)}
        {choice('speed', slowMotion, ['quarter', 'half', 'full'], setSlowMotion)}
      </div>
    </div>
  )
}
