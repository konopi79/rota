'use client'

import { getCard, type Card, type Deck, type RoClass } from '@rota/content'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  SRGBColorSpace,
  TOUCH,
  Vector3,
  type Group,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { useWakeLock } from '@/components/deck/use-wake-lock'
import { Figure, type FigureHandle } from '@/components/figures/figure'
import {
  Bowl,
  CardStand,
  Cone,
  CONE_COLOURS,
  GroundMark,
  Jump,
  SLOW_MOTION,
} from '@/components/figures/exercise-animation'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DOG } from '@/lib/figures/dog'
import { ExercisePlayer, type Pose } from '@/lib/figures/exercise'
import { HANDLER } from '@/lib/figures/handler'
import { onField } from '@/lib/figures/team'
import { walkthroughOf, type Station, type Walkthrough } from '@/lib/figures/walkthrough'

type View = 'follow' | 'field'
type Speed = keyof typeof SLOW_MOTION | 'double'
const SPEEDS: Record<Speed, number> = { ...SLOW_MOTION, double: 2 }

/** Behind the team and a little to the dog's side, metres: back, up, aside (left). */
const FOLLOW = { back: 4.2, up: 2.3, aside: 1.2 }
/** How quickly the camera behind the team swings round after it, 1/s. */
const FOLLOW_TURN = 1.5
/** The height the camera behind the team looks at, metres. */
const FOLLOW_AT = 0.6
/** A press that moves farther than this, pixels, turns the view and is no tap (pause). */
const TAP = 6

/** `text` big in the middle of a canvas: in a circle (a card's number) or on a card. */
function useTextTexture(text: string, shape: 'circle' | 'card') {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = shape === 'circle' ? 128 : 180
    canvas.height = 128
    const g = canvas.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.strokeStyle = '#26272b'
    g.lineWidth = 8
    if (shape === 'circle') {
      g.beginPath()
      g.arc(64, 64, 58, 0, 2 * Math.PI)
      g.fill()
      g.stroke()
    } else {
      g.fillRect(0, 0, canvas.width, canvas.height)
    }
    g.fillStyle = '#26272b'
    g.font = `bold ${shape === 'circle' ? 64 : 96}px system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, canvas.width / 2, 68)
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    return map
  }, [text, shape])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

/** A card's number over its stand, as in circles on the course plan; always facing the view. */
function NumberTag({ number, at }: { number: number; at: Pose }) {
  const map = useTextTexture(String(number), 'circle')
  return (
    // Just above the card's top edge (0.34 m), small enough not to hide the team.
    <sprite position={[at.x, 0.46, at.z]} scale={[0.2, 0.2, 1]}>
      <spriteMaterial map={map} />
    </sprite>
  )
}

/** A small card on a stand with `text` on it (the start's mark "R"), facing the team. */
function MarkStand({ text, at }: { text: string; at: Pose }) {
  const map = useTextTexture(text, 'card')
  return (
    <group position={[at.x, 0, at.z]} rotation-y={at.heading + Math.PI}>
      <mesh position={[0, 0.17, 0]} rotation-x={-0.3}>
        <boxGeometry args={[0.3, 0.22, 0.01]} />
        <meshStandardMaterial color="#e8e8e8" />
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[0.28, 0.2]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
      </mesh>
    </group>
  )
}

/** A card's stand at `at` (a place in the walkthrough's frame), facing the team coming. */
function PlacedStand({ code, at }: { code: string; at: Pose }) {
  return (
    <group position={[at.x, 0, at.z]} rotation-y={at.heading}>
      <CardStand code={code} x={0} z={0} />
    </group>
  )
}

/** The field: lighter grass, a 1 m grid and its edge, as on the course plan. */
function Field({ corners }: { corners: Walkthrough['field']['corners'] }) {
  const [a, b, , d] = corners
  const lines = useMemo(() => {
    const along = { x: b.x - a.x, z: b.z - a.z }
    const down = { x: d.x - a.x, z: d.z - a.z }
    const width = Math.round(Math.hypot(along.x, along.z))
    const height = Math.round(Math.hypot(down.x, down.z))
    const at = (u: number, v: number) => [
      a.x + (along.x * u) / width + (down.x * v) / height,
      0.003,
      a.z + (along.z * u) / width + (down.z * v) / height,
    ]
    const grid: number[] = []
    const edge: number[] = []
    for (let u = 0; u <= width; u++) (u % width ? grid : edge).push(...at(u, 0), ...at(u, height))
    for (let v = 0; v <= height; v++) (v % height ? grid : edge).push(...at(0, v), ...at(width, v))
    const geometry = (points: number[]) => {
      const g = new BufferGeometry()
      g.setAttribute('position', new BufferAttribute(new Float32Array(points), 3))
      return g
    }
    return { grid: geometry(grid), edge: geometry(edge), width, height }
  }, [a, b, d])
  useEffect(
    () => () => {
      lines.grid.dispose()
      lines.edge.dispose()
    },
    [lines],
  )
  const centre = { x: (a.x + corners[2].x) / 2, z: (a.z + corners[2].z) / 2 }
  const angle = Math.atan2(-(b.z - a.z), b.x - a.x)
  return (
    <>
      <mesh
        position={[centre.x, 0.001, centre.z]}
        rotation={[-Math.PI / 2, 0, angle]}
        receiveShadow
      >
        <planeGeometry args={[lines.width, lines.height]} />
        <meshStandardMaterial color="#93c477" />
      </mesh>
      <lineSegments geometry={lines.grid}>
        <lineBasicMaterial color="#7fae64" />
      </lineSegments>
      <lineSegments geometry={lines.edge}>
        <lineBasicMaterial color="#f5f5f0" />
      </lineSegments>
    </>
  )
}

/** The team walking the course; reports where it is and what it does. */
function Team({
  walkthrough,
  slowMotion,
  focusRef,
  onFrame,
}: {
  walkthrough: Walkthrough
  slowMotion: number
  focusRef: RefObject<Pose>
  onFrame: (step: number, caption: string | null, flipped: boolean, finished: boolean) => void
}) {
  const player = useRef<ExercisePlayer>(null)
  const team = useRef<Group>(null)
  const dog = useRef<FigureHandle>(null)
  const handler = useRef<FigureHandle>(null)
  const last = useRef<string>('')
  const done = useRef(false)

  useFrame((_, delta) => {
    player.current ??= new ExercisePlayer(walkthrough.exercise)
    if (done.current) return
    // A dropped frame (tab in the background) must not make the figures jump.
    const frame = player.current.step(Math.min(delta, 0.1) * slowMotion)
    dog.current?.apply(frame.dog)
    handler.current?.apply(frame.handler)
    team.current?.position.set(frame.team.x, 0, frame.team.z)
    team.current?.rotation.set(0, frame.team.heading, 0)
    focusRef.current = onField(frame.team, { ...frame.handler, heading: 0 })
    focusRef.current.heading = frame.team.heading
    const key = `${frame.scriptStep} ${frame.caption} ${frame.flipped} ${frame.finished}`
    if (key !== last.current) {
      last.current = key
      onFrame(frame.scriptStep, frame.caption, frame.flipped, frame.finished)
    }
    done.current = frame.finished
  })

  return (
    <group ref={team}>
      <Figure rig={DOG} ref={dog} />
      <Figure rig={HANDLER} ref={handler} />
    </group>
  )
}

/** Farther than this in one frame, the team has been put somewhere else (another card). */
const JUMP = 1
const UP = new Vector3(0, 1, 0)

/**
 * Behind the team, swinging round after it as it turns. Dragging (one finger, the mouse) turns
 * the view round the team and the wheel or two fingers zoom; the view then keeps its angle to
 * the team as it walks and turns, and across a jump to another card.
 */
function FollowCamera({ focusRef }: { focusRef: RefObject<Pose> }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls>(null)
  // The team as the camera last followed it, its heading swinging after the team's.
  const followed = useRef<Pose | null>(null)
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.enablePan = false
    controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }
    controls.minDistance = 1.5
    controls.maxDistance = 30
    // The camera stays above the ground: nothing to see from below the field.
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controlsRef.current = controls
    return () => controls.dispose()
  }, [camera, gl])
  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return
    const focus = focusRef.current
    const last = followed.current
    const offset = camera.position.clone().sub(controls.target)
    if (!last) {
      const eye = onField(focus, { x: FOLLOW.aside, z: -FOLLOW.back, heading: 0 })
      offset.set(eye.x - focus.x, FOLLOW.up - FOLLOW_AT, eye.z - focus.z)
      followed.current = { ...focus }
    } else if (Math.hypot(focus.x - last.x, focus.z - last.z) > JUMP) {
      offset.applyAxisAngle(UP, focus.heading - last.heading)
      followed.current = { ...focus }
    } else {
      const k = 1 - Math.exp(-FOLLOW_TURN * Math.min(delta, 0.1))
      const turn =
        Math.atan2(Math.sin(focus.heading - last.heading), Math.cos(focus.heading - last.heading)) *
        k
      offset.applyAxisAngle(UP, turn)
      followed.current = { x: focus.x, z: focus.z, heading: last.heading + turn }
    }
    controls.target.set(focus.x, FOLLOW_AT, focus.z)
    camera.position.copy(controls.target).add(offset)
    controls.update()
  })
  return null
}

/** Above the whole field, the plan's up at the top; two fingers or the mouse turn and zoom. */
function FieldCamera({ walkthrough }: { walkthrough: Walkthrough }) {
  const { camera, gl } = useThree()
  useEffect(() => {
    const [a, b, c, d] = walkthrough.field.corners
    const centre = new Vector3((a.x + c.x) / 2, 0, (a.z + c.z) / 2)
    const size = Math.max(Math.hypot(b.x - a.x, b.z - a.z), Math.hypot(d.x - a.x, d.z - a.z))
    // The plan's up: from its bottom edge to its top (corners 0–1 are the top edge).
    const up = new Vector3(a.x - d.x, 0, a.z - d.z).normalize()
    camera.up.copy(up)
    camera.position.set(centre.x - up.x * 0.01, size * 1.25, centre.z - up.z * 0.01)
    camera.lookAt(centre)
    const controls = new OrbitControls(camera, gl.domElement)
    controls.target.copy(centre)
    controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.update()
    return () => {
      controls.dispose()
      camera.up.set(0, 1, 0)
    }
  }, [camera, gl, walkthrough])
  return null
}

/**
 * The course walked through in animation (plan R16) over the whole screen: the field as the
 * plan lays it out, the cards on their stands, the team going from the start to each card,
 * doing its exercise and on to the finish. Behind the team or over the whole field; pause,
 * speed, back and on by a card. The screen stays on.
 */
export function CourseWalkthrough({
  deck,
  cls,
  title,
  onClose,
}: {
  deck: Deck
  cls: RoClass
  title: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  useWakeLock()
  const [from, setFrom] = useState(0)
  const [run, setRun] = useState(0)
  const [view, setView] = useState<View>('follow')
  // Tapping "Za týmem" again puts a camera turned by hand back behind the team.
  const [behind, setBehind] = useState(0)
  const [speed, setSpeed] = useState<Speed>('full')
  const [paused, setPaused] = useState(false)
  const [state, setState] = useState<{
    step: number
    caption: string | null
    flipped: boolean
    finished: boolean
  }>({ step: 0, caption: null, flipped: false, finished: false })
  const walkthrough = useMemo(() => walkthroughOf(deck, cls, from), [deck, cls, from])
  const focusRef = useRef<Pose>({ ...walkthrough.start })
  // Where a press started: a drag turns the view and must not pause.
  const pressed = useRef<{ x: number; y: number } | null>(null)
  const card = (code: string) => getCard(cls.ruleset, code) as Card

  // The card the team is at, or walking to.
  const at = walkthrough.stations.reduce<Station | undefined>(
    (current, s) => (state.step >= s.firstStep ? s : current),
    undefined,
  )
  const total = deck.entries.length
  const restart = (index: number) => {
    setFrom(Math.max(0, Math.min(total - 1, index)))
    setRun((r) => r + 1)
    setPaused(false)
  }
  // On to the next card — past a follow-up: played from its leave card, it would start over.
  const next = () => {
    let i = (at?.index ?? -1) + 1
    while (i < total && card(deck.entries[i]!.code).sequencing.onlyAfterLeave) i++
    if (i < total) restart(i)
  }
  const captionKey =
    state.caption &&
    (state.flipped && i18n.exists(`figures.captionRight.${state.caption}`)
      ? `figures.captionRight.${state.caption}`
      : `figures.caption.${state.caption}`)

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="truncate font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('walkthrough.close')}>
          <X />
        </Button>
      </div>
      <div
        className="relative min-h-0 flex-1"
        onPointerDown={(e) => (pressed.current = { x: e.clientX, y: e.clientY })}
        onClick={(e) => {
          const p = pressed.current
          if (!p || Math.hypot(e.clientX - p.x, e.clientY - p.y) <= TAP) setPaused((x) => !x)
        }}
      >
        <Canvas shadows camera={{ position: [0, 6, -8], fov: 45 }}>
          <color attach="background" args={['#cfe6f5']} />
          <hemisphereLight args={['#ffffff', '#6f9f58', 1.2]} />
          <directionalLight position={[8, 14, 5]} intensity={2} />
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[160, 160]} />
            <meshStandardMaterial color="#86b86b" />
          </mesh>
          <Field corners={walkthrough.field.corners} />
          <PlacedStand code="START" at={walkthrough.startCard} />
          {walkthrough.startMark && <MarkStand text="R" at={walkthrough.startMark} />}
          <PlacedStand code="FINISH" at={walkthrough.finishCard} />
          {walkthrough.stations.map((s) => (
            <group key={`station ${s.index}`}>
              <PlacedStand code={s.code} at={s.card} />
              <NumberTag number={s.index + 1} at={s.card} />
              {s.supplementary && s.d0 && <PlacedStand code={s.supplementary} at={s.d0} />}
              {s.cones.map((c, i) => (
                <Cone key={`cone${i}`} x={c.x} z={c.z} colour={CONE_COLOURS[i % 2]!} />
              ))}
              {s.bowls.map((c, i) => (
                <Bowl key={`bowl${i}`} x={c.x} z={c.z} />
              ))}
              {s.jumps.map((j, i) => (
                <Jump key={`jump${i}`} x={j.x} z={j.z} heading={j.heading} />
              ))}
              {s.marks.map((m, i) => (
                <GroundMark
                  key={`mark${i}`}
                  x={m.x}
                  z={m.z}
                  heading={m.heading}
                  lengthwise={m.lengthwise}
                />
              ))}
            </group>
          ))}
          <Team
            key={`team ${from} ${run}`}
            walkthrough={walkthrough}
            slowMotion={paused ? 0 : SPEEDS[speed]}
            focusRef={focusRef}
            onFrame={(step, caption, flipped, finished) =>
              setState({ step, caption, flipped, finished })
            }
          />
          {view === 'follow' ? (
            <FollowCamera key={behind} focusRef={focusRef} />
          ) : (
            <FieldCamera walkthrough={walkthrough} />
          )}
        </Canvas>
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-4">
          <div className="bg-background/85 rounded-full px-3 py-1 text-sm font-medium shadow">
            {at
              ? `${t('walkthrough.card', { number: at.index + 1, total })} · ${at.code} ${card(at.code).name}`
              : t('walkthrough.start')}
            {paused && ` · ${t('figures.paused')}`}
          </div>
        </div>
        {captionKey && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            <div className="bg-background/85 rounded-lg px-3 py-1.5 text-center font-medium shadow">
              {state.finished ? t('walkthrough.finished') : t(captionKey)}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t px-3 py-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => restart((at?.index ?? 0) - 1)}
          aria-label={t('walkthrough.previous')}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => (state.finished ? restart(0) : setPaused((p) => !p))}
          aria-label={t(
            state.finished
              ? 'walkthrough.again'
              : paused
                ? 'walkthrough.play'
                : 'walkthrough.pause',
          )}
        >
          {state.finished ? <RotateCcw /> : paused ? <Play /> : <Pause />}
        </Button>
        <Button variant="outline" size="icon" onClick={next} aria-label={t('walkthrough.next')}>
          <ChevronRight />
        </Button>
        <ToggleGroup
          variant="outline"
          value={[speed]}
          onValueChange={(v) => v[0] && setSpeed(v[0] as Speed)}
        >
          {(['half', 'full', 'double'] as const).map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {t(`walkthrough.speed.${s}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          value={[view]}
          onValueChange={(v) =>
            v[0] ? setView(v[0] as View) : view === 'follow' && setBehind((n) => n + 1)
          }
        >
          {(['follow', 'field'] as const).map((v) => (
            <ToggleGroupItem key={v} value={v}>
              {t(`walkthrough.view.${v}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}
