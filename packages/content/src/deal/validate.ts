import { getCard, getClass } from '../registry'
import { endsStatic, hasEquipment, paceAfter, sideAfter } from './rules'
import type { Deck, Pace, Side } from './types'

/**
 * Independent check of a dealt deck against the rules of plan §5. Returns one message
 * per broken rule (empty = performable). Deliberately written without the dealer's
 * candidate logic, so a bug in one is caught by the other in the property tests.
 */
export function validateDeck(deck: Deck): string[] {
  const { options, entries } = deck
  const cls = getClass(options.classId)
  if (!cls) return [`unknown class ${options.classId}`]

  const errors: string[] = []
  const inClass = new Set(cls.cardCodes)
  const newOnly = options.scope === 'new' && cls.newCardCodes.length > 0
  const seenMain = new Set<string>()
  let pace: Pace = 'normal'
  let side: Side = options.startSide
  let prevStatic = false
  let prevRequired: string[] | undefined
  let prevOptional: string[] = []
  let prevCode: string | undefined
  const counts = new Map<string, number>()

  entries.forEach((entry, i) => {
    const at = `#${i + 1} ${entry.code}`
    const card = getCard(cls.ruleset, entry.code)
    if (!card || card.kind !== 'exercise') {
      errors.push(`${at}: not an exercise card`)
      return
    }
    const seq = card.sequencing

    if (!inClass.has(card.code)) errors.push(`${at}: not in class ${cls.id}`)
    if (!hasEquipment(card, options)) errors.push(`${at}: needs equipment not at hand`)
    if (card.code === prevCode) errors.push(`${at}: same card twice in a row`)

    if (prevRequired && !prevRequired.includes(card.code)) {
      errors.push(`${at}: not a follow-up of the leave card`)
    }
    if (seq.onlyAfterLeave) {
      if (!prevRequired?.includes(card.code) && !prevOptional.includes(card.code)) {
        errors.push(`${at}: follow-up card without a leave card`)
      }
    } else {
      if (seenMain.has(card.code)) errors.push(`${at}: dealt twice`)
      if (newOnly && !cls.newCardCodes.includes(card.code)) {
        errors.push(`${at}: not a new card of ${cls.id}`)
      }
      seenMain.add(card.code)
    }

    if (seq.afterStatic && !prevStatic) errors.push(`${at}: must follow a static exercise`)
    if (seq.pace && seq.pace === pace) errors.push(`${at}: pace is already ${pace}`)
    if (cls.course.paceCompatibleOnly && pace !== 'normal' && !seq.pace && !seq.paceCompatible) {
      errors.push(`${at}: cannot be performed in ${pace} pace`)
    }
    if (seq.sideOnly && seq.sideOnly !== side)
      errors.push(`${at}: only with the dog ${seq.sideOnly}`)
    counts.set(card.code, (counts.get(card.code) ?? 0) + 1)
    if (cls.course.maxRepeats && (counts.get(card.code) ?? 0) > cls.course.maxRepeats) {
      errors.push(`${at}: more than ${cls.course.maxRepeats} times`)
    }
    if (seq.lastOnly?.includes(cls.id) && i !== entries.length - 1) {
      errors.push(`${at}: allowed only as the last card in ${cls.id}`)
    }
    if (seq.nextOneOf && i === entries.length - 1) {
      errors.push(`${at}: leave card without follow-up`)
    }

    if (seq.requiresSupplementary) {
      if (!entry.supplementary) errors.push(`${at}: missing its D0 card`)
      else if (!cls.course.supplementary.includes(entry.supplementary)) {
        errors.push(`${at}: ${entry.supplementary} not allowed in ${cls.id}`)
      }
    } else if (entry.supplementary) {
      errors.push(`${at}: has a D0 card it does not take`)
    }

    if (entry.side !== side) errors.push(`${at}: side should be ${side}`)
    if (entry.pace !== pace) errors.push(`${at}: pace should be ${pace}`)

    const static_ = endsStatic(cls, card, entry.supplementary)
    pace = paceAfter(card, pace, static_)
    side = sideAfter(card, side)
    prevStatic = static_
    prevRequired = seq.nextOneOf
    prevOptional = seq.mayBeFollowedBy ?? []
    prevCode = card.code
  })
  return errors
}
