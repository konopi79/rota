import {
  CLASS_IDS,
  customDeck,
  dealDeck,
  EQUIPMENT,
  getCard,
  getClass,
  type CustomCard,
  type DealOptions,
  type Deck,
  type Equipment,
} from '@rota/content'
import { z } from 'zod/v4'

/**
 * The deck lives in the URL (plan §6): class + options + seed reproduce the same order,
 * and `karta` keeps the position, so a reload or a shared link lands on the same card.
 * A course put together by hand (plan §12) carries its cards instead of a seed
 * (`poradi=Z-003,Z-014.D0a,2-211`). Keys are Czech because the URL is visible to the user.
 */
export type DeckParams = {
  options: DealOptions
  /** A hand-made course: these cards in this order instead of a dealt deck. */
  order?: CustomCard[]
  /** A hand-made course is checked against the judges' guidelines too (`smernice=1`). */
  guidelines?: boolean
  /** A hand-made course is not checked at all — a short sequence from a trainer (`kontrola=0`). */
  unchecked?: boolean
  showDescription: boolean
  /** Read each card aloud (R9). */
  speak?: boolean
  /** Screen index: 0 = start, 1…n = cards, n + 1 = finish. */
  position: number
}

const EQUIPMENT_SLUG: Record<Equipment, string> = {
  cones: 'kuzely',
  bowls: 'misky',
  jump: 'prekazka',
}

/** Most cards a hand-made course may have (a dealt deck's `pocet` has the same cap). */
export const MAX_CUSTOM_CARDS = 100

const paramsSchema = z.object({
  trida: z.enum(CLASS_IDS),
  karty: z.enum(['vse', 'nove']).default('vse'),
  pocet: z.coerce.number().int().min(1).max(100),
  pomucky: z.string().default(''),
  strana: z.enum(['L', 'P']).default('L'),
  seed: z.coerce
    .number()
    .int()
    .min(0)
    .max(2 ** 32 - 1),
  popis: z.enum(['0', '1']).default('0'),
  karta: z.coerce.number().int().min(0).default(0),
  parkur: z.enum(['0', '1']).default('0'),
  hlas: z.enum(['0', '1']).default('0'),
})

const customSchema = paramsSchema
  .pick({ trida: true, strana: true, popis: true, karta: true, hlas: true })
  .extend({
    poradi: z.string().min(1),
    smernice: z.enum(['0', '1']).default('0'),
    kontrola: z.enum(['0', '1']).default('1'),
  })

/** `Z-014.D0a` — a card and its D0 card. */
export const encodeOrder = (order: CustomCard[]) =>
  order.map((c) => (c.supplementary ? `${c.code}.${c.supplementary}` : c.code)).join(',')

export function encodeDeckParams({
  options,
  order,
  guidelines,
  unchecked,
  showDescription,
  speak,
  position,
}: DeckParams): string {
  const strana = options.startSide === 'right' ? 'P' : 'L'
  const popis = showDescription ? '1' : '0'
  const params = order
    ? new URLSearchParams({
        trida: options.classId,
        poradi: encodeOrder(order),
        strana,
        popis,
        karta: String(position),
      })
    : new URLSearchParams({
        trida: options.classId,
        karty: options.scope === 'new' ? 'nove' : 'vse',
        pocet: String(options.count),
        pomucky: options.equipment.map((e) => EQUIPMENT_SLUG[e]).join(','),
        strana,
        seed: String(options.seed),
        popis,
        karta: String(position),
      })
  // Only competition courses carry the flag, so training-deck URLs stay as they were.
  if (options.competition && !order) params.set('parkur', '1')
  if (order && unchecked) params.set('kontrola', '0')
  else if (order && guidelines) params.set('smernice', '1')
  if (speak) params.set('hlas', '1')
  return params.toString()
}

/** `null` for a URL that does not describe a deck (hand-edited, truncated, outdated). */
export function decodeDeckParams(search: URLSearchParams): DeckParams | null {
  const entries = Object.fromEntries(search.entries())
  if (search.has('poradi')) return decodeCustom(entries)
  const parsed = paramsSchema.safeParse(entries)
  if (!parsed.success) return null
  const p = parsed.data
  const slugs = p.pomucky ? p.pomucky.split(',') : []
  const equipment = EQUIPMENT.filter((e) => slugs.includes(EQUIPMENT_SLUG[e]))
  if (equipment.length !== slugs.length) return null
  return {
    options: {
      classId: p.trida,
      scope: p.karty === 'nove' ? 'new' : 'all',
      count: p.pocet,
      equipment,
      startSide: p.strana === 'P' ? 'right' : 'left',
      seed: p.seed,
      ...(p.parkur === '1' && { competition: true }),
    },
    showDescription: p.popis === '1',
    ...(p.hlas === '1' && { speak: true }),
    position: p.karta,
  }
}

/**
 * A hand-made course. Its cards must exist in the class's ruleset (exercises, D0 cards
 * as D0) — whether they are in the class or in a performable order is for the warnings.
 */
function decodeCustom(entries: Record<string, string>): DeckParams | null {
  const parsed = customSchema.safeParse(entries)
  if (!parsed.success) return null
  const p = parsed.data
  const ruleset = getClass(p.trida)?.ruleset
  if (!ruleset) return null
  const order: CustomCard[] = []
  for (const item of p.poradi.split(',')) {
    const [code = '', supplementary, ...rest] = item.split('.')
    if (rest.length || getCard(ruleset, code)?.kind !== 'exercise') return null
    if (supplementary === undefined) order.push({ code })
    else if (getCard(ruleset, supplementary)?.kind === 'supplementary') {
      order.push({ code, supplementary })
    } else return null
  }
  if (order.length > MAX_CUSTOM_CARDS) return null
  return {
    options: customDeck(p.trida, p.strana === 'P' ? 'right' : 'left', order).options,
    order,
    ...(p.kontrola === '0' ? { unchecked: true } : p.smernice === '1' && { guidelines: true }),
    showDescription: p.popis === '1',
    ...(p.hlas === '1' && { speak: true }),
    position: p.karta,
  }
}

/** The deck the params describe: dealt from the seed, or the hand-made order. */
export const deckOf = (params: DeckParams): Deck =>
  params.order
    ? customDeck(params.options.classId, params.options.startSide, params.order)
    : dealDeck(params.options)
