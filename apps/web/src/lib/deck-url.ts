import { CLASS_IDS, EQUIPMENT, type DealOptions, type Equipment } from '@rota/content'
import { z } from 'zod/v4'

/**
 * The deck lives in the URL (plan §6): class + options + seed reproduce the same order,
 * and `karta` keeps the position, so a reload or a shared link lands on the same card.
 * Keys are Czech because the URL is visible to the user.
 */
export type DeckParams = {
  options: DealOptions
  showDescription: boolean
  /** Screen index: 0 = start, 1…n = cards, n + 1 = finish. */
  position: number
}

const EQUIPMENT_SLUG: Record<Equipment, string> = {
  cones: 'kuzely',
  bowls: 'misky',
  jump: 'prekazka',
}

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
})

export function encodeDeckParams({ options, showDescription, position }: DeckParams): string {
  const params = new URLSearchParams({
    trida: options.classId,
    karty: options.scope === 'new' ? 'nove' : 'vse',
    pocet: String(options.count),
    pomucky: options.equipment.map((e) => EQUIPMENT_SLUG[e]).join(','),
    strana: options.startSide === 'right' ? 'P' : 'L',
    seed: String(options.seed),
    popis: showDescription ? '1' : '0',
    karta: String(position),
  })
  return params.toString()
}

/** `null` for a URL that does not describe a deck (hand-edited, truncated, outdated). */
export function decodeDeckParams(search: URLSearchParams): DeckParams | null {
  const parsed = paramsSchema.safeParse(Object.fromEntries(search.entries()))
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
    },
    showDescription: p.popis === '1',
    position: p.karta,
  }
}
