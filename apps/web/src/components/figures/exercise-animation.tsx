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
import {
  ExercisePlayer,
  SPACE_SIDE,
  conesOf,
  jumpsOf,
  marksOf,
  passesCard,
  spacesOf,
  standsOf,
  stationOf,
  type Exercise,
} from '@/lib/figures/exercise'
import { EXERCISES, RIGHT_EXERCISES, RIGHT_SIDE_CARDS } from '@/lib/figures/exercises'
import { HANDLER } from '@/lib/figures/handler'
import { BAR_HEIGHT, JUMP_WIDTH, UPRIGHT_HEIGHT } from '@/lib/figures/leap'
import { onField } from '@/lib/figures/team'
import { cn } from '@/lib/utils'

export type CameraView = 'behind' | 'angle' | 'side' | 'top' | 'front'

/** Camera offsets from the point it looks at, a little above the ground by the team. */
export const VIEWS: Record<CameraView, [number, number, number]> = {
  // Over the handler's left shoulder: the way the team sees the card.
  behind: [1.9, 1.75, -3.4],
  angle: [3.2, 1.85, 3.5],
  side: [4.6, 0.35, 0],
  top: [0, 5.25, -0.01],
  front: [0, 0.75, 4.9],
}
const TARGET: [number, number, number] = [0.2, 0.75, 0.1]

export const SLOW_MOTION = { quarter: 0.25, half: 0.5, full: 1 }

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
export function CardStand({ code, x, z }: { code: string; x: number; z: number }) {
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
 * A mark on the ground: across the dog's way (the two thirds of a recall), 80 cm, or along the
 * team's (3-313's line), 2 m; white.
 */
export function GroundMark({
  x,
  z,
  heading = 0,
  lengthwise,
}: {
  x: number
  z: number
  /** The way the team goes (a course walked through: its station's). */
  heading?: number
  lengthwise?: boolean
}) {
  return (
    <group position={[x, 0.004, z]} rotation-y={heading}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={lengthwise ? [0.06, 2] : [0.8, 0.06]} />
        <meshBasicMaterial color="#f4f4f0" />
      </mesh>
    </group>
  )
}

/**
 * A bar jump (regulation p. 10): two uprights on feet, no wings, the bar laid loose across at
 * 40 cm — yellow uprights as on the video's field.
 */
export function Jump({ x, z, heading = 0 }: { x: number; z: number; heading?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={heading}>
      {[-1, 1].map((side) => (
        <group key={side} position={[(side * JUMP_WIDTH) / 2, 0, 0]}>
          <mesh position={[0, UPRIGHT_HEIGHT / 2, 0]} castShadow>
            <boxGeometry args={[0.04, UPRIGHT_HEIGHT, 0.04]} />
            <meshStandardMaterial color="#e8d81c" />
          </mesh>
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.1, 0.04, 0.3]} />
            <meshStandardMaterial color="#e8d81c" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, BAR_HEIGHT - 0.015, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.015, 0.015, JUMP_WIDTH, 12]} />
        <meshStandardMaterial color="#f2f2f2" />
      </mesh>
    </group>
  )
}

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
export const CONE_COLOURS = ['#f07a1a', '#2457c5']

export function Cone({ x, z, colour }: { x: number; z: number; colour: string }) {
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

/** A bowl covered with a lid, as in Z-022 ("prázdné misky přikryté poklopem"). */
export function Bowl({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.085, 0.1, 24]} />
        <meshStandardMaterial color="#5f6b78" />
      </mesh>
      <mesh position={[0, 0.105, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.015, 24]} />
        <meshStandardMaterial color="#3e4650" />
      </mesh>
    </group>
  )
}

/**
 * Where the camera looks: the team's place on the field — or between the handler and the dog
 * when it is away from them (left, sent to a cone, called in), the camera that much further off
 * (`zoom`) so both are in the picture.
 */
export type Focus = { x: number; z: number; zoom?: number }

/** The dog this far from the team and more, the camera starts taking it in, metres. */
const APART = 1
/** …over this much further, it is fully between them. */
const APART_BLEND = 2
/** The camera moves this much further off for each metre they are apart (beyond `APART`). */
const ZOOM_PER_METRE = 0.22

/** Where the camera looks with the handler at `team` and the dog at `dog` (field). */
const focusOn = (team: Focus, dog: { x: number; z: number }): Focus => {
  const apart = Math.hypot(dog.x - team.x, dog.z - team.z)
  const w = Math.min(1, Math.max(0, (apart - APART) / APART_BLEND))
  return {
    x: team.x + (w * (dog.x - team.x)) / 2,
    z: team.z + (w * (dog.z - team.z)) / 2,
    zoom: 1 + w * ZOOM_PER_METRE * Math.max(0, apart - APART),
  }
}

/** The cards the page can play, once each (Z-014 has a variant per supplementary card). */
const CODES = [...new Set(EXERCISES.map((e) => e.code))]
/** The card series, by the code's prefix — the class whose cards they are new in. */
const SERIES = ['Z', '1', '2', '3'] as const
type Series = (typeof SERIES)[number]
const SERIES_CLASS: Record<Series, string> = { Z: 'RO-Z', 1: 'RO1', 2: 'RO2', 3: 'RO3' }
const seriesOf = (code: string) => code.split('-')[0] as Series
/**
 * A caption as the frame says it: its key, and whether the dog is at the other leg than the
 * script was written for — then it reads with left and right swapped, where it names a side.
 */
type Caption = { key: string; flipped: boolean }

/** A leave card played with one of its follow-ups (plan R17). */
const isLeavePair = (e: Exercise) => e.parts?.[0]?.exercise.code === e.code

/**
 * Which variant of a card an exercise plays: its supplementary card, the pace before, or —
 * for a leave card — the card that follows it.
 */
const variantOf = (e: Exercise) => (isLeavePair(e) ? e.pairedWith : (e.supplementary ?? e.fromPace))

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
  onCaption: (caption: Caption | null) => void
}) {
  const station = stationOf(exercise)
  const player = useRef<ExercisePlayer>(null)
  const team = useRef<Group>(null)
  const dog = useRef<FigureHandle>(null)
  const handler = useRef<FigureHandle>(null)
  const caption = useRef<string | null>(null)
  const flipped = useRef(false)

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
    const dogAt = onField(frame.team, frame.dog)
    focusRef.current = focusOn(place, { x: dogAt.x, z: dogAt.z - station })
    if (frame.caption !== caption.current || frame.flipped !== flipped.current) {
      caption.current = frame.caption
      flipped.current = frame.flipped
      onCaption(frame.caption ? { key: frame.caption, flipped: frame.flipped } : null)
    }
  })

  return (
    <>
      <group ref={team}>
        <Figure rig={DOG} ref={dog} />
        <Figure rig={HANDLER} ref={handler} />
      </group>
      {/* The card, and as on a course the supplementary card right next to it; a pair's both. */}
      {standsOf(exercise).map((s) => (
        <CardStand key={`${s.code} ${s.z}`} code={s.code} x={s.x} z={s.z} />
      ))}
      {showSpace && spacesOf(exercise).map((s) => <ExerciseSpace key={s.z} x={s.x} z={s.z} />)}
      {marksOf(exercise).map((m) => (
        <GroundMark key={`${m.x} ${m.z}`} x={m.x} z={m.z} lengthwise={m.lengthwise} />
      ))}
      {jumpsOf(exercise).map((j) => (
        <Jump key={`${j.x} ${j.z}`} x={j.x} z={j.z} />
      ))}
      {conesOf(exercise).map((cone, i) => (
        <Cone key={i} x={cone.x} z={cone.z} colour={CONE_COLOURS[i % 2]!} />
      ))}
      {exercise.bowls?.map((bowl, i) => (
        <Bowl key={i} x={bowl.x} z={bowl.z} />
      ))}
      <gridHelper args={[30, 30, '#5f8f4a', '#6f9f58']} position={[0, 0.002, 0]} />
    </>
  )
}

/** Orbit controls; the camera keeps its offset and follows the team (`focusRef`). */
export function CameraRig({ view, focusRef }: { view: CameraView; focusRef: RefObject<Focus> }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls>(null)
  const followed = useRef<Focus>({ x: 0, z: 0 })
  // How far off the camera is now, relative to the view's own distance (a zoom by hand is kept).
  const zoomed = useRef(1)

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
    const zoom = focusRef.current.zoom ?? 1
    controls.object.position.set(
      TARGET[0] + x + ox * zoom,
      TARGET[1] + oy * zoom,
      TARGET[2] + z + oz * zoom,
    )
    followed.current = { x, z }
    zoomed.current = zoom
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
    // Further off or nearer as the dog goes away or comes back, from where the camera is.
    const zoom = focusRef.current.zoom ?? 1
    if (Math.abs(zoom - zoomed.current) > 1e-4) {
      const by = zoom / zoomed.current
      const offset = controls.object.position.clone().sub(controls.target).multiplyScalar(by)
      controls.object.position.copy(controls.target).add(offset)
      zoomed.current = zoom
    }
    controls.update()
  })

  return null
}

const cardName = (code: string) => CZ_CARDS.find((c) => c.code === code)?.name ?? ''

/**
 * One card's animation: the scene, its caption, and the controls — the dog's side and the
 * variant (D0 card, pace before) where the card has more, camera, speed, shadows, exercise
 * space.
 * `keyboard`: space pauses too (on the page of its own; in a card detail space scrolls).
 * `inline`: laid out inside a page column (a card detail) rather than full width.
 */
export function AnimationPlayer({
  code,
  initialVariant,
  keyboard = false,
  inline = false,
}: {
  code: string
  initialVariant?: string
  keyboard?: boolean
  inline?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [variant, setVariant] = useState<string | undefined>(initialVariant)
  const [dogSide, setDogSide] = useState<'left' | 'right'>('left')
  const [view, setView] = useState<CameraView>('behind')
  const [slowMotion, setSlowMotion] = useState<keyof typeof SLOW_MOTION>('full')
  const [paused, setPaused] = useState(false)
  const [shadows, setShadows] = useState(true)
  const [showSpace, setShowSpace] = useState(true)
  const [caption, setCaption] = useState<Caption | null>(null)
  const focusRef = useRef<Focus>({ x: 0, z: 0 })
  const press = useRef<{ x: number; y: number; time: number } | null>(null)
  // The dog on the right: after a start "R" (every RO-Z card) or a change of side (R15).
  const bothSides = RIGHT_SIDE_CARDS.includes(code)
  const side = bothSides ? dogSide : 'left'
  const variants = (side === 'right' ? RIGHT_EXERCISES : EXERCISES).filter((e) => e.code === code)
  const exercise = variants.find((e) => variantOf(e) === variant) ?? variants[0]!
  const variantGroup = isLeavePair(variants[0]!)
    ? 'followUp'
    : variants[0]!.supplementary
      ? 'supplementary'
      : 'fromPace'
  // A pair's own card (the other one stands too): the one this animation is for.
  const own = exercise.parts?.find((p) => p.exercise.code === code)?.exercise ?? exercise

  // Space pauses and resumes too, unless a control has the focus (space presses it).
  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || (e.target as HTMLElement).closest('button, input')) return
      e.preventDefault()
      setPaused((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard])

  const controls = cn('grid w-full gap-3', inline ? 'py-3' : 'mx-auto max-w-md px-4 py-4')
  const captionKey =
    caption &&
    (caption.flipped && i18n.exists(`figures.captionRight.${caption.key}`)
      ? `figures.captionRight.${caption.key}`
      : `figures.caption.${caption.key}`)
  return (
    <div className="flex flex-col">
      {(bothSides || variants.length > 1) && (
        <div className={cn('grid w-full gap-3', inline ? 'pb-3' : 'mx-auto max-w-md px-4 pb-3')}>
          {bothSides && (
            <Choice
              group="dogSide"
              value={side}
              options={['left', 'right'] as const}
              onChange={setDogSide}
            />
          )}
          {variants.length > 1 && (
            <Choice
              group={variantGroup}
              value={variantOf(exercise)!}
              options={variants.map((e) => variantOf(e)!)}
              onChange={setVariant}
              label={variantGroup === 'fromPace' ? undefined : (o) => `${o} ${cardName(o)}`}
            />
          )}
        </div>
      )}
      <div
        className={cn(
          'bg-card relative h-[55vh] min-h-72',
          inline && 'overflow-hidden rounded-md border',
        )}
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
            key={`${code} ${variantOf(exercise) ?? ''} ${side}`}
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
        {captionKey && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            <div className="bg-background/85 rounded-lg px-3 py-1.5 text-center font-medium shadow">
              {t(captionKey)}
            </div>
          </div>
        )}
      </div>
      <div className={controls}>
        <Choice
          group="view"
          value={view}
          options={['behind', 'angle', 'side', 'top', 'front'] as const}
          onChange={setView}
        />
        <Choice
          group="speed"
          value={slowMotion}
          options={['quarter', 'half', 'full'] as const}
          onChange={(v) => {
            setSlowMotion(v)
            setPaused(false)
          }}
        />
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={`shadows-${code}`} className="text-base">
            {t('figures.shadows')}
          </Label>
          <Switch id={`shadows-${code}`} checked={shadows} onCheckedChange={setShadows} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`space-${code}`} className="text-base">
              {t('figures.space.label')}
            </Label>
            <Switch id={`space-${code}`} checked={showSpace} onCheckedChange={setShowSpace} />
          </div>
          {showSpace && (
            <p className="text-muted-foreground text-sm">
              {t(`figures.space.${passesCard(own) ?? own.card ?? 'side'}`)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/** A labelled row of toggle buttons, one of `options` chosen. */
function Choice<T extends string>({
  group,
  value,
  options,
  onChange,
  label,
}: {
  group: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  label?: (o: T) => string
}) {
  const { t } = useTranslation()
  return (
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
            {label ? label(o) : t(`figures.${group}.${o}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

/** All the animations on one page: pick a card, watch the box-figure team perform it. */
export function ExerciseAnimation() {
  const { t } = useTranslation()
  const [series, setSeries] = useState<Series>('Z')
  const [code, setCode] = useState(CODES[0]!)
  const codes = CODES.filter((c) => seriesOf(c) === series)
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-md gap-3 px-4 pb-3">
        <Choice
          group="series"
          value={series}
          options={SERIES}
          onChange={(s) => {
            setSeries(s)
            setCode(CODES.find((c) => seriesOf(c) === s)!)
          }}
          label={(s) => t(`classes.${SERIES_CLASS[s]}`)}
        />
        <Choice
          group="exercise"
          value={code}
          options={codes}
          onChange={setCode}
          label={(o) => `${o} ${cardName(o)}`}
        />
      </div>
      <AnimationPlayer key={code} code={code} keyboard />
    </div>
  )
}
