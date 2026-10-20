import { getCard, getClass } from '../registry'
import type { Card, RoClass } from '../schema'
import {
  angleDiff,
  approachOf,
  CARD_SPACING,
  distance,
  distanceToSegment,
  EDGE,
  MAX_JUMPS,
  PROP_SPACING,
  shapeOf,
  signOf,
  turnsOf,
  walkOf,
  type Shape,
} from './geometry'
import { endsStatic, followUpsOf, hasEquipment, paceAfter, sideAfter } from './rules'
import type { Deck, DeckEntry, Layout, Pace, Point, Pose, Round, Side } from './types'

/** What can be wrong at one card of a deck. */
export type CardProblem =
  | { rule: 'not-exercise' }
  | { rule: 'not-in-class' }
  | { rule: 'equipment' }
  | { rule: 'twice-in-row' }
  /** After a leave card only one of its follow-ups may come (`oneOf`: those in the class). */
  | { rule: 'not-follow-up'; leave: string; oneOf: string[] }
  /** A recall / return card without its leave card (`leaveCards`: those in the class). */
  | { rule: 'follow-up-without-leave'; leaveCards: string[] }
  | { rule: 'dealt-twice' }
  | { rule: 'not-new' }
  | { rule: 'after-static' }
  | { rule: 'same-pace'; pace: Pace }
  | { rule: 'pace-incompatible'; pace: Pace }
  | { rule: 'side-only'; side: Side }
  | { rule: 'max-repeats'; max: number }
  | { rule: 'last-only' }
  | { rule: 'leave-without-follow-up'; oneOf: string[] }
  | { rule: 'missing-supplementary' }
  | { rule: 'supplementary-not-allowed'; supplementary: string }
  | { rule: 'unexpected-supplementary' }
  | { rule: 'side-mismatch'; expected: Side }
  | { rule: 'pace-mismatch'; expected: Pace }
  // The judges' guidelines for national courses (plan §5), checked with `competition`:
  /** On the right, a D0 card brings the dog back left — not a change the patterns allow. */
  | { rule: 'supplementary-changes-side' }
  /** `card` (this one or its D0 card) appears `count` times on the course, `limit` allowed. */
  | { rule: 'too-often'; card: string; count: number; limit: number }
  /** The side changes to the finish here, earlier than the last `within` cards. */
  | { rule: 'right-to-finish-early'; within: number }
  /** The side changes here and back mid-course, which the class does not allow. */
  | { rule: 'right-mid-course' }
  /** The mid-course stretch on the right starting here is longer than `max` exercises. */
  | { rule: 'right-mid-too-long'; max: number }

/** A broken rule at one card: `index` into the deck's entries. */
export type CardIssue = { index: number; code: string } & CardProblem

/** A broken rule of a whole course. */
export type CourseIssue =
  | { rule: 'course-size'; count: number; min: number; max: number }
  | { rule: 'points-mix'; points: number; have: number; min: number }
  /** A required exercise of the guidelines is missing (`label` from `course.required`). */
  | { rule: 'required-missing'; oneOf: string[]; label: string }
  /** RO-Z: `statics` of `count` exercises end static — about half should. */
  | { rule: 'static-share'; statics: number; count: number }
  /** From a start "R" the side must change by card `by`. */
  | { rule: 'right-start-late'; by: number }
  /** The side changes do not form one of the class's patterns. */
  | { rule: 'right-pattern' }

export type DeckIssue = CardIssue | CourseIssue

export const isCardIssue = (issue: DeckIssue): issue is CardIssue => 'index' in issue

/**
 * Independent check of a dealt deck against the rules of plan §5. Returns one message
 * per broken rule (empty = performable). Deliberately written without the dealer's
 * candidate logic, so a bug in one is caught by the other in the property tests.
 */
export function validateDeck(deck: Deck): string[] {
  const cls = getClass(deck.options.classId)
  if (!cls) return [`unknown class ${deck.options.classId}`]
  const errors = deckIssues(cls, deck).map((issue) => describeIssue(cls, issue))
  if (cls.course.field) errors.push(...validateLayout(cls, deck))
  else if (deck.layout || deck.entries.some((e) => e.at)) errors.push(`${cls.id} is not laid out`)
  return errors
}

/**
 * The check of a course put together by hand (plan §12): the sequencing rules of the
 * regulations, shown to the user as warnings. "Dealt twice" is left out — no regulation
 * forbids a card twice on a national course (§5.4 only sets the size and the card range),
 * the dealer just draws without replacement; FCI has its own limit (`max-repeats`). The
 * field layout is not checked: a hand-made FCI course is not laid out.
 *
 * `guidelines` (national classes) adds the judges' guidelines: card repeats, required
 * exercises, RO-Z's balance, right-hand stretches. Course size and the FCI point mix stay
 * out — a course for training can be any length.
 */
export function customDeckIssues(deck: Deck, { guidelines = false } = {}): DeckIssue[] {
  const cls = getClass(deck.options.classId)
  if (!cls) throw new Error(`No content for class ${deck.options.classId}`)
  const checked = guidelines ? { ...deck, options: { ...deck.options, competition: true } } : deck
  return deckIssues(cls, checked).filter(
    (issue) =>
      issue.rule !== 'dealt-twice' && issue.rule !== 'course-size' && issue.rule !== 'points-mix',
  )
}

function deckIssues(cls: RoClass, deck: Deck): DeckIssue[] {
  const { options, entries } = deck
  const issues: DeckIssue[] = []
  const inClass = new Set(cls.cardCodes)
  const newOnly = options.scope === 'new' && cls.newCardCodes.length > 0
  const seenMain = new Set<string>()
  // A national course may repeat some cards (`course.repeats`) — counted after the loop.
  const repeats = options.competition ? cls.course.repeats : undefined
  let pace: Pace = 'normal'
  let side: Side = options.startSide
  let prevStatic = false
  let prevRequired: string[] | undefined
  let prevOptional: string[] = []
  let prevCode: string | undefined
  const counts = new Map<string, number>()
  /** Positions (0-based) of the cards after which the dog is on the other side. */
  const sideChanges: number[] = []

  entries.forEach((entry, index) => {
    const add = (problem: CardProblem) => issues.push({ index, code: entry.code, ...problem })
    const card = getCard(cls.ruleset, entry.code)
    if (!card || card.kind !== 'exercise') {
      add({ rule: 'not-exercise' })
      return
    }
    const seq = card.sequencing

    if (!inClass.has(card.code)) add({ rule: 'not-in-class' })
    if (!hasEquipment(card, options)) add({ rule: 'equipment' })
    if (card.code === prevCode) add({ rule: 'twice-in-row' })

    if (prevRequired && prevCode && !prevRequired.includes(card.code)) {
      const oneOf = prevRequired.filter((c) => inClass.has(c))
      add({ rule: 'not-follow-up', leave: prevCode, oneOf })
    }
    if (seq.onlyAfterLeave) {
      if (!prevRequired?.includes(card.code) && !prevOptional.includes(card.code)) {
        const leaveCards = cls.cardCodes.filter((c) =>
          followUpsOf(getCard(cls.ruleset, c)).includes(card.code),
        )
        add({ rule: 'follow-up-without-leave', leaveCards })
      }
    } else {
      if (seenMain.has(card.code) && !repeats) add({ rule: 'dealt-twice' })
      if (newOnly && !cls.newCardCodes.includes(card.code)) add({ rule: 'not-new' })
      seenMain.add(card.code)
    }

    if (seq.afterStatic && !prevStatic) add({ rule: 'after-static' })
    if (seq.pace && seq.pace === pace) add({ rule: 'same-pace', pace })
    if (cls.course.paceCompatibleOnly && pace !== 'normal' && !seq.pace && !seq.paceCompatible) {
      add({ rule: 'pace-incompatible', pace })
    }
    if (seq.sideOnly && seq.sideOnly !== side) add({ rule: 'side-only', side: seq.sideOnly })
    counts.set(card.code, (counts.get(card.code) ?? 0) + 1)
    const max = cls.course.maxRepeats
    if (max && (counts.get(card.code) ?? 0) > max) add({ rule: 'max-repeats', max })
    if (seq.lastOnly?.includes(cls.id) && index !== entries.length - 1) add({ rule: 'last-only' })
    if (seq.nextOneOf && index === entries.length - 1) {
      add({ rule: 'leave-without-follow-up', oneOf: seq.nextOneOf.filter((c) => inClass.has(c)) })
    }

    if (seq.requiresSupplementary) {
      if (!entry.supplementary) add({ rule: 'missing-supplementary' })
      else if (!cls.course.supplementary.includes(entry.supplementary)) {
        add({ rule: 'supplementary-not-allowed', supplementary: entry.supplementary })
      }
    } else if (entry.supplementary) {
      add({ rule: 'unexpected-supplementary' })
    }

    if (entry.side !== side) add({ rule: 'side-mismatch', expected: side })
    if (entry.pace !== pace) add({ rule: 'pace-mismatch', expected: pace })

    const static_ = endsStatic(cls, card, entry.supplementary)
    pace = paceAfter(card, pace, static_)
    const sideNext = sideAfter(cls, card, side, entry.supplementary)
    if (sideNext !== side) sideChanges.push(index)
    if (options.competition && cls.course.rightHand && sideNext !== side && !seq.sideChange) {
      add({ rule: 'supplementary-changes-side' })
    }
    side = sideNext
    prevStatic = static_
    prevRequired = seq.nextOneOf
    prevOptional = seq.mayBeFollowedBy ?? []
    prevCode = card.code
  })

  if (options.competition) {
    const { minCards, maxCards, minByPoints = {} } = cls.course
    if (entries.length < minCards || entries.length > maxCards) {
      issues.push({ rule: 'course-size', count: entries.length, min: minCards, max: maxCards })
    }
    for (const [points, min] of Object.entries(minByPoints)) {
      const have = entries.filter(
        (e) => getCard(cls.ruleset, e.code)?.points === Number(points),
      ).length
      if (have < min) issues.push({ rule: 'points-mix', points: Number(points), have, min })
    }
    issues.push(
      ...rightHandIssues(cls, options.startSide, sideChanges, entries),
      ...nationalCourseIssues(cls, entries),
    )
  }
  return issues
}

/** An issue as the plain English message the tests and the console read. */
function describeIssue(cls: RoClass, issue: DeckIssue): string {
  switch (issue.rule) {
    case 'course-size':
      return `course of ${issue.count} cards, ${cls.id} needs ${issue.min}–${issue.max}`
    case 'points-mix':
      return `only ${issue.have} ${issue.points}-point cards, at least ${issue.min} needed`
    case 'required-missing':
      return `missing a required exercise: one of ${issue.oneOf}`
    case 'static-share':
      return `${issue.statics} static of ${issue.count}, about half needed`
    case 'right-start-late':
      return `start "R": the side must change by card ${issue.by}`
    case 'right-pattern':
      return `side changes do not follow the ${cls.id} pattern`
    case 'too-often':
      return `${issue.card}: ${issue.count} times, at most ${issue.limit}`
    case 'right-to-finish-early':
      return `#${issue.index + 1}: to the finish on the right only from the last ${issue.within}`
    case 'right-mid-course':
      return `#${issue.index + 1}: no stretch on the right mid-course in ${cls.id}`
    case 'right-mid-too-long':
      return `#${issue.index + 1}: more than ${issue.max} exercises on the right`
  }
  const at = `#${issue.index + 1} ${issue.code}`
  switch (issue.rule) {
    case 'not-exercise':
      return `${at}: not an exercise card`
    case 'not-in-class':
      return `${at}: not in class ${cls.id}`
    case 'equipment':
      return `${at}: needs equipment not at hand`
    case 'twice-in-row':
      return `${at}: same card twice in a row`
    case 'not-follow-up':
      return `${at}: not a follow-up of the leave card`
    case 'follow-up-without-leave':
      return `${at}: follow-up card without a leave card`
    case 'dealt-twice':
      return `${at}: dealt twice`
    case 'not-new':
      return `${at}: not a new card of ${cls.id}`
    case 'after-static':
      return `${at}: must follow a static exercise`
    case 'same-pace':
      return `${at}: pace is already ${issue.pace}`
    case 'pace-incompatible':
      return `${at}: cannot be performed in ${issue.pace} pace`
    case 'side-only':
      return `${at}: only with the dog ${issue.side}`
    case 'max-repeats':
      return `${at}: more than ${issue.max} times`
    case 'last-only':
      return `${at}: allowed only as the last card in ${cls.id}`
    case 'leave-without-follow-up':
      return `${at}: leave card without follow-up`
    case 'missing-supplementary':
      return `${at}: missing its D0 card`
    case 'supplementary-not-allowed':
      return `${at}: ${issue.supplementary} not allowed in ${cls.id}`
    case 'unexpected-supplementary':
      return `${at}: has a D0 card it does not take`
    case 'side-mismatch':
      return `${at}: side should be ${issue.expected}`
    case 'pace-mismatch':
      return `${at}: pace should be ${issue.expected}`
    case 'supplementary-changes-side':
      return `${at}: its D0 card changes the side`
  }
}

/**
 * National courses, the rest of the judges' guidelines: how often a card appears
 * (`course.repeats`, D0 cards included), the required exercises (`course.required`, each
 * filled by a different card — a bipartite matching) and RO-Z's static/dynamic balance.
 */
function nationalCourseIssues(cls: RoClass, entries: DeckEntry[]): DeckIssue[] {
  const { repeats, required, staticShare } = cls.course
  const issues: DeckIssue[] = []
  if (repeats) {
    const counts = new Map<string, number>()
    for (const e of entries) {
      for (const code of e.supplementary ? [e.code, e.supplementary] : [e.code]) {
        counts.set(code, (counts.get(code) ?? 0) + 1)
      }
    }
    // Reported once per card, at the occurrence that goes over the limit.
    const seen = new Map<string, number>()
    entries.forEach((e, index) => {
      for (const card of e.supplementary ? [e.code, e.supplementary] : [e.code]) {
        const n = (seen.get(card) ?? 0) + 1
        seen.set(card, n)
        const limit = repeats[card] ?? 1
        if (n === limit + 1) {
          const count = counts.get(card) ?? n
          issues.push({ index, code: e.code, rule: 'too-often', card, count, limit })
        }
      }
    })
  }
  if (required) {
    const requirements = required.flatMap((r) => Array.from({ length: r.count ?? 1 }, () => r))
    const slots = requirements.map((r) => r.oneOf)
    // Kuhn's augmenting paths: an entry (position) → the required exercise it fills.
    const fills = new Map<number, number>()
    const assign = (slot: number, seen: Set<number>): boolean =>
      entries.some((e, i) => {
        if (seen.has(i) || !slots[slot]?.includes(e.code)) return false
        seen.add(i)
        const other = fills.get(i)
        if (other !== undefined && !assign(other, seen)) return false
        fills.set(i, slot)
        return true
      })
    requirements.forEach(({ oneOf, label }, slot) => {
      if (!assign(slot, new Set())) issues.push({ rule: 'required-missing', oneOf, label })
    })
  }
  if (staticShare) {
    const statics = entries.filter((e) => {
      const card = getCard(cls.ruleset, e.code)
      return card && endsStatic(cls, card, e.supplementary)
    }).length
    const { tolerance } = staticShare
    const n = entries.length
    if (statics < Math.floor(n / 2) - tolerance || statics > Math.ceil(n / 2) + tolerance) {
      issues.push({ rule: 'static-share', statics, count: n })
    }
  }
  return issues
}

/**
 * National courses: the dog on the right only in the stretches the judges' guidelines
 * allow (`course.rightHand`). Reads the side changes off the dealt sequence.
 */
function rightHandIssues(
  cls: RoClass,
  startSide: Side,
  sideChanges: number[],
  entries: DeckEntry[],
): DeckIssue[] {
  const rule = cls.course.rightHand
  if (!rule) return []
  const issues: DeckIssue[] = []
  const at = (index: number) => ({ index, code: entries[index]?.code ?? '' })
  const changes = [...sideChanges]
  let start = false
  let end = false
  let mids = 0
  if (startSide === 'right') {
    const first = changes.shift()
    if (first === undefined || first >= rule.startBy) {
      issues.push({ rule: 'right-start-late', by: rule.startBy })
    }
    start = true
  }
  while (changes.length) {
    const from = changes.shift() as number
    const back = changes.shift()
    if (back === undefined) {
      if (from < entries.length - rule.endWithin) {
        issues.push({ ...at(from), rule: 'right-to-finish-early', within: rule.endWithin })
      }
      end = true
    } else if (rule.midLength === undefined) {
      issues.push({ ...at(from), rule: 'right-mid-course' })
    } else {
      if (back - from - 1 > rule.midLength) {
        issues.push({ ...at(from), rule: 'right-mid-too-long', max: rule.midLength })
      }
      mids++
    }
  }
  const pattern =
    rule.midLength === undefined
      ? start !== end
      : (start !== end && mids === 1) || (start && end && mids === 0)
  if (!pattern) issues.push({ rule: 'right-pattern' })
  return issues
}

/** Rounding slack for distances (m) and angles (°). */
const EPS = 0.01

/**
 * The deck fits its field (plan §5, FCI): start on the edge, each card
 * 3–5 m straight on from the end of the previous exercise (recall cards and recall cones
 * at their stated distance; after a turn about beside the way in), the direction changed
 * only by the cards, everything inside
 * the field, cards (where they stand) and equipment clear of each other, steps back clear
 * of the other exercises, at most two jumps.
 */
function validateLayout(cls: RoClass, deck: Deck): string[] {
  const { layout, entries } = deck
  // Laid out up to one course; a longer deck — or one that fits on no field — goes without.
  if (!layout) return entries.some((e) => e.at) ? ['cards placed without a field layout'] : []
  const max = cls.course.maxCards
  if (entries.length > max) return [`${entries.length} cards laid out on one field, at most ${max}`]
  const [round, ...more] = layout.rounds
  if (!round || more.length || round.first !== 0) return ['not one field from card 1']
  return validateRound(cls, layout, entries, round)
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
    const { min, max, shifts } = approachOf(previous, card)
    // Straight on from the exercise; only a turn about brings the team back beside its way in.
    const walk = walkOf(from, to)
    if (!walk) {
      errors.push(`${at}: changes direction between cards`)
    } else {
      if (walk.ahead < min - EPS || walk.ahead > max + EPS) {
        errors.push(`${at}: ${walk.ahead.toFixed(1)} m from the previous exercise`)
      }
      const [low, high] = [Math.min(...shifts), Math.max(...shifts)]
      const straight = Math.abs(walk.across) < 0.05
      const hairpin = !!previous?.hairpin && walk.across > low - EPS && walk.across < high + EPS
      if (!straight && !hairpin) errors.push(`${at}: not straight on from the previous exercise`)
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
  // Steps back: clear of the other exercises, their cards and equipment.
  shapes.forEach((shape, i) => {
    const at = entries[i]?.at
    const back = shape?.back
    if (!at || !back) return
    if (!inside(back)) errors.push(`${label(i)}: steps back off the field`)
    const others = [
      ...spots.filter((s) => s.label !== label(i)),
      ...props.filter((q) => q.owner !== label(i)),
    ]
    for (const o of others) {
      if (distanceToSegment(o.p, at, back) < PROP_SPACING - EPS) {
        const what = 'label' in o ? o.label : `the ${o.p.kind} of ${o.owner}`
        errors.push(`${label(i)}: steps back too close to ${what}`)
      }
    }
  })
  const jumps = props.filter(({ p }) => p.kind === 'jump').length
  if (jumps > MAX_JUMPS)
    errors.push(`#${first + 1}: ${jumps} jumps in a round, at most ${MAX_JUMPS}`)
  return errors
}
