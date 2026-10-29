import type { Exercise } from './exercise'

/**
 * The jumps the team goes past together (plan R17), from the regulation (Zkušební řád RO v ČR
 * 2026, appendix 1): the dog is sent over the bar while the handler walks on beside it, and
 * comes back into heel. The jump stands where the course plan has it (`geometry.props`): 5 m
 * past where the exercise starts, on the dog's side.
 */

/** The team walking on while the dog goes over: as far as the team walks meanwhile, metres. */
const OVER_AND_BACK = 8.5

/**
 * 2-217 Skok přes překážku – psovod těsně vedle překážky (p. 44): "Cvik začíná v místě pro
 * provedení cviku, kdy tým chůzí u nohy pokračuje směrem k překážce. … Psovod vysílá psa na
 * překážku a dává povel k jejímu překonání, zatímco on překážku míjí. Jakmile pes překoná
 * překážku, psovod velí psa k noze a pokračují společně k dalšímu cviku." The jump 1 m to the
 * left of the handler's way, so they pass it close.
 */
export const R2_217: Exercise = {
  code: '2-217',
  jumps: [{ x: 1, z: 5 }],
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: 5, dogJumps: OVER_AND_BACK, caption: 'sendOverJump' },
    { walk: 4, caption: 'heelAfterJump' },
  ],
}

/**
 * 3-313 Pes přes překážku – psovod ve vzdálenosti (p. 56): "… zatímco sám překážku míjí za
 * vyznačenou linií ve vzdálenosti cca 1,8 m. Jakmile pes překoná překážku, psovod velí psa k
 * té noze, od které byl původně vyslán …" The jump 2.4 m to the left; the line, along the
 * team's way, 1.8 m from it — the handler keeps beyond it.
 */
export const R3_313: Exercise = {
  code: '3-313',
  jumps: [{ x: 2.4, z: 5 }],
  marks: [{ x: 0.6, z: 5, lengthwise: true }],
  steps: [
    { walk: 3.5, caption: 'approach' },
    { walk: 5, dogJumps: OVER_AND_BACK + 1, caption: 'sendOverJumpAway' },
    { walk: 5, caption: 'heelAfterJump' },
  ],
}

export const JUMP_EXERCISES: Exercise[] = [R2_217, R3_313]
