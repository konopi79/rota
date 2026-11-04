/**
 * The classes a handler can pick (plan §3). National RO-Z…RO3 are cumulative, RO-V has
 * its own list, FCI-ROB never mixes with the national cards — see the plan's intro.
 * The order here is the order shown in the UI.
 */
export const CLASS_IDS = [
  'RO-Z',
  'RO1',
  'RO2',
  'RO3',
  'RO-V',
  // The national classes under the 2027 regulation (plan R21, `CZ-2027`).
  'RO-Z-2027',
  'RO1-2027',
  'RO2-2027',
  'RO3-2027',
  'RO-V-2027',
  'FCI-ROB',
] as const

export type ClassId = (typeof CLASS_IDS)[number]
