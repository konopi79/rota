import { getCard, getClass } from '../registry'
import type { Card, RoClass } from '../schema'
import {
  afterDynamicStation,
  alongOwnCard,
  angleDiff,
  approachOf,
  CARD_SPACING,
  CNDC_STEP,
  clearOfStation,
  distance,
  distanceToSegment,
  distanceToWay,
  dogWayOf,
  EDGE,
  MAX_JUMPS,
  PROP_SPACING,
  propPoints,
  shapeOf,
  D0_BESIDE,
  signOf,
  standsOf,
  STAND_SPACING,
  turnsOf,
  WALK_SPACING,
  walkOf,
  wayTo,
  withSupplementary,
  type Shape,
} from './geometry'
import {
  cndcAllowed,
  mostStations,
  stationProblems,
  stationsOf,
  type CndcLevel,
  type CndcReason,
} from './cndc'
import { endsStatic, fieldOf, followUpsOf, hasEquipment, paceAfter, sideAfter } from './rules'
import { sidesBroken, type SidesBroken } from './side-plan'
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
  /** At the station of the card before (CNDC), against a rule of `stationProblems`. */
  | { rule: 'cndc'; reason: CndcReason; level: CndcLevel; max?: number }

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
  /** `count` stations of several cards (CNDC), `max` allowed — by the guidelines or strict. */
  | { rule: 'cndc-stations'; count: number; max: number; level: CndcLevel }
  /** The side changes do not form one of the class's patterns. */
  | { rule: 'right-pattern' }
  /**
   * 2027 (`course.sides`): the side changes break the regulation's rule — a stretch longer than
   * `limit` exercises, more than `limit` changes to the right, fewer than `limit` changes or
   * exercises on the right, more than `limit` on the right, the change not by the first / last
   * card (Senioren), or a change straight back to the right.
   */
  | { rule: 'sides'; broken: SidesBroken; limit?: number }

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
  errors.push(...cndcIssues(cls, deck))
  if (cls.course.fields) errors.push(...validateLayout(cls, deck))
  else if (deck.layout || deck.entries.some((e) => e.at)) errors.push(`${cls.id} is not laid out`)
  return errors
}

/**
 * The check of a course put together by hand (plan §12): the sequencing rules of the
 * regulations, shown to the user as warnings. "Dealt twice" is left out — no regulation
 * forbids a card twice on a national course (§5.4 only sets the size and the card range),
 * the dealer just draws without replacement; FCI has its own limit (`max-repeats`). Nor is
 * the same card twice in a row: neither regulation forbids it (the national guidelines
 * only limit how often, §1.2.1), FCI judges set it (308 308, 312 312, 406 406 on the Czech
 * championship 2024 — the FCI Rally Obedience HUB's course catalogue, 2026-10-22), and two
 * pace cards in a row are `same-pace` anyway (author: "nemusíme být přísnější"). The
 * field layout is not checked: a hand-made course is not laid out.
 *
 * `guidelines` (national classes) adds the judges' guidelines: card repeats, required
 * exercises, RO-Z's balance, right-hand stretches. Course size and the FCI point mix stay
 * out — a course for training can be any length.
 */
export function customDeckIssues(
  deck: Deck,
  { guidelines = false, strict = false } = {},
): DeckIssue[] {
  const cls = getClass(deck.options.classId)
  if (!cls) throw new Error(`No content for class ${deck.options.classId}`)
  const withGuidelines = guidelines || strict
  const checked = withGuidelines
    ? { ...deck, options: { ...deck.options, competition: true } }
    : deck
  const levels: CndcLevel[] = [
    'rules',
    ...(withGuidelines ? (['guidelines'] as const) : []),
    ...(strict ? (['strict'] as const) : []),
  ]
  return [
    ...deckIssues(cls, checked).filter(
      (issue) =>
        issue.rule !== 'dealt-twice' &&
        issue.rule !== 'course-size' &&
        issue.rule !== 'points-mix' &&
        issue.rule !== 'twice-in-row',
    ),
    ...customStationIssues(cls, deck, levels),
  ]
}

/**
 * Several cards at one station in a hand-made course (CNDC, plan R18), checked up to the
 * levels asked for: the regulation's rules always, the guidelines', and the safe side the
 * dealer keeps to (`stationProblems`) — each at the card it concerns; and how many such
 * stations there are.
 */
function customStationIssues(cls: RoClass, deck: Deck, levels: CndcLevel[]): DeckIssue[] {
  const groups = stationsOf(deck.entries).filter(([from, to]) => to > from)
  const issues: DeckIssue[] = groups.flatMap(([from, to]) =>
    stationProblems(cls, deck.entries.slice(from, to + 1))
      .filter((p) => levels.includes(p.level))
      .map((p): DeckIssue => ({
        index: from + p.at,
        code: deck.entries[from + p.at]?.code ?? '',
        rule: 'cndc',
        reason: p.reason,
        level: p.level,
        ...(p.max !== undefined && { max: p.max }),
      })),
  )
  // The guidelines' limit first; the safe side's where it is lower.
  const most = mostStations(cls)
  const limits = [
    ...(levels.includes('guidelines') && most.guidelines !== undefined
      ? [{ max: most.guidelines, level: 'guidelines' as const }]
      : []),
    ...(levels.includes('strict') && most.strict !== undefined
      ? [{ max: most.strict, level: 'strict' as const }]
      : []),
  ]
  const broken = limits.find(({ max }) => groups.length > max)
  if (broken) issues.push({ rule: 'cndc-stations', count: groups.length, ...broken })
  return issues
}

/**
 * Several cards at one station (CNDC, plan R18): only in a deck dealt with them, each group
 * one the class allows (`cndcAllowed`), as many groups as it allows.
 */
function cndcIssues(cls: RoClass, deck: Deck): string[] {
  const groups = stationsOf(deck.entries).filter(([from, to]) => to > from)
  if (!groups.length) return []
  if (!deck.options.cndc) return ['cards grouped at one station in a deck dealt without CNDC']
  const errors = groups.flatMap(([from, to]) =>
    cndcAllowed(cls, deck.entries.slice(from, to + 1))
      ? []
      : [`#${from + 1}–${to + 1}: not a CNDC the class allows`],
  )
  const most = cls.course.cndc?.groups[1] ?? 0
  if (groups.length > most) errors.push(`${groups.length} CNDC, at most ${most}`)
  return errors
}

function deckIssues(cls: RoClass, deck: Deck): DeckIssue[] {
  const { options, entries } = deck
  const issues: DeckIssue[] = []
  const inClass = new Set(cls.cardCodes)
  const newOnly = options.scope === 'new' && cls.newCardCodes.length > 0
  const seenMain = new Set<string>()
  // A competition course may repeat cards: national ones as `course.repeats` allows
  // (counted after the loop), FCI ones up to `course.maxRepeats` (counted in the loop).
  const repeats =
    options.competition && (cls.course.repeats !== undefined || cls.course.maxRepeats !== undefined)
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
    const sideRule = cls.course.rightHand ?? cls.course.sides
    if (options.competition && sideRule && sideNext !== side && !seq.sideChange) {
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
      ...sidesIssues(cls, options.startSide, sideChanges, entries.length),
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
    case 'cndc-stations':
      return `${issue.count} CNDC, at most ${issue.max}`
    case 'right-pattern':
      return `side changes do not follow the ${cls.id} pattern`
    case 'sides':
      return `side changes break the ${cls.id} rule: ${issue.broken}${issue.limit === undefined ? '' : ` (${issue.limit})`}`
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
    case 'cndc':
      return `${at}: at one station — ${issue.reason}`
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

/**
 * National courses under the 2027 regulation: the stretches on the right `course.sides` allows
 * (VDH §5.2–5.5), read off the dealt sequence.
 */
function sidesIssues(
  cls: RoClass,
  startSide: Side,
  sideChanges: number[],
  count: number,
): DeckIssue[] {
  const rule = cls.course.sides
  if (!rule) return []
  const limits: Partial<Record<SidesBroken, number>> = {
    stretch: rule.stretch,
    'left-to-right': rule.leftToRight && rule.leftToRight - (startSide === 'right' ? 1 : 0),
    'min-changes': rule.minChanges,
    'min-right': rule.minRight,
    'max-right': rule.maxRightShare && Math.floor(count * rule.maxRightShare),
  }
  return sidesBroken(rule, sideChanges, count, startSide).map((broken) => ({
    rule: 'sides',
    broken,
    ...(limits[broken] !== undefined && { limit: limits[broken] }),
  }))
}

/** Rounding slack for distances (m) and angles (°). */
const EPS = 0.01

/**
 * The deck fits its field (plan §5, FCI and national): start on the edge, each card 3–5 m
 * straight on from the end of the previous exercise (recall cards and recall cones at their
 * stated distance, more room where an exercise needs it; after a turn about beside the way
 * in), the direction changed only by the cards, everything inside the field, cards (where
 * they stand) and equipment clear of each other, steps back clear of the other exercises,
 * the jumps a class allows; national: the ways walked clear of the other exercises.
 */
function validateLayout(cls: RoClass, deck: Deck): string[] {
  const { layout, entries } = deck
  // Laid out up to one course; a longer deck — or one that fits on no field — goes without.
  if (!layout) return entries.some((e) => e.at) ? ['cards placed without a field layout'] : []
  const max = cls.course.maxCards
  if (entries.length > max) return [`${entries.length} cards laid out on one field, at most ${max}`]
  const field = fieldOf(cls, deck.options)
  if (layout.width !== field?.width || layout.height !== field.height) {
    return [
      `laid out on ${layout.width} × ${layout.height} m, not on ${field?.width} × ${field?.height} m`,
    ]
  }
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

  // Each card as laid out, with the turn of a D0 card that turns the team (D0e, 2027).
  const cards = entries.map((e) =>
    withSupplementary(
      getCard(cls.ruleset, e.code) as Card,
      e.supplementary ? getCard(cls.ruleset, e.supplementary) : undefined,
    ),
  )
  // Each exercise with its equipment; a leave card has no recall cone when a recall card
  // follows on the same field.
  const shapes: (Shape | undefined)[] = entries.map(
    (entry, i) =>
      entry.at &&
      shapeOf(cards[i] as Card, entry.at, entry.side, !!cards[i + 1]?.sequencing.onlyAfterLeave),
  )
  // Several cards at one station (CNDC, plan R18): which station each card is done at, where
  // its card stands on the station's stand, and whether the station needs more room after it
  // (a CNDC with a dynamic exercise). Things of one station are not checked against each
  // other; the start and the finish are stations of their own.
  const stations = stationsOf(entries)
  const stationOf: number[] = []
  stations.forEach(([from, to], s) => {
    for (let i = from; i <= to; i++) stationOf[i] = s
  })
  const START = -1
  const FINISH = -2
  const stands: ({ sign: Point; d0?: Point } | undefined)[] = []
  const roomier = new Set<number>()
  stations.forEach(([from, to], s) => {
    const members = entries.slice(from, to + 1).map((e, k) => {
      const card = cards[from + k] as Card
      return e.at && { card, at: e.at }
    })
    const placed = members.flatMap((m) => (m ? [m] : []))
    if (placed.length === members.length) stands.push(...standsOf(placed))
    else stands.push(...members.map(() => undefined))
    const dynamic = entries
      .slice(from, to + 1)
      .some((e, k) => !endsStatic(cls, cards[from + k] as Card, e.supplementary))
    if (to > from && dynamic) roomier.add(s)
  })

  /** The step from the end of the previous station to a card (or the finish). */
  const checkStep = (at: string, i: number, card: Card | undefined, to: Pose) => {
    const previous = shapes[i - 1]
    if (card?.sequencing.onlyAfterLeave && !previous) {
      errors.push(`${at}: recall card without its leave card on the field`)
    }
    const from = previous?.exit ?? start
    const plain = approachOf(previous, card)
    const after = i > 0 && roomier.has(stationOf[i - 1] as number)
    const { min, max, shifts, hairpin } = after ? afterDynamicStation(plain) : plain
    // Straight on from the exercise; only a turn about brings the team back beside its way
    // in, and a recall card may stand to the side of its leave card.
    const walk = walkOf(from, to)
    if (!walk) {
      errors.push(`${at}: changes direction between cards`)
    } else {
      if (walk.ahead < min - EPS || walk.ahead > max + EPS) {
        errors.push(`${at}: ${walk.ahead.toFixed(1)} m from the previous exercise`)
      }
      const [low, high] = [Math.min(...shifts), Math.max(...shifts)]
      const straight = shifts.some((s) => Math.abs(walk.across - s) < 0.05)
      const beside = !!hairpin && walk.across > low - EPS && walk.across < high + EPS
      if (!straight && !beside) errors.push(`${at}: not straight on from the previous exercise`)
    }
    if (!inside(to)) errors.push(`${at}: outside the field`)
  }

  /**
   * A card done at the station of the one before: where that exercise ends, a step on after a
   * dynamic one ("krok dopředu pro ukončení cviku", řád p. 16).
   */
  const checkJoined = (i: number, to: Pose) => {
    const previous = shapes[i - 1]
    const before = entries[i - 1]
    if (!previous || !before) {
      errors.push(`${label(i)}: at one station without a card before it`)
      return
    }
    const static_ = endsStatic(cls, cards[i - 1] as Card, before.supplementary)
    const walk = walkOf(previous.exit, to)
    const step = static_ ? 0 : CNDC_STEP
    if (!walk || Math.abs(walk.ahead - step) > EPS || Math.abs(walk.across) > EPS) {
      errors.push(`${label(i)}: not where the exercise before it ends`)
    }
    const station = stations[stationOf[i] as number] as [number, number]
    const own = stands
      .slice(station[0], station[1] + 1)
      .flatMap((s) => (s ? (s.d0 ? [s.sign, s.d0] : [s.sign]) : []))
    if (!clearOfStation(cards[i] as Card, to, own, entries[i]?.side ?? 'left')) {
      errors.push(`${label(i)}: done too close to its station's cards`)
    }
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
    if (entry.withPrevious) checkJoined(i, entry.at)
    else checkStep(label(i), i, card, entry.at)
    if (!inside(shape.exit)) errors.push(`${label(i)}: leaves the field`)
    for (const p of shape.props) {
      if (!inside(p)) errors.push(`${label(i)}: ${p.kind} outside the field`)
    }
  })
  checkStep(`finish after #${first + entries.length}`, entries.length, undefined, finish)

  // Clearances: cards (where they stand) from cards; equipment from the other exercises —
  // where they are done, their cards and their equipment. A card may stand over the edge
  // of the field (`EDGE`), the course may not.
  type Spot = { label: string; station: number; p: Point }
  const signs: Spot[] = [
    { label: 'start', station: START, p: signOf(undefined, start) },
    ...entries.flatMap((_, i) => {
      const stand = stands[i]
      return stand ? [{ label: label(i), station: stationOf[i] as number, p: stand.sign }] : []
    }),
    { label: 'finish', station: FINISH, p: signOf(undefined, finish) },
  ]
  // The D0 cards beside their cards (national): as much nearer the others as they stand aside.
  const d0s: Spot[] = entries.flatMap((_, i) => {
    const d0 = stands[i]?.d0
    return d0 ? [{ label: label(i), station: stationOf[i] as number, p: d0 }] : []
  })
  for (const a of d0s) {
    for (const b of [...signs, ...d0s]) {
      if (b.station !== a.station && distance(a.p, b.p) < CARD_SPACING - D0_BESIDE - EPS) {
        errors.push(`${a.label}: its D0 card too close to ${b.label}`)
      }
    }
  }
  signs.forEach((a, i) => {
    for (const b of signs.slice(i + 1)) {
      if (b.station !== a.station && distance(a.p, b.p) < CARD_SPACING - EPS) {
        errors.push(`${a.label} and ${b.label}: too close`)
      }
    }
  })
  const spots: Spot[] = [
    ...signs,
    ...d0s,
    { label: 'start', station: START, p: start },
    ...entries.flatMap((e, i) =>
      e.at ? [{ label: label(i), station: stationOf[i] as number, p: e.at }] : [],
    ),
    { label: 'finish', station: FINISH, p: finish },
  ]
  const props = shapes.flatMap((shape, i) =>
    (shape?.props ?? []).map((p) => ({ owner: label(i), station: stationOf[i] as number, p })),
  )
  props.forEach((a, i) => {
    const room = a.p.clear ?? PROP_SPACING
    for (const s of spots) {
      if (s.station !== a.station && distance(s.p, a.p) < room - EPS) {
        errors.push(`${a.owner}: ${a.p.kind} too close to ${s.label}`)
      }
    }
    for (const b of props.slice(i + 1)) {
      const both = Math.max(room, b.p.clear ?? PROP_SPACING)
      if (b.station !== a.station && distance(a.p, b.p) < both - EPS) {
        errors.push(`${a.owner}: ${a.p.kind} too close to the ${b.p.kind} of ${b.owner}`)
      }
    }
  })
  // Steps back: clear of the other exercises, their cards and equipment — but going back
  // to the dog (2-213, 3-320, 3-322) leads to the leave card before.
  shapes.forEach((shape, i) => {
    const at = entries[i]?.at
    const back = shape?.back
    if (!at || !back) return
    if (!inside(back)) errors.push(`${label(i)}: steps back off the field`)
    const own = [stationOf[i], ...(cards[i]?.sequencing.onlyAfterLeave ? [stationOf[i - 1]] : [])]
    const others = [
      ...spots.filter((s) => !own.includes(s.station)),
      ...props.filter((q) => !own.includes(q.station)),
    ]
    for (const o of others) {
      if (distanceToSegment(o.p, at, back) < PROP_SPACING - EPS) {
        const what = 'label' in o ? o.label : `the ${o.p.kind} of ${o.owner}`
        errors.push(`${label(i)}: steps back too close to ${what}`)
      }
    }
  })
  // The way between two stations passes clear of the other exercises, their cards and
  // equipment (Směrnice §1.1.3: "Dráha v uličce s kartami musí být široká nejméně 1,5 m"; FCI
  // courses as walked through in animation, R19) — the cards' stands a little further
  // (`STAND_SPACING`).
  // (A jump: its middle and both uprights.)
  const equipment = props.flatMap((q) =>
    propPoints(q.p).map((p) => ({ label: q.owner, station: q.station, kind: q.p.kind, p })),
  )
  const standsAt = new Set([...signs, ...d0s, ...equipment].map((s) => s.p))
  const aside = (p: Point) => (standsAt.has(p) ? STAND_SPACING : WALK_SPACING)
  // A station's own cards the way from card `i` on keeps clear of (CNDC: those not where its own
  // card would stand, `alongOwnCard` — a group turned about twice walks back past its stand).
  const inTheWay = (i: number) => {
    const at = entries[i]?.at
    const station = stationOf[i]
    const [from, to] = station === undefined ? [i, i] : (stations[station] as [number, number])
    if (!at || to === from) return () => false
    const along = alongOwnCard(cards[i] as Card, at)
    return (o: { station: number; p: Point }) =>
      o.station === station && standsAt.has(o.p) && !along(o.p)
  }
  {
    const targets = [
      ...entries.map((e, i) => ({ label: label(i), i, to: e.withPrevious ? undefined : e.at })),
      { label: 'finish', i: entries.length, to: finish },
    ]
    for (const { label: to, i, to: at } of targets) {
      if (!at) continue
      const before = shapes[i - 1]
      const from = i ? (stationOf[i - 1] as number) : START
      const here = i < entries.length ? (stationOf[i] as number) : FINISH
      const aisle = wayTo(before, before?.exit ?? start, at, to === 'finish')
      const near = (p: Point) => distanceToWay(p, aisle) < aside(p) - EPS
      const past = inTheWay(i - 1)
      for (const o of [...spots, ...equipment]) {
        if (((o.station !== here && o.station !== from) || past(o)) && near(o.p)) {
          errors.push(`${to}: the way to it passes too close to ${o.label}`)
        }
      }
    }
  }

  // The dog called by a follow-up runs straight from where it was left (over the leave card's
  // jump, or the follow-up's — FCI 421), clear like a way walked.
  {
    entries.forEach((entry, i) => {
      const leave = entries[i - 1]?.at
      const leaveShape = shapes[i - 1]
      if (!cards[i]?.sequencing.onlyAfterLeave || !entry.at || !leave || !leaveShape) return
      const way = dogWayOf(leave, leaveShape, entry.at, shapes[i])
      const own = [stationOf[i], stationOf[i - 1]]
      for (const o of [...spots, ...equipment]) {
        if (!own.includes(o.station) && distanceToWay(o.p, way) < aside(o.p) - EPS) {
          errors.push(`${label(i)}: the dog's way to it passes too close to ${o.label}`)
        }
      }
    })
  }

  // The way walked inside a national exercise, like the way between two cards.
  shapes.forEach((shape, i) => {
    const walk = shape?.walk
    if (!walk) return
    const others = [
      ...spots.filter((s) => s.station !== stationOf[i] || inTheWay(i)(s)),
      ...equipment.filter((q) => q.station !== stationOf[i]),
    ]
    for (const o of others) {
      if (distanceToWay(o.p, walk) < aside(o.p) - EPS) {
        const what = 'kind' in o ? `the ${o.kind} of ${o.label}` : o.label
        errors.push(`${label(i)}: walks too close to ${what}`)
      }
    }
  })
  const jumps = props.filter(({ p }) => p.kind === 'jump').length
  const maxJumps = cls.course.maxJumps ?? MAX_JUMPS
  if (jumps > maxJumps) errors.push(`#${first + 1}: ${jumps} jumps in a round, at most ${maxJumps}`)
  return errors
}
