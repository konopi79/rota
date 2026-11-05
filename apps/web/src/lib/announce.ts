import {
  finishSide,
  getCard,
  stationsOf,
  stepForwardAfter,
  type Card,
  type Deck,
  type DeckEntry,
  type RoClass,
  type Side,
} from '@rota/content'

/**
 * What is read aloud when a screen of the deck comes up (R9). A comma after a card's number,
 * never a full stop: "Karta 2." reads as an ordinal, in the wrong gender ("karta druhý").
 * Pure: the caller passes the translate function, so the text is testable without a browser.
 */
type T = (key: string, values?: Record<string, string | number>) => string

export type Screen =
  | { kind: 'start'; startSide: Side }
  | {
      kind: 'card'
      number: number
      entry: DeckEntry
      card: Card
      supplementary?: Card
      /** The previous card's entry — pace and side are only announced when they change. */
      previous?: DeckEntry
      /** "Další karta 3, …" instead of "Karta 3, …" — the course walkthrough, the team setting off. */
      next?: true
      /** The cards done at the same station after it (a CNDC, plan R18). */
      following?: {
        number: number
        card: Card
        supplementary?: Card
        /** After a dynamic exercise: a step forward first (řád p. 16). */
        stepFirst?: boolean
      }[]
    }
  | { kind: 'finish'; side: Side }

export function announcement(screen: Screen, t: T): string {
  if (screen.kind === 'start') {
    return t(screen.startSide === 'right' ? 'speech.startRight' : 'speech.start')
  }
  if (screen.kind === 'finish') {
    return t(screen.side === 'right' ? 'speech.finishRight' : 'speech.finish')
  }

  const { number, entry, card, supplementary, previous } = screen
  const parts = [t(screen.next ? 'speech.nextCard' : 'speech.card', { number, name: card.name })]
  if (supplementary) parts.push(t('speech.supplementary', { name: supplementary.name }))
  const pacePrevious = previous?.pace ?? 'normal'
  if (entry.pace !== pacePrevious) parts.push(t(`speech.pace.${entry.pace}`))
  if (previous && entry.side !== previous.side) parts.push(t(`speech.side.${entry.side}`))
  for (const next of screen.following ?? []) {
    const key = next.stepFirst ? 'speech.sameStationStep' : 'speech.sameStation'
    parts.push(t(key, { number: next.number, name: next.card.name }))
    if (next.supplementary) {
      parts.push(t('speech.supplementary', { name: next.supplementary.name }))
    }
  }
  return parts.join(' ')
}

/**
 * Screen `pos` of `deck`: 0 = start, 1…n = cards, n + 1 = finish. Several cards at one station
 * (CNDC) come up together, `pos` at its first card.
 */
export function deckScreen(deck: Deck, cls: RoClass, pos: number): Screen {
  if (pos === 0) return { kind: 'start', startSide: deck.options.startSide }
  const at = deck.entries[pos - 1]
  if (!at) return { kind: 'finish', side: finishSide(deck) }
  const card = (code: string) => getCard(cls.ruleset, code) as Card
  const [, to] = stationsOf(deck.entries).find(([a, b]) => pos - 1 >= a && pos - 1 <= b) ?? [
    pos - 1,
    pos - 1,
  ]
  const following = deck.entries.slice(pos, to + 1).map((e, i) => ({
    number: pos + 1 + i,
    card: card(e.code),
    ...(e.supplementary && { supplementary: card(e.supplementary) }),
    ...(stepForwardAfter(cls, deck.entries[pos - 1 + i] as DeckEntry) && {
      stepFirst: true as const,
    }),
  }))
  return {
    kind: 'card',
    number: pos,
    entry: at,
    card: card(at.code),
    supplementary: at.supplementary ? card(at.supplementary) : undefined,
    previous: deck.entries[pos - 2],
    ...(following.length && { following }),
  }
}

/**
 * What the course walkthrough reads as the team sets off to the card at `index` (a station's
 * first card) — only once the exercise before it is done, so the next card never talks over it.
 * The first card of a run: "Start. Karta 1, …" from the start, just the card from any other;
 * every one after it "Další karta 3, …".
 */
export function walkthroughAnnouncement(
  deck: Deck,
  cls: RoClass,
  index: number,
  first: boolean,
  t: T,
): string {
  const screen = deckScreen(deck, cls, index + 1)
  if (!first) return announcement(screen.kind === 'card' ? { ...screen, next: true } : screen, t)
  const card = announcement(screen, t)
  return index === 0 ? `${announcement(deckScreen(deck, cls, 0), t)} ${card}` : card
}
