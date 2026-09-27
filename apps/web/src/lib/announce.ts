import type { Card, DeckEntry, Side } from '@rota/content'

/**
 * What is read aloud when a screen of the deck comes up (R9). Pure: the caller passes the
 * translate function, so the text is testable without a browser.
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
    }
  | { kind: 'finish' }

export function announcement(screen: Screen, t: T): string {
  if (screen.kind === 'start') {
    return t(screen.startSide === 'right' ? 'speech.startRight' : 'speech.start')
  }
  if (screen.kind === 'finish') return t('speech.finish')

  const { number, entry, card, supplementary, previous } = screen
  const parts = [t('speech.card', { number, name: card.name })]
  if (supplementary) parts.push(t('speech.supplementary', { name: supplementary.name }))
  const pacePrevious = previous?.pace ?? 'normal'
  if (entry.pace !== pacePrevious) parts.push(t(`speech.pace.${entry.pace}`))
  if (previous && entry.side !== previous.side) parts.push(t(`speech.side.${entry.side}`))
  return parts.join(' ')
}
