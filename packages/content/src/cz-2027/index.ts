/**
 * The Czech national regulation from April 2027 (plan R21, R22). The Czech club takes over
 * the German VDH Regelwerk Rally Obedience 2027 (`podklady/2027/`); its Czech text is not out
 * yet. Until R22 brings in what 2027 changes, it is the 2026 regulation under its own ids —
 * every card and class of `CZ` with the ruleset `CZ-2027`, the images of `CZ` — so everything
 * that tells national from FCI is shown to treat it as national (decks dealt the same, seed by
 * seed).
 */
import type { ClassId } from '../classes'
import { CZ_CARDS, CZ_CLASSES } from '../cz'
import type { Card, RoClass } from '../schema'

/** Each 2026 class's 2027 counterpart. */
const CLASS_2027: Partial<Record<ClassId, ClassId>> = {
  'RO-Z': 'RO-Z-2027',
  RO1: 'RO1-2027',
  RO2: 'RO2-2027',
  RO3: 'RO3-2027',
  'RO-V': 'RO-V-2027',
}

const in2027 = (id: ClassId): ClassId => {
  const mapped = CLASS_2027[id]
  if (!mapped) throw new Error(`No 2027 class for ${id}`)
  return mapped
}

export const CZ_2027_CARDS: Card[] = CZ_CARDS.map((card) => ({
  ...card,
  ruleset: 'CZ-2027',
  imageSet: 'CZ',
  sequencing: card.sequencing.lastOnly
    ? { ...card.sequencing, lastOnly: card.sequencing.lastOnly.map(in2027) }
    : card.sequencing,
}))

export const CZ_2027_CLASSES: RoClass[] = CZ_CLASSES.map((cls) => ({
  ...cls,
  id: in2027(cls.id),
  ruleset: 'CZ-2027',
}))
