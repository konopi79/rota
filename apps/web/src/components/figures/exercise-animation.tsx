'use client'

import { CZ_CARDS } from '@rota/content'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { SRGBColorSpace, TextureLoader, TOUCH, type Group } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'

import { Figure, type FigureHandle } from '@/components/figures/figure'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DOG } from '@/lib/figures/dog'
import { ExercisePlayer, cardPlace, stationOf, type Exercise } from '@/lib/figures/exercise'
import { EXERCISES } from '@/lib/figures/roz-exercises'
import { HANDLER } from '@/lib/figures/handler'

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

const SLOW_MOTION = { quarter: 0.25, half: 0.5, full: 1 }

/** A press that moves less than this (px) and lasts less than this (ms) is a tap, not a drag. */
const TAP_MOVE = 8
const TAP_TIME = 350

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
 * The place where the exercise starts (regulation §5.3.1, p. 8), as a square on the ground in
 * the station's frame: "ve čtverci o délce strany maximálně 120 cm, který se nachází vlevo
 * před kartou" — the team stops in it, the card at its front right corner; for a change
 * of direction "cca 120 cm přímo před příslušnou kartou", the square round that point.
 */
const SPACE = {
  side: { x: 0.15, z: -0.15 },
  ahead: { x: 0, z: 0 },
}
const SPACE_SIDE = 1.2
const SPACE_LINE = 0.025

function ExerciseSpace({ x, z }: { x: number; z: number }) {
  const half = SPACE_SIDE / 2
  const edges: [number, number, number, number][] = [
    [0, half, SPACE_SIDE + SPACE_LINE, SPACE_LINE],
    [0, -half, SPACE_SIDE + SPACE_LINE, SPACE_LINE],
    [half, 0, SPACE_LINE, SPACE_SIDE],
    [-half, 0, SPACE_LINE, SPACE_SIDE],
  ]
  return (
    <group position={[x, 0.004, z]}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[SPACE_SIDE, SPACE_SIDE]} />
        <meshBasicMaterial color="#fff6b0" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {edges.map(([ex, ez, w, d]) => (
        <mesh key={`${ex},${ez}`} position={[ex, 0.001, ez]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#fffbe0" />
        </mesh>
      ))}
    </group>
  )
}

/** Training cones, orange and blue by turns as on the video's field. */
const CONE_COLOURS = ['#f07a1a', '#2457c5']

function Cone({ x, z, colour }: { x: number; z: number; colour: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.17, 0]} castShadow>
        <coneGeometry args={[0.11, 0.32, 20]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <mesh position={[0, 0.01, 0]} castShadow>
        <boxGeometry args={[0.24, 0.02, 0.24]} />
        <meshStandardMaterial color={colour} />
      </mesh>
    </group>
  )
}

/** Where the camera looks: the team's place on the field. */
type Focus = { x: number; z: number }

/** How far right of the main card its supplementary card stands, metres. */
const SUPPLEMENTARY_GAP = 0.55
/** The cards the page can play, once each (Z-014 has a variant per supplementary card). */
const CODES = [...new Set(EXERCISES.map((e) => e.code))]
/** Which variant of a card an exercise plays: its supplementary card or the pace before. */
const variantOf = (e: Exercise) => e.supplementary ?? e.fromPace

/**
 * The team walks over the field through the exercise; the station — where the exercise
 * starts — is at the origin. Starts over when the script ends.
 */
function ExerciseTeam({
  exercise,
  slowMotion,
  showSpace,
  focusRef,
  onCaption,
}: {
  exercise: Exercise
  slowMotion: number
  showSpace: boolean
  focusRef: RefObject<Focus>
  onCaption: (caption: string | null) => void
}) {
  const station = stationOf(exercise)
  const player = useRef<ExercisePlayer>(null)
  const team = useRef<Group>(null)
  const dog = useRef<FigureHandle>(null)
  const handler = useRef<FigureHandle>(null)
  const caption = useRef<string | null>(null)

  useFrame((_, delta) => {
    player.current ??= new ExercisePlayer(exercise)
    // A dropped frame (tab in the background) must not make the figures jump.
    const frame = player.current.step(Math.min(delta, 0.1) * slowMotion)
    if (frame.finished) player.current = null
    dog.current?.apply(frame.dog)
    handler.current?.apply(frame.handler)
    const place = { x: frame.team.x, z: frame.team.z - station }
    team.current?.position.set(place.x, 0, place.z)
    team.current?.rotation.set(0, frame.team.heading, 0)
    focusRef.current = place
    if (frame.caption !== caption.current) {
      caption.current = frame.caption
      onCaption(frame.caption)
    }
  })

  const card = cardPlace(exercise)
  const stop = exercise.stopAt ?? { x: 0, z: 0 }
  const space = SPACE[exercise.card ?? 'side']
  const supplementary = exercise.supplementary
  return (
    <>
      <group ref={team}>
        <Figure rig={DOG} ref={dog} />
        <Figure rig={HANDLER} ref={handler} />
      </group>
      <CardStand code={exercise.code} x={card.x} z={card.z} />
      {supplementary && (
        // As on a course: the supplementary card stands right next to the main one.
        <CardStand code={supplementary} x={card.x - SUPPLEMENTARY_GAP} z={card.z} />
      )}
      {showSpace && <ExerciseSpace x={space.x - stop.x} z={space.z - stop.z} />}
      {exercise.cones?.map((cone, i) => (
        <Cone key={i} x={cone.x} z={cone.z} colour={CONE_COLOURS[i % 2]!} />
      ))}
      <gridHelper args={[30, 30, '#5f8f4a', '#6f9f58']} position={[0, 0.002, 0]} />
    </>
  )
}

/** Orbit controls; the camera keeps its offset and follows the team (`focusRef`). */
function CameraRig({ view, focusRef }: { view: CameraView; focusRef: RefObject<Focus> }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls>(null)
  const followed = useRef<Focus>({ x: 0, z: 0 })

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    // On a phone one finger scrolls the page (the scene fills most of the screen) and taps
    // pause; two fingers turn and zoom the view, as on an embedded map.
    controls.touches = { ONE: null, TWO: TOUCH.DOLLY_ROTATE }
    controls.domElement?.style.setProperty('touch-action', 'pan-y')
    // The camera stays above the ground: nothing to see from below the field.
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controlsRef.current = controls
    return () => controls.dispose()
  }, [camera, gl])
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const { x, z } = focusRef.current
    const [ox, oy, oz] = VIEWS[view]
    controls.target.set(TARGET[0] + x, TARGET[1], TARGET[2] + z)
    controls.object.position.set(TARGET[0] + x + ox, TARGET[1] + oy, TARGET[2] + z + oz)
    followed.current = { x, z }
    controls.update()
  }, [view, focusRef])

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return
    const dx = focusRef.current.x - followed.current.x
    const dz = focusRef.current.z - followed.current.z
    followed.current = { ...focusRef.current }
    controls.target.x += dx
    controls.target.z += dz
    controls.object.position.x += dx
    controls.object.position.z += dz
    controls.update()
  })

  return null
}

const cardName = (code: string) => CZ_CARDS.find((c) => c.code === code)?.name ?? ''

/** Exercise animations (POC): pick an exercise, watch the box-figure team perform it. */
export function ExerciseAnimation() {
  const { t } = useTranslation()
  const [code, setCode] = useState(CODES[0]!)
  const [variant, setVariant] = useState<string | undefined>(undefined)
  const [view, setView] = useState<CameraView>('behind')
  const [slowMotion, setSlowMotion] = useState<keyof typeof SLOW_MOTION>('full')
  const [paused, setPaused] = useState(false)
  const [shadows, setShadows] = useState(true)
  const [showSpace, setShowSpace] = useState(false)
  const [caption, setCaption] = useState<string | null>(null)
  const focusRef = useRef<Focus>({ x: 0, z: 0 })
  const press = useRef<{ x: number; y: number; time: number } | null>(null)
  const variants = EXERCISES.filter((e) => e.code === code)
  const exercise = variants.find((e) => variantOf(e) === variant) ?? variants[0]!
  const variantGroup = variants[0]!.supplementary ? 'supplementary' : 'fromPace'

  // Space pauses and resumes too, unless a control has the focus (space presses it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || (e.target as HTMLElement).closest('button, input')) return
      e.preventDefault()
      setPaused((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const choice = <T extends string>(
    group: string,
    value: T,
    options: readonly T[],
    onChange: (v: T) => void,
    label: (o: T) => string = (o) => t(`figures.${group}.${o}`),
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
            {label(o)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md px-4 pb-3">
        {choice(
          'exercise',
          code,
          CODES,
          (c) => {
            setCode(c)
            setVariant(undefined)
          },
          (o) => `${o} ${cardName(o)}`,
        )}
        {variants.length > 1 && (
          <div className="pt-3">
            {choice(
              variantGroup,
              variantOf(exercise)!,
              variants.map((e) => variantOf(e)!),
              setVariant,
              variantGroup === 'supplementary' ? (o) => `${o} ${cardName(o)}` : undefined,
            )}
          </div>
        )}
      </div>
      <div
        className="bg-card relative h-[55vh] min-h-72"
        // A tap pauses or resumes; a drag turns the camera.
        onPointerDown={(e) => {
          press.current = { x: e.clientX, y: e.clientY, time: e.timeStamp }
        }}
        onPointerUp={(e) => {
          const start = press.current
          press.current = null
          if (
            start &&
            Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP_MOVE &&
            e.timeStamp - start.time < TAP_TIME
          )
            setPaused((p) => !p)
        }}
      >
        <Canvas shadows camera={{ position: VIEWS.behind, fov: 40 }}>
          <color attach="background" args={['#cfe6f5']} />
          <hemisphereLight args={['#ffffff', '#6f9f58', 1.2]} />
          <directionalLight
            position={[3, 6, 2]}
            intensity={2}
            castShadow={shadows}
            shadow-mapSize={[1024, 1024]}
          />
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#86b86b" />
          </mesh>
          <ExerciseTeam
            key={`${code} ${variantOf(exercise) ?? ''}`}
            exercise={exercise}
            slowMotion={paused ? 0 : SLOW_MOTION[slowMotion]}
            showSpace={showSpace}
            focusRef={focusRef}
            onCaption={setCaption}
          />
          <CameraRig view={view} focusRef={focusRef} />
        </Canvas>
        {paused && (
          // Small and at the top: the scene is what a paused viewer wants to see.
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-4">
            <div className="bg-background/85 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium shadow">
              <Play className="size-3.5 fill-current" />
              {t('figures.paused')}
            </div>
          </div>
        )}
        {caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            <div className="bg-background/85 rounded-lg px-3 py-1.5 text-center font-medium shadow">
              {t(`figures.caption.${caption}`)}
            </div>
          </div>
        )}
      </div>
      <div className="mx-auto grid w-full max-w-md gap-3 px-4 py-4">
        {choice('view', view, ['behind', 'angle', 'side', 'top', 'front'], setView)}
        {choice('speed', slowMotion, ['quarter', 'half', 'full'], (v) => {
          setSlowMotion(v)
          setPaused(false)
        })}
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="shadows" className="text-base">
            {t('figures.shadows')}
          </Label>
          <Switch id="shadows" checked={shadows} onCheckedChange={setShadows} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="space" className="text-base">
              {t('figures.space.label')}
            </Label>
            <Switch id="space" checked={showSpace} onCheckedChange={setShowSpace} />
          </div>
          {showSpace && (
            <p className="text-muted-foreground text-sm">
              {t(`figures.space.${exercise.card ?? 'side'}`)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
