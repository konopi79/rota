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

/** FCI: a piece of equipment an exercise sets out, placed relative to its card. */
export const propSchema = z
  .object({
    kind: z.enum(['cone', 'bowl', 'jump']),
    /** Metres ahead of the card, along the direction the team arrives in. */
    ahead: z.number(),
    /** Metres to the side: positive towards the dog's side, negative away from it. */
    side: z.number(),
  })
  .strict()
export type Prop = z.infer<typeof propSchema>

/**
 * FCI: how much room an exercise takes and where it leaves the team, so the dealer can lay
 * a dealt deck out on a real field (§3.3, §3.5). All distances are in metres and, like in
 * the regulation ("Všechny vzdálenosti a úhly jsou přibližné"), approximate. A card
 * without geometry is done on the spot and the team carries on straight.
 */
export const geometrySchema = z
  .object({
    /**
     * Turn performed, in degrees, positive to the right (180 = about turn, 270 right =
     * the new direction is 90° left). Several values: the course builder picks one.
     */
    turn: z.union([z.number(), z.array(z.number()).min(2)]).optional(),
    /** Where the team leaves the exercise: metres ahead of the card (negative = behind). */
    exit: z.number().optional(),
    props: z.array(propSchema).min(1).optional(),
    /**
     * The recall at a cone 5 m ahead of the card is part of the exercise, and the next
     * card stands 5 m past that cone (§3.5, §4.8). For the leave cards (319, 408, 409) only
     * when no recall card follows.
     */
    recallCone: z.boolean().optional(),
    /** Recall cards: placed this far straight ahead of the leave card before them. */
    fromPrevious: z.number().positive().optional(),
  })
  .strict()
export type CardGeometry = z.infer<typeof geometrySchema>

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
    /** FCI only: room the exercise needs on the field (course layout). */
    geometry: geometrySchema.optional(),
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
        /**
         * Competition courses only: the minimum number of cards per point value
         * (FCI §3.5: at least 7 four-point and 5 three-point cards). Keys are points.
         */
        minByPoints: z.record(z.string(), z.number().int().positive()).optional(),
        /**
         * National competition courses: how often a card may appear (Směrnice pro posuzování
         * 2025, §1.2.1) — every card not listed once, D0 cards and follow-ups included.
         */
        repeats: z.record(z.string(), z.number().int().min(2)).optional(),
        /**
         * National competition courses: the exercises a course must contain (Směrnice
         * §1.2.2–1.2.6) — `count` distinct cards from `oneOf` per entry, a card counting
         * for one entry only ("nejméně tři další libovolné cviky").
         */
        required: z
          .array(
            z
              .object({
                oneOf: z.array(z.string()).min(1),
                count: z.number().int().min(2).optional(),
              })
              .strict(),
          )
          .optional(),
        /**
         * National competition courses: static (A) and dynamic (B) exercises "v poměru
         * 50/50" (Směrnice §1.1.1, RO-Z) — the static count at most `tolerance` off half.
         */
        staticShare: z.object({ tolerance: z.number().int().nonnegative() }).strict().optional(),
        /**
         * National competition courses: where the dog may be led on the right (Směrnice
         * pro posuzování 2025, §1.2.3–1.2.5). A course goes right from a start "R" until a
         * side change on card `startBy` at the latest, or from a side change on one of the
         * last `endWithin` cards to the finish. With `midLength` it also has one stretch
         * mid-course — a change, at most `midLength` exercises on the right, a change back
         * — and the patterns are: start or finish plus the mid-course stretch, or start and
         * finish. Without it, exactly one of start or finish (RO1: "pouze JEDNA změna").
         */
        rightHand: z
          .object({
            startBy: z.number().int().positive(),
            endWithin: z.number().int().positive(),
            midLength: z.number().int().nonnegative().optional(),
          })
          .strict()
          .optional(),
        /**
         * The field a dealt deck is laid out on, in metres. Classes without it are dealt
         * without a layout (national: several exercises can share one station).
         */
        field: z
          .object({ width: z.number().positive(), height: z.number().positive() })
          .strict()
          .optional(),
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
