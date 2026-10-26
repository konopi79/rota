import type { Exercise } from './exercise'
import { HIGHER_EXERCISES } from './ro123-exercises'
import { ROZ_EXERCISES } from './roz-exercises'

/** Every exercise the animations can play, in card order. */
export const EXERCISES: Exercise[] = [...ROZ_EXERCISES, ...HIGHER_EXERCISES]
