import type { RulesetId } from './schema'

/** A regulation ROTA deals cards for (plan R21). */
export type Ruleset = {
  id: RulesetId
  /** In addresses: `/karta/<slug>/<card>`, `/cards/<slug>/…`. */
  slug: string
  name: string
  /** ISO date the regulation is valid from. */
  validFrom: string
  source: string
  /** A national regulation (CZ, later VDH) rather than FCI's — D0 cards, the guidelines, … */
  national: boolean
  /** The language of its card texts. */
  language: 'cs' | 'de'
}

export const CZ_RULESET = {
  id: 'CZ',
  slug: 'cz',
  name: 'Zkušební řád Rally Obedience v ČR',
  validFrom: '2026-04-01', // "nabývá účinnosti dne 01.04.2026"
  source: 'Zkušební řád Rally Obedience v ČR, 2026 — příloha 1: Popis cviků',
  national: true,
  language: 'cs',
} as const satisfies Ruleset

export const CZ_2027_RULESET = {
  id: 'CZ-2027',
  slug: 'cz-2027',
  name: 'Zkušební řád Rally Obedience v ČR 2027 (připravovaný)',
  // The Czech club: "Spuštění řádu předpokládáme na měsíc duben 2027" (FB, 2026-11-02).
  validFrom: '2027-04-01',
  source:
    'VDH Regelwerk Rally Obedience, gültig ab 01.01.2027 — Anhang 2: Beschreibung der Übungen',
  national: true,
  language: 'cs',
} as const satisfies Ruleset

export const FCI_RULESET = {
  id: 'FCI',
  slug: 'fci',
  name: 'FCI Rally Obedience',
  validFrom: '2025-02-01', // "Účinnost od 01. 02. 2025"
  source: 'Zkušební řád & Směrnice pro Mezinárodní soutěže FCI Rally Obedience (CZ překlad)',
  national: false,
  language: 'cs',
} as const satisfies Ruleset

export const RULESETS: Record<RulesetId, Ruleset> = {
  CZ: CZ_RULESET,
  'CZ-2027': CZ_2027_RULESET,
  FCI: FCI_RULESET,
}

/** A national regulation's card or class — not FCI's. */
export const isNational = (ruleset: RulesetId) => RULESETS[ruleset].national
