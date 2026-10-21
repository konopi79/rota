'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { SRGBColorSpace, TextureLoader, type GridHelper, type Group } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useTranslation } from 'react-i18next'

import { Figure, type FigureHandle } from '@/components/figures/figure'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DOG } from '@/lib/figures/dog'
import { ExercisePlayer, stationOf, Z001, type Exercise } from '@/lib/figures/exercise'
import { HANDLER } from '@/lib/figures/handler'
import { TeamAnimator, type TeamControls } from '@/lib/figures/team'

type CameraView = 'behind' | 'angle' | 'side' | 'top' | 'front'

/** Camera offsets from the point it looks at, a little above the ground by the team. */
const VIEWS: Record<CameraView, [number, number, number]> = {
  // Over the handler's left shoulder: the way the team sees the card.
  behind: [1.9, 1.75, -3.4],
  angle: [3.2, 1.85, 3.5],
  side: [4.6, 0.35, 0],
  top: [0, 5.25, -0.01],
  front: [0, 0.75, 4.9],
}
const TARGET: [number, number, number] = [0.2, 0.75, 0.1]

const SLOW_MOTION = { pause: 0, quarter: 0.25, half: 0.5, full: 1 }

/** The figures walk on the spot; the ground slides back under them. */
function LabTeam({ controls, slowMotion }: { controls: TeamControls; slowMotion: number }) {
  const animator = useMemo(() => new TeamAnimator(), [])
  const dog = useRef<FigureHandle>(null)
  const handler = useRef<FigureHandle>(null)
  const grid = useRef<GridHelper>(null)

  useFrame((_, delta) => {
    // A dropped frame (tab in the background) must not make the figures jump.
    const frame = animator.step(Math.min(delta, 0.1) * slowMotion, controls)
    dog.current?.apply(frame.dog)
    handler.current?.apply(frame.handler)
    grid.current?.position.setZ(-(frame.travelled % 1))
  })

  return (
    <>
      <Figure rig={DOG} ref={dog} />
      <Figure rig={HANDLER} ref={handler} />
      <gridHelper ref={grid} args={[30, 30, '#5f8f4a', '#6f9f58']} position={[0, 0.002, 0]} />
    </>
  )
}

/** The card's tilt back from upright, and half its height. */
const CARD_TILT = 0.3
const CARD_HALF = 0.18

/**
 * A card in a stand on the ground, as on a course. The exercise starts in a square of at
 * most 120 cm "vlevo před kartou" (regulation §5.3.1, p. 14): the card stands right of the
 * team, a little ahead.
 */
function CardStand({ code, x, z }: { code: string; x: number; z: number }) {
  const texture = useMemo(() => {
    const map = new TextureLoader().load(`/cards/cz/${code.toLowerCase()}.webp`)
    map.colorSpace = SRGBColorSpace
    return map
  }, [code])
  useEffect(() => () => texture.dispose(), [texture])

  // Facing the team that comes from −z, the top tilted back, the bottom edge on the
  // ground; a back leg from the top edge makes it a tent.
  const top = 2 * CARD_HALF * Math.cos(CARD_TILT)
  const back = 0.2
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI}>
      <mesh position={[0, top / 2 + 0.005, 0]} rotation-x={-CARD_TILT} castShadow>
        <boxGeometry args={[0.5, 2 * CARD_HALF, 0.01]} />
        <meshStandardMaterial color="#e8e8e8" />
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[0.48, 2 * CARD_HALF - 0.02]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </mesh>
      <mesh
        position={[0, top / 2, -(CARD_HALF * Math.sin(CARD_TILT) + back / 2)]}
        rotation-x={Math.atan2(back, top)}
        castShadow
      >
        <boxGeometry args={[0.46, Math.hypot(top, back), 0.006]} />
        <meshStandardMaterial color="#c9ccd1" />
      </mesh>
    </group>
  )
}

/**
 * The team walks over the field through the exercise; the station — where the team stops —
 * is at the origin. Starts over when the script ends.
 */
function ExerciseTeam({
  exercise,
  slowMotion,
  focusRef,
  onCaption,
}: {
  exercise: Exercise
  slowMotion: number
  focusRef: RefObject<number>
  onCaption: (caption: string | null) => void
}) {
  const station = useMemo(() => stationOf(exercise), [exercise])
  const player = useRef<ExercisePlayer>(null)
  const team = useRef<Group>(null)
  const dog = useRef<FigureHandle>(null)
  const handler = useRef<FigureHandle>(null)
  const caption = useRef<string | null>(null)

  useFrame((_, delta) => {
    player.current ??= new ExercisePlayer(exercise)
    const frame = player.current.step(Math.min(delta, 0.1) * slowMotion)
    if (frame.finished) player.current = null
    dog.current?.apply(frame.dog)
    handler.current?.apply(frame.handler)
    const z = frame.travelled - station
    team.current?.position.setZ(z)
    focusRef.current = z
    if (frame.caption !== caption.current) {
      caption.current = frame.caption
      onCaption(frame.caption)
    }
  })

  return (
    <>
      <group ref={team}>
        <Figure rig={DOG} ref={dog} />
        <Figure rig={HANDLER} ref={handler} />
      </group>
      <CardStand code={exercise.code} x={-0.75} z={0.45} />
      <gridHelper args={[30, 30, '#5f8f4a', '#6f9f58']} position={[0, 0.002, 0]} />
    </>
  )
}

/** Orbit controls; the camera keeps its offset and follows `focusRef` (z) when given. */
function CameraRig({ view, focusRef }: { view: CameraView; focusRef?: RefObject<number> }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls>(null)
  const followed = useRef(0)

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controlsRef.current = controls
    return () => controls.dispose()
  }, [camera, gl])
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const z = focusRef?.current ?? 0
    const [ox, oy, oz] = VIEWS[view]
    controls.target.set(TARGET[0], TARGET[1], TARGET[2] + z)
    controls.object.position.set(TARGET[0] + ox, TARGET[1] + oy, TARGET[2] + z + oz)
    followed.current = z
    controls.update()
  }, [view, focusRef])

  useFrame(() => {
    const controls = controlsRef.current
    if (!focusRef || !controls) return
    const shift = focusRef.current - followed.current
    followed.current = focusRef.current
    controls.target.z += shift
    controls.object.position.z += shift
    controls.update()
  })

  return null
}

type Mode = 'figures' | 'z001'

export function FiguresLab() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('z001')
  const [controls, setControls] = useState<TeamControls>({
    dog: 'stand',
    place: 'left',
    handler: 'stand',
  })
  const [view, setView] = useState<CameraView>('behind')
  const [slowMotion, setSlowMotion] = useState<keyof typeof SLOW_MOTION>('full')
  const [caption, setCaption] = useState<string | null>(null)
  const focusRef = useRef(0)
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
      <div className="mx-auto w-full max-w-md px-4 pb-3">
        {choice('mode', mode, ['z001', 'figures'], setMode)}
      </div>
      <div className="bg-card relative h-[55vh] min-h-72">
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
          {mode === 'figures' ? (
            <>
              <LabTeam controls={controls} slowMotion={SLOW_MOTION[slowMotion]} />
              <CameraRig view={view} />
            </>
          ) : (
            <>
              <ExerciseTeam
                exercise={Z001}
                slowMotion={SLOW_MOTION[slowMotion]}
                focusRef={focusRef}
                onCaption={setCaption}
              />
              <CameraRig view={view} focusRef={focusRef} />
            </>
          )}
        </Canvas>
        {mode !== 'figures' && caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            <div className="bg-background/85 rounded-lg px-3 py-1.5 text-center font-medium shadow">
              {t(`figures.caption.${caption}`)}
            </div>
          </div>
        )}
      </div>
      <div className="mx-auto grid w-full max-w-md gap-3 px-4 py-4">
        {mode === 'figures' && (
          <>
            {choice('dog', controls.dog, ['stand', 'sit', 'down', 'walk', 'trot'], (dog) =>
              update({ dog }),
            )}
            {choice('place', controls.place, ['left', 'right', 'front'], (place) =>
              update({ place }),
            )}
            {choice('handler', controls.handler, ['stand', 'slow', 'normal', 'fast'], (handler) =>
              update({ handler }),
            )}
          </>
        )}
        {choice('view', view, ['behind', 'angle', 'side', 'top', 'front'], setView)}
        {choice('speed', slowMotion, ['pause', 'quarter', 'half', 'full'], setSlowMotion)}
      </div>
    </div>
  )
}
