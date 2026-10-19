import { getCard, getClass } from '../registry'
import type { Card, RoClass } from '../schema'
import {
  angleDiff,
  approachOf,
  bearing,
  CARD_SPACING,
  distance,
  EDGE,
  MAX_JUMPS,
  PROP_SPACING,
  shapeOf,
  signOf,
  turnsOf,
  type Shape,
} from './geometry'
import { endsStatic, hasEquipment, paceAfter, sideAfter } from './rules'
import type { Deck, DeckEntry, Layout, Pace, Point, Pose, Round, Side } from './types'

/**
 * Independent check of a dealt deck against the rules of plan §5. Returns one message
 * per broken rule (empty = performable). Deliberately written without the dealer's
 * candidate logic, so a bug in one is caught by the other in the property tests.
 */
export function validateDeck(deck: Deck): string[] {
  const { options, entries } = deck
  const cls = getClass(options.classId)
  if (!cls) return [`unknown class ${options.classId}`]

  const errors: string[] = []
  const inClass = new Set(cls.cardCodes)
  const newOnly = options.scope === 'new' && cls.newCardCodes.length > 0
  const seenMain = new Set<string>()
  let pace: Pace = 'normal'
  let side: Side = options.startSide
  let prevStatic = false
  let prevRequired: string[] | undefined
  let prevOptional: string[] = []
  let prevCode: string | undefined
  const counts = new Map<string, number>()

  entries.forEach((entry, i) => {
    const at = `#${i + 1} ${entry.code}`
    const card = getCard(cls.ruleset, entry.code)
    if (!card || card.kind !== 'exercise') {
      errors.push(`${at}: not an exercise card`)
      return
    }
    const seq = card.sequencing

    if (!inClass.has(card.code)) errors.push(`${at}: not in class ${cls.id}`)
    if (!hasEquipment(card, options)) errors.push(`${at}: needs equipment not at hand`)
    if (card.code === prevCode) errors.push(`${at}: same card twice in a row`)

    if (prevRequired && !prevRequired.includes(card.code)) {
      errors.push(`${at}: not a follow-up of the leave card`)
    }
    if (seq.onlyAfterLeave) {
      if (!prevRequired?.includes(card.code) && !prevOptional.includes(card.code)) {
        errors.push(`${at}: follow-up card without a leave card`)
      }
    } else {
      if (seenMain.has(card.code)) errors.push(`${at}: dealt twice`)
      if (newOnly && !cls.newCardCodes.includes(card.code)) {
        errors.push(`${at}: not a new card of ${cls.id}`)
      }
      seenMain.add(card.code)
    }

    if (seq.afterStatic && !prevStatic) errors.push(`${at}: must follow a static exercise`)
    if (seq.pace && seq.pace === pace) errors.push(`${at}: pace is already ${pace}`)
    if (cls.course.paceCompatibleOnly && pace !== 'normal' && !seq.pace && !seq.paceCompatible) {
      errors.push(`${at}: cannot be performed in ${pace} pace`)
    }
    if (seq.sideOnly && seq.sideOnly !== side)
      errors.push(`${at}: only with the dog ${seq.sideOnly}`)
    counts.set(card.code, (counts.get(card.code) ?? 0) + 1)
    if (cls.course.maxRepeats && (counts.get(card.code) ?? 0) > cls.course.maxRepeats) {
      errors.push(`${at}: more than ${cls.course.maxRepeats} times`)
    }
    if (seq.lastOnly?.includes(cls.id) && i !== entries.length - 1) {
      errors.push(`${at}: allowed only as the last card in ${cls.id}`)
    }
    if (seq.nextOneOf && i === entries.length - 1) {
      errors.push(`${at}: leave card without follow-up`)
    }

    if (seq.requiresSupplementary) {
      if (!entry.supplementary) errors.push(`${at}: missing its D0 card`)
      else if (!cls.course.supplementary.includes(entry.supplementary)) {
        errors.push(`${at}: ${entry.supplementary} not allowed in ${cls.id}`)
      }
    } else if (entry.supplementary) {
      errors.push(`${at}: has a D0 card it does not take`)
    }

    if (entry.side !== side) errors.push(`${at}: side should be ${side}`)
    if (entry.pace !== pace) errors.push(`${at}: pace should be ${pace}`)

    const static_ = endsStatic(cls, card, entry.supplementary)
    pace = paceAfter(card, pace, static_)
    side = sideAfter(card, side)
    prevStatic = static_
    prevRequired = seq.nextOneOf
    prevOptional = seq.mayBeFollowedBy ?? []
    prevCode = card.code
  })

  if (options.competition) {
    const { minCards, maxCards, minByPoints = {} } = cls.course
    if (entries.length < minCards || entries.length > maxCards) {
      errors.push(`course of ${entries.length} cards, ${cls.id} needs ${minCards}–${maxCards}`)
    }
    for (const [points, min] of Object.entries(minByPoints)) {
      const have = entries.filter(
        (e) => getCard(cls.ruleset, e.code)?.points === Number(points),
      ).length
      if (have < min) errors.push(`only ${have} ${points}-point cards, at least ${min} needed`)
    }
  }
  if (cls.course.field) errors.push(...validateLayout(cls, deck))
  else if (deck.layout || entries.some((e) => e.at)) errors.push(`${cls.id} is not laid out`)
  return errors
}

/** Rounding slack for distances (m) and angles (°). */
const EPS = 0.01

/**
 * The deck fits its field (plan §5, FCI), round by round: start on the edge, each card
 * 3–5 m on from the end of the previous exercise (recall cards and recall cones at their
 * stated distance), no turn sharper than the regulation allows between cards, everything
 * inside the field, cards (where they stand) and equipment clear of each other, at most
 * two jumps.
 */
function validateLayout(cls: RoClass, deck: Deck): string[] {
  const { layout, entries } = deck
  if (!layout) return entries.length ? ['no field layout'] : []
  const errors: string[] = []
  const { rounds } = layout
  if (rounds[0]?.first !== 0) errors.push('rounds: the first round does not start at card 1')
  rounds.forEach((round, k) => {
    const end = rounds[k + 1]?.first ?? entries.length
    if (end <= round.first) errors.push(`round ${k + 1}: no cards`)
    else errors.push(...validateRound(cls, layout, entries.slice(round.first, end), round))
  })
  return errors
}

function validateRound(
  cls: RoClass,
  layout: Layout,
  entries: DeckEntry[],
  { first, start, finish }: Round,
): string[] {
  const errors: string[] = []
  const inside = (p: Point) =>
    p.x >= EDGE - EPS &&
    p.x <= layout.width - EDGE + EPS &&
    p.y >= EDGE - EPS &&
    p.y <= layout.height - EDGE + EPS
  const label = (i: number) => `#${first + i + 1} ${entries[i]?.code}`

  const onEdge = [
    { d: start.y - (layout.height - EDGE), heading: 0 },
    { d: start.x - EDGE, heading: 90 },
    { d: start.y - EDGE, heading: 180 },
    { d: start.x - (layout.width - EDGE), heading: 270 },
  ].some(({ d, heading }) => Math.abs(d) < EPS && Math.abs(angleDiff(heading, start.heading)) < EPS)
  if (!inside(start) || !onEdge) errors.push(`#${first + 1}: start not on the edge facing in`)

  const cards = entries.map((e) => getCard(cls.ruleset, e.code) as Card)
  // Each exercise with its equipment; a leave card has no recall cone when a recall card
  // follows on the same field.
  const shapes: (Shape | undefined)[] = entries.map(
    (entry, i) =>
      entry.at &&
      shapeOf(cards[i] as Card, entry.at, entry.side, !!cards[i + 1]?.sequencing.onlyAfterLeave),
  )

  /** The step from the end of the previous exercise to a card (or the finish). */
  const checkStep = (at: string, previous: Shape | undefined, card: Card | undefined, to: Pose) => {
    if (card?.sequencing.onlyAfterLeave && !previous) {
      errors.push(`${at}: recall card without its leave card on the field`)
    }
    const from = previous?.exit ?? start
    const { min, max, maxBend } = approachOf(previous, card)
    const d = distance(from, to)
    if (d < min - EPS || d > max + EPS) {
      errors.push(`${at}: ${d.toFixed(1)} m from the previous exercise`)
    }
    if (d > EPS && Math.abs(angleDiff(bearing(from, to), to.heading)) > 1) {
      errors.push(`${at}: not facing the way the team comes`)
    }
    if (Math.abs(angleDiff(from.heading, to.heading)) > maxBend + EPS) {
      errors.push(`${at}: turn of more than ${maxBend}° between cards`)
    }
    if (!inside(to)) errors.push(`${at}: outside the field`)
  }

  entries.forEach((entry, i) => {
    const card = cards[i] as Card
    const shape = shapes[i]
    if (!entry.at || !shape) {
      errors.push(`${label(i)}: not placed on the field`)
      return
    }
    if (!turnsOf(card).includes(entry.at.turn)) {
      errors.push(`${label(i)}: turn ${entry.at.turn}° not allowed`)
    }
    checkStep(label(i), shapes[i - 1], card, entry.at)
    if (!inside(shape.exit)) errors.push(`${label(i)}: leaves the field`)
    for (const p of shape.props) {
      if (!inside(p)) errors.push(`${label(i)}: ${p.kind} outside the field`)
    }
  })
  checkStep(
    `finish after #${first + entries.length}`,
    shapes[entries.length - 1],
    undefined,
    finish,
  )

  // Clearances: cards (where they stand) from cards; equipment from the other exercises —
  // where they are done, their cards and their equipment.
  const signs: { label: string; p: Point }[] = [
    { label: 'start', p: signOf('A', start) },
    ...entries.flatMap((e, i) =>
      e.at ? [{ label: label(i), p: signOf(cards[i]?.placement, e.at) }] : [],
    ),
    { label: 'finish', p: signOf('A', finish) },
  ]
  signs.forEach((a, i) => {
    if (!inside(a.p)) errors.push(`${a.label}: card outside the field`)
    for (const b of signs.slice(i + 1)) {
      if (distance(a.p, b.p) < CARD_SPACING - EPS) {
        errors.push(`${a.label} and ${b.label}: too close`)
      }
    }
  })
  const spots = [
    ...signs,
    { label: 'start', p: start },
    ...entries.flatMap((e, i) => (e.at ? [{ label: label(i), p: e.at }] : [])),
    { label: 'finish', p: finish },
  ]
  const props = shapes.flatMap((shape, i) =>
    (shape?.props ?? []).map((p) => ({ owner: label(i), p })),
  )
  props.forEach((a, i) => {
    for (const s of spots) {
      if (s.label !== a.owner && distance(s.p, a.p) < PROP_SPACING - EPS) {
        errors.push(`${a.owner}: ${a.p.kind} too close to ${s.label}`)
      }
    }
    for (const b of props.slice(i + 1)) {
      if (b.owner !== a.owner && distance(a.p, b.p) < PROP_SPACING - EPS) {
        errors.push(`${a.owner}: ${a.p.kind} too close to the ${b.p.kind} of ${b.owner}`)
      }
    }
  })
  const jumps = props.filter(({ p }) => p.kind === 'jump').length
  if (jumps > MAX_JUMPS)
    errors.push(`#${first + 1}: ${jumps} jumps in a round, at most ${MAX_JUMPS}`)
  return errors
}
