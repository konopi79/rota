import type { Card, RoClass } from '../schema'
import { cardOf, endsStatic } from './rules'
import { planSideChanges, planSides } from './side-plan'
import type { DealOptions, Side } from './types'

/** What the course has dealt so far, to go back to (`save` / `restore`). */
export type CourseState = {
  counts: Map<string, number>
  filled: boolean[]
  statics: number
  dynamics: number
}

/** One required exercise: a card from `codes`, filled by the first card dealt for it. */
type Slot = {
  codes: Set<string>
  /** Positions it takes: 2 when only a leave card and its follow-up can fill it. */
  cost: number
  /** Only side-change cards fill it — the side plan deals those anyway. */
  bySidePlan: boolean
  filled: boolean
}

/**
 * A national competition course as it is dealt, kept to the judges' guidelines (Směrnice
 * pro posuzování 2025): how often each card may appear (`course.repeats`), the exercises
 * the course must contain (`course.required`), RO-Z's static/dynamic balance
 * (`course.staticShare`) and where the dog's side changes (`course.rightHand`). The dealer
 * asks it which cards fit the next position and which D0 card to deal; `validateDeck`
 * re-checks the result on its own.
 */
export class NationalCourse {
  private counts = new Map<string, number>()
  private readonly slots: Slot[]
  private readonly sideChanges: Set<number> | undefined
  private readonly maxStatic: number
  private readonly maxDynamic: number
  private statics = 0
  private dynamics = 0

  static of(
    cls: RoClass,
    options: DealOptions,
    inClass: Set<string>,
    random: () => number,
  ): NationalCourse | undefined {
    const { repeats, required, staticShare, rightHand, sides } = cls.course
    if (!options.competition || !(repeats || required || staticShare || rightHand || sides)) {
      return
    }

    return new NationalCourse(cls, options, inClass, random)
  }

  private constructor(
    private readonly cls: RoClass,
    private readonly options: DealOptions,
    private readonly inClass: Set<string>,
    random: () => number,
  ) {
    const { count, startSide } = options
    const { rightHand, sides, staticShare, required = [] } = cls.course
    // The guidelines' stretches (2026) or the regulation's own (2027, `course.sides`).
    this.sideChanges = rightHand
      ? planSideChanges(rightHand, count, startSide, random)
      : sides && planSides(sides, count, startSide, random)
    const tolerance = staticShare?.tolerance ?? count
    this.maxStatic = Math.ceil(count / 2) + tolerance
    this.maxDynamic = count - (Math.floor(count / 2) - tolerance)
    // The narrowest requirements first, so a card fills the one only few cards can.
    this.slots = required
      .flatMap((r) => Array.from({ length: r.count ?? 1 }, () => r.oneOf))
      .map((oneOf) => {
        const fillers = oneOf.filter((c) => inClass.has(c)).map((c) => cardOf(cls, c))
        return {
          codes: new Set(fillers.map((c) => c.code)),
          cost: Math.min(
            ...fillers.map((c) => (c.sequencing.onlyAfterLeave || c.sequencing.nextOneOf ? 2 : 1)),
          ),
          bySidePlan: fillers.every((c) => c.sequencing.sideChange),
          filled: false,
        }
      })
      .sort((a, b) => a.codes.size - b.codes.size)
  }

  /**
   * How many more times a card may appear: as `course.repeats` lists it, the others once
   * (Směrnice 2025) — or every card `course.maxRepeats` times (2027: "Každá karta smí být
   * použita max 2x", the club's slides), D0 cards included.
   */
  left(code: string): number {
    const { repeats, maxRepeats } = this.cls.course
    return (repeats?.[code] ?? maxRepeats ?? 1) - (this.counts.get(code) ?? 0)
  }

  /**
   * The D0 cards that may go with `card`: not used up, keeping RO-Z's balance — and where the
   * class rules the sides, with the dog on the right only those that leave it there (D0e,
   * 2027): D0a–d bring it to the left leg, a change no stretch on the right allows.
   */
  supplementaries(card: Card, side: Side = 'left'): string[] {
    return this.cls.course.supplementary.filter(
      (d) =>
        this.left(d) > 0 &&
        this.balanced(endsStatic(this.cls, card, d)) &&
        (side === 'left' || !this.sideChanges || !cardOf(this.cls, d).sequencing.endSide),
    )
  }

  /** Whether `card` may be dealt at position `at` with the dog on `side`. */
  fits(card: Card, at: number, side: Side): boolean {
    const seq = card.sequencing
    if (this.left(card.code) <= 0) return false
    if (seq.requiresSupplementary) {
      if (this.supplementaries(card, side).length === 0) return false
    } else if (!this.balanced(endsStatic(this.cls, card))) {
      return false
    }
    // A leave card needs a follow-up that is not used up yet.
    if (seq.nextOneOf && !seq.nextOneOf.some((c) => this.inClass.has(c) && this.left(c) > 0)) {
      return false
    }
    if (!this.sideChanges) return true
    if (!!seq.sideChange !== this.sideChanges.has(at)) return false
    // A leave card's follow-up is no side change, so none right before a planned one.
    if (seq.nextOneOf && this.sideChanges.has(at + 1)) return false
    // On the right a D0 card must leave the dog there (`supplementaries`); nor may a leave
    // card start there (its follow-up stays right).
    if (side === 'right' && !seq.sideChange) return !seq.nextOneOf
    return true
  }

  /** Whether `card` fills a required exercise still missing, or leads to one (a leave card). */
  helps(card: Card): boolean {
    const open = this.slots.filter((s) => !s.filled)
    if (open.some((s) => s.codes.has(card.code))) return true
    const followUps = card.sequencing.nextOneOf ?? []
    return open.some((s) => followUps.some((c) => s.codes.has(c)))
  }

  /**
   * Whether position `at` must go to a required exercise: the cards left, minus the side
   * changes still planned, only just cover what is missing.
   */
  mustHelp(at: number): boolean {
    if (this.sideChanges?.has(at)) return false
    const planned = [...(this.sideChanges ?? [])].filter((p) => p >= at).length
    const needed = this.slots
      .filter((s) => !s.filled && !s.bySidePlan)
      .reduce((sum, s) => sum + s.cost, 0)
    return needed > 0 && needed >= this.options.count - at - planned
  }

  /** Every required exercise is on the course. */
  get complete(): boolean {
    return this.slots.every((s) => s.filled)
  }

  record(card: Card, supplementary: string | undefined, static_: boolean): void {
    for (const code of supplementary ? [card.code, supplementary] : [card.code]) {
      this.counts.set(code, (this.counts.get(code) ?? 0) + 1)
    }
    if (static_) this.statics++
    else this.dynamics++
    const slot = this.slots.find((s) => !s.filled && s.codes.has(card.code))
    if (slot) slot.filled = true
  }

  save(): CourseState {
    const { counts, slots, statics, dynamics } = this
    return { counts: new Map(counts), filled: slots.map((s) => s.filled), statics, dynamics }
  }

  restore(state: CourseState): void {
    this.counts = new Map(state.counts)
    this.slots.forEach((s, i) => (s.filled = state.filled[i] ?? false))
    this.statics = state.statics
    this.dynamics = state.dynamics
  }

  private balanced(static_: boolean): boolean {
    return static_ ? this.statics < this.maxStatic : this.dynamics < this.maxDynamic
  }
}
