/**
 * The classes a handler can pick (plan §3). National RO-Z…RO3 are cumulative, RO-V has
 * its own list, FCI-ROB never mixes with the national cards — see the plan's intro.
 * The order here is the order shown in the UI.
 */
export const CLASS_IDS = ['RO-Z', 'RO1', 'RO2', 'RO3', 'RO-V', 'FCI-ROB'] as const

export type ClassId = (typeof CLASS_IDS)[number]
