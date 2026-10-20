import {
  geometry,
  type Card,
  type DeckEntry,
  type Layout,
  type Point,
  type Pose,
} from '@rota/content'

import { cardImageUrl } from '@/components/deck/card-image'
import { cn } from '@/lib/utils'

const { angleDiff, bearing, distance, offset, shapeOf, signOf, walkOf } = geometry

/** Drawing margin around the field (room for the axis labels), in metres. */
const PAD = 1.4
/** Cards are drawn larger than life (a real one is ~30 cm) so they stay readable. */
const CARD_W = 1.7
const CARD_H = (CARD_W * 283) / 400
const NUMBER_R = 0.5
/** How far beside its way in the team is drawn walking back after turning about. */
const ABOUT_OFFSET = 0.7

/**
 * The plan of one round of a deck laid out on a field (FCI), drawn the way judges draw
 * their course plans: a 1 m grid, each card turned to face the team coming to it and
 * standing where the regulation puts it (§4.3: A — the team works left of the card, B —
 * in front of it), numbered, with its cones, bowls and jumps, and the path walked between
 * the cards. 1 unit = 1 m. `current` highlights a card (index into `entries`).
 */
export function FieldPlan({
  layout,
  entries,
  card,
  round,
  current,
  title,
  className,
}: {
  layout: Layout
  entries: DeckEntry[]
  card: (code: string) => Card
  round: number
  current?: number
  title: string
  className?: string
}) {
  const r = layout.rounds[round]
  if (!r) return null
  const { width, height } = layout
  const end = layout.rounds[round + 1]?.first ?? entries.length
  const items = entries.slice(r.first, end).flatMap((entry, i) => {
    const at = entry.at
    if (!at) return []
    const next = entries[r.first + i + 1]
    const recallFollows =
      r.first + i + 1 < end && !!next && !!card(next.code).sequencing.onlyAfterLeave
    const c = card(entry.code)
    return [{ index: r.first + i, card: c, at, shape: shapeOf(c, at, entry.side, recallFollows) }]
  })

  // Walks between the cards: start → card, where an exercise ends → the next card → finish,
  // with the corner where the team turns on the way.
  const targets: Pose[] = [...items.map(({ at }) => at), r.finish]
  const walks: Point[][] = []
  // Turns about on the spot, drawn as a hairpin from the card to the walk on beside the way
  // in — drawn over it, the walk back looked like a turn before the card (handler
  // feedback, 2026-10-21).
  const hairpins: { at: Pose; beside: Point }[] = []
  let from: Pose = r.start
  targets.forEach((to, i) => {
    walks.push(walkOf(from, to)?.points ?? [from, to])
    const item = items[i]
    if (!item) return
    const { at, shape } = item
    from = shape.exit
    const next = targets[i + 1]
    if (
      next &&
      distance(shape.exit, at) < 0.01 &&
      Math.abs(angleDiff(at.heading, shape.exit.heading)) > 179
    ) {
      const side = Math.sign(at.turn) || 1
      const beside = { ...offset(at, at.heading, 0, side * ABOUT_OFFSET), heading: from.heading }
      if (walkOf(beside, next)) {
        hairpins.push({ at, beside })
        from = beside
      }
    }
  })

  const startCard = card('START')
  const finishCard = card('FINISH')

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}`}
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label={title}
    >
      <rect width={width} height={height} className="fill-card" />
      <Grid width={width} height={height} />
      <rect
        width={width}
        height={height}
        fill="none"
        className="stroke-foreground"
        strokeWidth={0.1}
      />

      {/* What happens inside an exercise (a recall cone 5 m on, steps back) — dashed. */}
      {items.flatMap(({ index, at, shape }) =>
        [shape.exit, shape.back].flatMap((to, i) =>
          to && (to.x !== at.x || to.y !== at.y)
            ? [
                <line
                  key={`in${index}-${i}`}
                  x1={at.x}
                  y1={at.y}
                  x2={to.x}
                  y2={to.y}
                  className="stroke-muted-foreground"
                  strokeWidth={0.1}
                  strokeDasharray="0.3 0.25"
                />,
              ]
            : [],
        ),
      )}
      {walks.map((points, i) => (
        <Walk key={i} points={points} />
      ))}
      {hairpins.map(({ at, beside }, i) => {
        const a = offset(at, at.heading, 0.6)
        const b = offset(beside, at.heading, 0.6)
        return (
          <path
            key={`u${i}`}
            d={`M${at.x},${at.y} C${a.x},${a.y} ${b.x},${b.y} ${beside.x},${beside.y}`}
            fill="none"
            className="stroke-foreground"
            strokeWidth={0.1}
          />
        )
      })}

      {items.flatMap(({ index, shape }) =>
        shape.props.map((p, i) => <Prop key={`${index}-${i}`} prop={p} />),
      )}

      <PlacedCard card={startCard} at={r.start} />
      <PlacedCard card={finishCard} at={r.finish} />
      {items.map(({ index, card: c, at }) => (
        <PlacedCard key={index} card={c} at={at} number={index + 1} active={index === current} />
      ))}
    </svg>
  )
}

/** A 1 m grid, stronger every 5 m, labelled in metres like the judges' plans. */
function Grid({ width, height }: { width: number; height: number }) {
  const lines = []
  for (let x = 1; x < width; x++) {
    lines.push(
      <line
        key={`x${x}`}
        x1={x}
        x2={x}
        y2={height}
        className="stroke-border"
        strokeWidth={x % 5 ? 0.025 : 0.06}
      />,
    )
  }
  for (let y = 1; y < height; y++) {
    lines.push(
      <line
        key={`y${y}`}
        y1={y}
        y2={y}
        x2={width}
        className="stroke-border"
        strokeWidth={y % 5 ? 0.025 : 0.06}
      />,
    )
  }
  const label = { fontSize: 0.6, className: 'fill-muted-foreground' }
  for (let x = 0; x <= width; x += 5) {
    lines.push(
      <text key={`lx${x}`} x={x} y={height + 0.9} textAnchor="middle" {...label}>
        {x}
      </text>,
    )
  }
  for (let y = 0; y <= height; y += 5) {
    lines.push(
      <text
        key={`ly${y}`}
        x={-0.5}
        y={height - y}
        textAnchor="end"
        dominantBaseline="central"
        {...label}
      >
        {y}
      </text>,
    )
  }
  return <g>{lines}</g>
}

/**
 * A card image turned to face the team coming to it. Exercises done in front of the card
 * (B) have it straight ahead, the others (A, D) to the team's right.
 */
function PlacedCard({
  card,
  at,
  number,
  active,
}: {
  card: Card
  at: Point & { heading: number }
  number?: number
  active?: boolean
}) {
  const ahead = card.placement === 'B'
  const centre = signOf(card.placement, at)
  const tag = offset(
    centre,
    at.heading,
    -CARD_H / 2 - 0.15,
    ahead ? CARD_W / 2 + 0.35 : CARD_W / 2 + 0.2,
  )
  return (
    <g>
      <g transform={`rotate(${at.heading} ${centre.x} ${centre.y})`}>
        <image
          href={cardImageUrl(card, 'thumb')}
          x={centre.x - CARD_W / 2}
          y={centre.y - CARD_H / 2}
          width={CARD_W}
          height={CARD_H}
          preserveAspectRatio="xMidYMid meet"
        />
        <rect
          x={centre.x - CARD_W / 2}
          y={centre.y - CARD_H / 2}
          width={CARD_W}
          height={CARD_H}
          fill="none"
          className={active ? 'stroke-primary' : 'stroke-foreground'}
          strokeWidth={active ? 0.2 : 0.05}
        />
      </g>
      {number !== undefined && (
        <g>
          <circle
            cx={tag.x}
            cy={tag.y}
            r={active ? NUMBER_R * 1.3 : NUMBER_R}
            className={active ? 'fill-primary stroke-primary' : 'fill-card stroke-foreground'}
            strokeWidth={0.06}
          />
          <text
            x={tag.x}
            y={tag.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={active ? 0.7 : 0.55}
            fontWeight={600}
            className={active ? 'fill-primary-foreground' : 'fill-foreground'}
          >
            {number}
          </text>
        </g>
      )}
    </g>
  )
}

function Prop({ prop }: { prop: geometry.PlacedProp }) {
  if (prop.kind === 'jump') {
    // The bar across the dog's way, with its two stands.
    const a = offset(prop, prop.heading, 0, -0.5)
    const b = offset(prop, prop.heading, 0, 0.5)
    return (
      <g className="stroke-cone" strokeWidth={0.12} strokeLinecap="round">
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        {[a, b].map((p, i) => {
          const p1 = offset(p, prop.heading, 0.25)
          const p2 = offset(p, prop.heading, -0.25)
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
        })}
      </g>
    )
  }
  if (prop.kind === 'bowl') {
    return (
      <circle
        cx={prop.x}
        cy={prop.y}
        r={0.25}
        className="fill-card stroke-foreground"
        strokeWidth={0.08}
      />
    )
  }
  return <circle cx={prop.x} cy={prop.y} r={0.25} className="fill-cone" />
}

/** The walk between two cards (through its corner), with an arrowhead where it arrives. */
function Walk({ points }: { points: Point[] }) {
  const to = points.at(-1)
  const from = points.at(-2)
  if (!to || !from) return null
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (length < 0.5) return null
  const heading = bearing(from, to)
  const tip = offset(to, heading, -0.35)
  const left = offset(tip, heading, -0.45, -0.25)
  const right = offset(tip, heading, -0.45, 0.25)
  return (
    <g className="stroke-foreground fill-foreground">
      <polyline
        points={[...points.slice(0, -1), tip].map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        strokeWidth={0.1}
        strokeLinejoin="round"
      />
      <polygon
        points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
        strokeWidth={0}
      />
    </g>
  )
}
