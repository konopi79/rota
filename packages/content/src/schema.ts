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

/** A piece of equipment an exercise sets out, placed relative to where it is done. */
export const propSchema = z
  .object({
    kind: z.enum(['cone', 'bowl', 'jump']),
    /** Metres ahead of the card, along the direction the team arrives in. */
    ahead: z.number(),
    /**
     * Metres to the side: positive towards the dog's side, negative away from it. National
     * cards are drawn for the dog on the left and keep their layout with the dog on the
     * right (their turns and paths are the card's): positive is always to the left.
     */
    side: z.number(),
    /**
     * Nothing else stands within this many metres of it (Směrnice §1.1.2, 3-324: "v okruhu
     * 3 m kolem kuželu"); other equipment keeps the usual distance.
     */
    clear: z.number().positive().optional(),
  })
  .strict()
export type Prop = z.infer<typeof propSchema>

/**
 * How much room an exercise takes and where it leaves the team, so the dealer can lay a
 * dealt deck out on a real field (FCI §3.3, §3.5; national: Směrnice §1.1.2–1.1.4). All
 * distances are in metres and, like in the regulation ("Všechny vzdálenosti a úhly jsou
 * přibližné"), approximate. A card without geometry is done on the spot and the team
 * carries on straight. National cards: read off their animation scripts where they have
 * one (a test keeps the two in step), by hand from the regulation otherwise.
 */
export const geometrySchema = z
  .object({
    /**
     * Turn performed, in degrees, positive to the right (180 = about turn, 270 right =
     * the new direction is 90° left). Several values: the course builder picks one.
     */
    turn: z.union([z.number(), z.array(z.number()).min(2)]).optional(),
    /**
     * Where the team leaves the exercise: metres ahead of the card. Negative = steps back
     * that far; the team then walks on forward past the card.
     */
    exit: z.number().optional(),
    /**
     * Where the team leaves, metres to the side of the way in — signed like `Prop.side`
     * (a side step, a slalom that ends beside its cones).
     */
    exitSide: z.number().optional(),
    /** Where the card stands when not where `placement` puts it (beside a line of cones). */
    card: z.object({ ahead: z.number(), side: z.number() }).strict().optional(),
    /**
     * The next exercise is done at least this many metres from this one (Směrnice §1.1.2:
     * "Cviky 107, 227, 308, 320 a 321 potřebují minimální vzdálenost 6 m"; after a jump
     * 5 m past it).
     */
    gap: z.number().positive().optional(),
    props: z.array(propSchema).min(1).optional(),
    /**
     * The recall at a cone 5 m ahead of the card is part of the exercise, and the next
     * card stands 5 m past that cone (§3.5, §4.8). For the leave cards (319, 408, 409) only
     * when no recall card follows.
     */
    recallCone: z.boolean().optional(),
    /** Recall cards: placed this far straight ahead of the leave card before them. */
    fromPrevious: z.number().positive().optional(),
    /**
     * …and to the side by one of these, signed like `Prop.side` (3-302: "posunutá přibližně
     * 180 cm stranou vlevo nebo vpravo").
     */
    fromPreviousSides: z.array(z.number()).min(1).optional(),
    /**
     * Leave cards: where their follow-up stands — this far straight ahead when further
     * than its own `fromPrevious`, and to the side by one of `sides` (3-314: "minimálně 5
     * metrů od překážky a jsou posunuty o 180 cm vpravo či vlevo").
     */
    followUp: z
      .object({
        ahead: z.number().positive(),
        sides: z.array(z.number()).min(1).optional(),
      })
      .strict()
      .optional(),
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
     * Where the exercise is done — A left of the card, B in front of it (FCI §4.3; national
     * §5.3.1: "vlevo před kartou", a change of direction or a side step "přímo před
     * kartou"), C at the recall cone, D jumps (FCI only). Not a static/dynamic type, despite
     * the same letters.
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
    /** Room the exercise needs on the field (course layout). */
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

/** A field to lay a course out on, in metres: `width` across the plan, `height` down it. */
export const fieldSchema = z
  .object({ width: z.number().positive(), height: z.number().positive() })
  .strict()
export type Field = z.infer<typeof fieldSchema>

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
         * Competition courses: how often judges set each card — times it appears on
         * `courses` real courses. The dealer draws with these weights (FCI, plan §5).
         */
        judgesUsage: z
          .object({
            courses: z.number().int().positive(),
            cards: z.record(z.string(), z.number().int().nonnegative()),
          })
          .strict()
          .optional(),
        /**
         * Competition courses laid out on a field: the dealer's weight per card for each
         * field (key `fieldKey`, e.g. `20x30`), calibrated so that dealt courses use each card
         * about as often as `judgesUsage` says — a field makes long exercises rare, the
         * weights make up for it. Generated (scripts/content/fci-usage.ts).
         */
        dealWeights: z.record(z.string(), z.record(z.string(), z.number().positive())).optional(),
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
                /** What the exercise is, in Czech — for the warnings of a hand-made course. */
                label: z.string().min(1),
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
         * The fields a dealt deck can be laid out on, in metres — the first by default, the
         * others on request (`DealOptions.field`). Classes without any are dealt without a
         * layout.
         */
        fields: z.array(fieldSchema).min(1).optional(),
        /** Jumps on one field at most (FCI §3.5: "celkem dvě překážky"). */
        maxJumps: z.number().int().positive().optional(),
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
