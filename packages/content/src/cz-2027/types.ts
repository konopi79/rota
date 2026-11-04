import type { Card } from '../schema'

/**
 * What the 2027 regulation changes on a 2026 card (plan R22): each field given replaces the
 * 2026 one whole — a `sequencing` or `geometry` given is the card's complete one. Cite the VDH
 * page next to each change ("VDH 2027, S. 31").
 */
export type CardChange = Partial<
  Pick<Card, 'name' | 'description' | 'exerciseType' | 'placement' | 'sequencing' | 'geometry'>
>

/** One class's share of the 2027 regulation (`ro-z.ts`, `ro1.ts`, …). */
export type ClassContent2027 = {
  /** 2026 cards (by code) that 2027 changes. */
  changes: Record<string, CardChange>
  /**
   * Cards new in 2027, and the cards of codes whose meaning changed (1-116, 3-302) — written
   * whole, with `ruleset: 'CZ-2027'`; they replace the 2026 card of the same code.
   */
  cards: Card[]
  /** The VDH 2027 page of every card of the range — the 2027 card's `sourcePage`. */
  pages: Record<string, number>
}
