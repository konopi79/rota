import { z } from 'zod/v4'

import { CLASS_IDS } from './classes'

export const RULESET_IDS = ['CZ', 'FCI'] as const
export const rulesetIdSchema = z.enum(RULESET_IDS)
export type RulesetId = z.infer<typeof rulesetIdSchema>

export const classIdSchema = z.enum(CLASS_IDS)

export const EQUIPMENT = ['cones', 'bowls', 'jump'] as const
export const equipmentSchema = z.enum(EQUIPMENT)
export type Equipment = z.infer<typeof equipmentSchema>

/**
 * What the dealer needs to know to keep a sequence performable (plan §5). Every field
 * is optional; an empty object means "no constraint beyond the general ones". Each rule
 * set on a card carries a comment citing the regulation it comes from.
 */
export const sequencingSchema = z
  .object({
    /** Always dealt together with one supplementary card (D0a–d), which decides A/B. */
    requiresSupplementary: z.boolean().optional(),
    /** Pace-change card. */
    pace: z.enum(['slow', 'fast', 'normal']).optional(),
    /**
     * The dog is left behind and the handler walks on: the next card must be one of these
     * (a recall or a return to the dog). Codes of cards outside the dealt class are ignored.
     */
    nextOneOf: z.array(z.string()).min(1).optional(),
    /**
     * FCI: the dog is left behind and **may** be recalled by one of these cards; without
     * one, the recall at a cone is part of the exercise itself (319, 408, 409).
     */
    mayBeFollowedBy: z.array(z.string()).min(1).optional(),
    /**
     * A recall / return card: only valid right after a card whose `nextOneOf` or
     * `mayBeFollowedBy` lists it.
     */
    onlyAfterLeave: z.boolean().optional(),
    /** The previous card must end static (type A, or a supplementary card D0a/D0b). */
    afterStatic: z.boolean().optional(),
    /**
     * The dog changes the heeling side (national: "Pes změní stranu vedení"; FCI side-change
     * cards). The dealer tracks the current side and shows it.
     */
    sideChange: z.boolean().optional(),
    /** FCI: the card ends with the dog on this side ("Návrat k vedení po levé straně"). */
    endSide: z.enum(['left', 'right']).optional(),
    /** FCI: the card may only start with the dog on this side (417 left, 418 right). */
    sideOnly: z.enum(['left', 'right']).optional(),
    /** FCI: may be performed in slow/fast pace (the flowing exercises 105–113). */
    paceCompatible: z.boolean().optional(),
    /** Classes in which the card may only be the last one before the finish. */
    lastOnly: z.array(classIdSchema).min(1).optional(),
    equipment: z.array(equipmentSchema).min(1).optional(),
  })
  .strict()
export type CardSequencing = z.infer<typeof sequencingSchema>

export const subPartSchema = z
  .object({
    text: z.string().min(1),
    /** Marked as a main exercise ("Hlavní cvik") in the regulation. */
    main: z.boolean(),
  })
  .strict()

export const cardSchema = z
  .object({
    /** As printed on the card: `Z-001`, `1-101`, `D0a`, FCI `101`; `START` / `FINISH`. */
    code: z.string().min(1),
    ruleset: rulesetIdSchema,
    kind: z.enum(['exercise', 'start', 'finish', 'supplementary']),
    /**
     * National only: A = ends static, B = ends in motion, AB = decided by the supplementary
     * card.
     */
    exerciseType: z.enum(['A', 'B', 'AB']).optional(),
    /**
     * FCI only: where the exercise is done (§4.3) — A left of the card, B in front of it,
     * C at the recall cone, D jumps. Not a static/dynamic type, despite the same letters.
     */
    placement: z.enum(['A', 'B', 'C', 'D']).optional(),
    /** FCI only. */
    points: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    /** Czech name. */
    name: z.string().min(1),
    /** FCI only — the English name printed on the card. */
    nameEn: z.string().min(1).optional(),
    /** Czech description, one string per paragraph. */
    description: z.array(z.string().min(1)).min(1),
    subParts: z.array(subPartSchema).min(1).optional(),
    sequencing: sequencingSchema,
    /** Image file stem under `/cards/<ruleset>/`, e.g. `z-001`. */
    image: z.string().min(1),
    /** Execution diagram image stem, if the regulation has one. */
    diagram: z.string().min(1).optional(),
    /** Page of the regulation the description comes from (for proofreading). */
    sourcePage: z.number().int().positive(),
  })
  .strict()
export type Card = z.infer<typeof cardSchema>

export const roClassSchema = z
  .object({
    id: classIdSchema,
    ruleset: rulesetIdSchema,
    name: z.string().min(1),
    course: z
      .object({
        /** Number of exercise cards on a competition course (start/finish/D0 not counted). */
        minCards: z.number().int().positive(),
        maxCards: z.number().int().positive(),
        leash: z.enum(['allowed', 'off-leash']),
        /** Supplementary cards allowed in the class (RO-V: only D0a and D0c). */
        supplementary: z.array(z.string()),
        /** In slow/fast pace only `paceCompatible` cards and pace cards may follow (FCI). */
        paceCompatibleOnly: z.boolean().optional(),
        /** How often one card may appear in a course (FCI: "maximálně dvakrát"). */
        maxRepeats: z.number().int().positive().optional(),
      })
      .strict(),
    /** Every exercise card of the class, lower classes included where cumulative. */
    cardCodes: z.array(z.string()).min(1),
    /** The cards this class adds on top of the lower classes (empty where not applicable). */
    newCardCodes: z.array(z.string()),
    sourcePage: z.number().int().positive(),
  })
  .strict()
export type RoClass = z.infer<typeof roClassSchema>
