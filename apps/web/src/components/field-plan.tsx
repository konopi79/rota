import {
  isNational,
  geometry,
  stationsOf,
  type Card,
  type DeckEntry,
  type Layout,
  type Point,
  type Pose,
} from '@rota/content'

import { cardImageUrl } from '@/components/deck/card-image'
import { cn } from '@/lib/utils'

const { bearing, offset, shapeOf, signOf, walkOf, wayTo, withSupplementary } = geometry

/**
 * Drawing margin around the field, in metres: room for the cards that stand over the edge
 * (a card may, the course may not — `geometry.EDGE`) and, outside them, the axis labels.
 */
const PAD = 2.4
/** Where the axis labels sit outside the field — clear of a card over the edge. */
const LABEL_GAP = 1.7

/** Width over height of a drawn plan, margins included — to size it before it is drawn. */
export const planAspect = ({ width, height }: { width: number; height: number }) =>
  (width + 2 * PAD) / (height + 2 * PAD)
/** Cards are drawn larger than life (a real one is ~30 cm) so they stay readable. */
const CARD_W = 1.7
const CARD_H = (CARD_W * 283) / 400
const NUMBER_R = 0.5
/** A D0 card is drawn smaller, beside its main card, and so are the cards of one station. */
const D0_W = CARD_W * 0.6
const CARD_GAP = 0.05

/**
 * The plan of one round of a deck laid out on a field, drawn the way judges draw their
 * course plans: a 1 m grid, each card turned to face the team coming to it and standing
 * where the regulation puts it (A — the team works left of the card, B — in front of it),
 * a national D0 card right beside it, numbered, with its cones, bowls and jumps, and the
 * path walked between the cards. 1 unit = 1 m. `current` highlights a card (index into
 * `entries`) — with the others of its station, if it shares one (CNDC, plan R18): the cards of
 * one station stand side by side, numbered past them.
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
    const supplementary = entry.supplementary ? card(entry.supplementary) : undefined
    // (With a D0 card that turns the team — D0e, 2027 — the exercise as laid out.)
    const c = withSupplementary(card(entry.code), supplementary)
    const shape = shapeOf(c, at, entry.side, recallFollows)
    return [{ index: r.first + i, card: c, supplementary, at, shape, joined: !!entry.withPrevious }]
  })
  // Several cards at one station (CNDC): drawn side by side from where the first one stands,
  // facing the team as it comes in to it — larger than life like every card, so further apart
  // than `geometry.standsOf` puts them.
  const stations = stationsOf(entries)
  const stationOf = (index: number) => stations.find(([a, b]) => index >= a && index <= b)
  const highlighted = current === undefined ? undefined : stationOf(current)
  const centres = new Map<number, { centre: Point; heading: number; grouped: boolean }>()
  for (const [a, b] of stations) {
    const first = items.find((item) => item.index === a)
    if (!first) continue
    let centre = signOf(first.card, first.at)
    for (let index = a; index <= b; index++) {
      const item = items.find((it) => it.index === index)
      if (!item) continue
      centres.set(index, { centre, heading: first.at.heading, grouped: b > a })
      const width = CARD_W + CARD_GAP + (item.supplementary ? D0_W + CARD_GAP : 0)
      centre = offset(centre, first.at.heading, 0, width)
    }
  }

  // Walks between the cards, straight on from where an exercise ends: start → card → … →
  // finish. After a turn about the team walks back beside its way in — a hairpin from the
  // card (drawn over the way in, the walk back looked like a turn before the card). A
  // national recall card set to the side of its leave card is walked to straight. A national
  // course is drawn as walked through in animation: the turn about is done on the spot, and the
  // team gets over beside its way in at a slant (`wayTo`; the author, 2026-10-30 — the hairpin
  // drawn, the way to the next card looked straight where the team could not walk it so).
  const walks: [Point, Point][] = []
  const slants: [Point, Point][] = []
  const hairpins: { from: Pose; beside: Point }[] = []
  const targets = [...items.map(({ at }) => at), r.finish]
  let from: Pose = r.start
  targets.forEach((to, i) => {
    // At the station of the card before (CNDC): no way between them.
    const item = items[i]
    if (item?.joined) {
      from = item.shape.exit
      return
    }
    const across = walkOf(from, to)?.across ?? 0
    const before = items[i - 1]
    if (before?.shape.hairpin && Math.abs(across) > 0.05 && isNational(before.card.ruleset)) {
      const [, join] = wayTo(before.shape, from, to, i === items.length)
      slants.push([from, join!])
      walks.push([join!, to])
    } else if (
      !!before &&
      isNational(before.card.ruleset) &&
      !before.shape.hairpin &&
      wayTo(before.shape, from, to).length > 2
    ) {
      // On past a leave card's jump before over to a follow-up set aside (3-314), as walked.
      const [, past] = wayTo(before.shape, from, to)
      slants.push([from, past!])
      walks.push([past!, to])
    } else if (before?.shape.hairpin && Math.abs(across) > 0.05) {
      const beside = offset(from, from.heading, 0, across)
      hairpins.push({ from, beside })
      walks.push([beside, to])
    } else {
      walks.push([from, to])
    }
    from = items[i]?.shape.exit ?? from
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
      {walks.map(([a, b], i) => (
        <Walk key={i} from={a} to={b} />
      ))}
      {slants.map(([a, b], i) => (
        <line
          key={`s${i}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          className="stroke-foreground"
          strokeWidth={0.1}
        />
      ))}
      {hairpins.map(({ from, beside }, i) => {
        // Bulging on the way the team came in, as wide as it is.
        const bulge = -0.4 - 0.3 * Math.hypot(beside.x - from.x, beside.y - from.y)
        const a = offset(from, from.heading, bulge)
        const b = offset(beside, from.heading, bulge)
        return (
          <path
            key={`u${i}`}
            d={`M${from.x},${from.y} C${a.x},${a.y} ${b.x},${b.y} ${beside.x},${beside.y}`}
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
      {items.map(({ index, card: c, supplementary, at }) => {
        const placed = centres.get(index)
        return (
          <PlacedCard
            key={index}
            card={c}
            supplementary={supplementary}
            at={placed ? { ...at, heading: placed.heading } : at}
            centre={placed?.centre}
            grouped={placed?.grouped}
            number={index + 1}
            active={
              highlighted ? index >= highlighted[0] && index <= highlighted[1] : index === current
            }
          />
        )
      })}
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
      <text key={`lx${x}`} x={x} y={height + LABEL_GAP + 0.4} textAnchor="middle" {...label}>
        {x}
      </text>,
    )
  }
  for (let y = 0; y <= height; y += 5) {
    lines.push(
      <text
        key={`ly${y}`}
        x={-LABEL_GAP}
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
 * (B) have it straight ahead, the others (A, D) to the team's right. A national D0 card
 * stands "těsně vpravo vedle" the main card (řád §5.3, p. 8), drawn smaller.
 */
function PlacedCard({
  card,
  supplementary,
  at,
  centre: own,
  grouped,
  number,
  active,
}: {
  /** Without one: the start or the finish. */
  card: Card
  supplementary?: Card
  /** Where the team does the exercise — the heading it faces the card in. */
  at: Point & { heading: number }
  /** Where the card is drawn, if not where it stands for itself (a CNDC). */
  centre?: Point
  /** One of several cards at one station: its number behind it, clear of the cards beside. */
  grouped?: boolean
  number?: number
  active?: boolean
}) {
  const ahead = card.placement === 'B'
  const centre = own ?? signOf(card.kind === 'exercise' ? card : undefined, at)
  const side = { w: D0_W, h: CARD_H * 0.6 }
  // The number past the D0 card, if there is one.
  const past = supplementary ? side.w + CARD_GAP : 0
  const tag = grouped
    ? offset(centre, at.heading, CARD_H / 2 + NUMBER_R + 0.1)
    : offset(
        centre,
        at.heading,
        -CARD_H / 2 - 0.15,
        (ahead ? CARD_W / 2 + 0.35 : CARD_W / 2 + 0.2) + past,
      )
  const outline = active ? 'stroke-primary' : 'stroke-foreground'
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
          className={outline}
          strokeWidth={active ? 0.2 : 0.05}
        />
        {supplementary && (
          <g>
            <image
              href={cardImageUrl(supplementary, 'thumb')}
              x={centre.x + CARD_W / 2 + 0.05}
              y={centre.y + CARD_H / 2 - side.h}
              width={side.w}
              height={side.h}
              preserveAspectRatio="xMidYMid meet"
            />
            <rect
              x={centre.x + CARD_W / 2 + 0.05}
              y={centre.y + CARD_H / 2 - side.h}
              width={side.w}
              height={side.h}
              fill="none"
              className={outline}
              strokeWidth={0.05}
            />
          </g>
        )}
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

/** The walk between two cards, with an arrowhead where it arrives. */
function Walk({ from, to }: { from: Point; to: Point }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (length < 0.5) return null
  const heading = bearing(from, to)
  const tip = offset(to, heading, -0.35)
  const left = offset(tip, heading, -0.45, -0.25)
  const right = offset(tip, heading, -0.45, 0.25)
  return (
    <g className="stroke-foreground fill-foreground">
      <line x1={from.x} y1={from.y} x2={tip.x} y2={tip.y} strokeWidth={0.1} />
      <polygon
        points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
        strokeWidth={0}
      />
    </g>
  )
}
