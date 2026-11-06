/**
 * The official VDH 2027 cards (German), for the cards ROTA draws itself (plan R23): their card
 * detail links to the original. Linked only — no VDH card is shipped without VDH's consent.
 * Pages read off the PDF's text layer (`podklady/2027/VDH_RO_RW_2027_Schilder.pdf`, one card a
 * page); VDH's "B-0xx" is the national "Z-0xx", its "Z-0e" our D0e.
 */
export const VDH_CARDS_PDF =
  'https://www.vdh.de/fileadmin/media/hundesport/rally_obedience/2026/VDH_RO_RW_2027_Schilder__1_.pdf'

export const VDH_CARD_PAGES: Readonly<Record<string, number>> = {
  D0e: 9,
  'Z-033': 42,
  'Z-034': 43,
  'Z-035': 44,
  'Z-036': 45,
  '1-116': 61,
  '1-126': 71,
  '1-127': 72,
  '1-128': 73,
  '1-129': 74,
  '1-130': 75,
  '2-233': 108,
  '2-234': 109,
  '3-302': 111,
  '3-328': 137,
  '3-329': 138,
  '3-330': 139,
  '3-331': 140,
  '3-332': 141,
}

/** The original VDH card of a 2027 card ROTA draws itself, opened at its page. */
export const vdhCardUrl = (code: string): string | undefined => {
  const page = VDH_CARD_PAGES[code]
  return page === undefined ? undefined : `${VDH_CARDS_PDF}#page=${page}`
}
