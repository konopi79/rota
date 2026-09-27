/**
 * Which PDF page is which card (plan §4). One entry per page, in page order.
 *
 * National PDFs hold one card per landscape A4 page. The page order was established by
 * OCR of the code printed in each card's top-right corner; `extract.ts` re-checks it on
 * every run and reports any page whose printed code disagrees with this list.
 */

export type PageEntry =
  /** A card; `code` is the card code as printed (`Z-001`, `1-101`, `D0a`) or START/FINISH. */
  | { kind: 'card'; code: string }
  /** An execution diagram that belongs to a card (no code printed on the page). */
  | { kind: 'diagram'; code: string }
  /** Not a card (overview page, section divider) — not extracted. */
  | { kind: 'skip'; what: string }

export type Source = {
  ruleset: 'cz' | 'fci'
  pdf: string
  /**
   * poppler by default. The FCI PDF references fonts it does not embed (Arial, Times);
   * poppler renders their text as empty boxes, MuPDF substitutes the fonts.
   */
  renderer?: 'poppler' | 'mupdf'
  /**
   * How the page → code mapping is checked: OCR of the printed code (raster national
   * cards) or the PDF text layer, which starts with the code (vector FCI cards).
   */
  verify: 'ocr' | 'text'
  pages: PageEntry[]
}

const card = (code: string): PageEntry => ({ kind: 'card', code })
const diagram = (code: string): PageEntry => ({ kind: 'diagram', code })
const skip = (what: string): PageEntry => ({ kind: 'skip', what })

const range = (prefix: string, from: number, to: number): PageEntry[] =>
  Array.from({ length: to - from + 1 }, (_, i) =>
    card(`${prefix}-${String(from + i).padStart(3, '0')}`),
  )
/** FCI codes are plain numbers: 101…122 etc. */
const fciRange = (from: number, to: number): PageEntry[] =>
  Array.from({ length: to - from + 1 }, (_, i) => card(String(from + i)))

/**
 * Pages whose printed code OCR cannot read (artwork crowds the corner) but that were
 * checked by eye on the contact sheet. Keep this list short and dated.
 */
export const VERIFIED_BY_EYE = new Set(['2-202']) // 2026-09-27

export const SOURCES: Source[] = [
  {
    ruleset: 'cz',
    pdf: 'podklady/RO-Z.pdf',
    verify: 'ocr',
    pages: [
      card('START'),
      card('FINISH'),
      card('D0a'),
      card('D0b'),
      card('D0c'),
      card('D0d'),
      ...range('Z', 1, 18),
      // Pages 25 and 27 are execution diagrams of the two spirals, not cards.
      diagram('Z-018'),
      card('Z-019'),
      diagram('Z-019'),
      ...range('Z', 20, 32),
    ],
  },
  { ruleset: 'cz', pdf: 'podklady/RO1.pdf', verify: 'ocr', pages: range('1', 101, 125) },
  { ruleset: 'cz', pdf: 'podklady/RO2.pdf', verify: 'ocr', pages: range('2', 201, 232) },
  { ruleset: 'cz', pdf: 'podklady/RO3.pdf', verify: 'ocr', pages: range('3', 301, 327) },
  {
    ruleset: 'fci',
    pdf: 'podklady/RO-FCI.pdf',
    renderer: 'mupdf',
    verify: 'text',
    pages: [
      skip('overview of all signs'),
      card('START'),
      card('FINISH'),
      skip('1 POINT'),
      ...fciRange(101, 122),
      skip('2 POINTS'),
      ...fciRange(201, 222),
      skip('3 POINTS'),
      ...fciRange(301, 323),
      skip('4 POINTS'),
      ...fciRange(401, 422),
    ],
  },
]

/** File name of a card image: lower-case code, e.g. `z-001`, `d0a`, `start`. */
export const cardFileName = (entry: Exclude<PageEntry, { kind: 'skip' }>): string =>
  entry.kind === 'diagram' ? `${entry.code.toLowerCase()}-diagram` : entry.code.toLowerCase()
