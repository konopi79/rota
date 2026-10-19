import type { CardIssue, RoClass } from '@rota/content'
import type { TFunction } from 'i18next'

/** A card code that does not wrap at its hyphen ("2-‑215" on two lines reads as two codes). */
const nb = (code: string) => code.replaceAll('-', '‑')

/** "2-213, 2-215 nebo 2-216" */
const codeList = (codes: string[], t: TFunction) => {
  const all = codes.map(nb)
  return all.length > 1
    ? `${all.slice(0, -1).join(', ')} ${t('issues.or')} ${all.at(-1)}`
    : (all[0] ?? '')
}

/**
 * A broken sequencing rule of a hand-made course (plan §12) in plain Czech, with what
 * would fix it where the rule says so.
 */
export function issueMessage(issue: CardIssue, cls: RoClass, t: TFunction): string {
  const cl = t(`classes.${cls.id}`)
  switch (issue.rule) {
    case 'not-follow-up':
      return t('issues.notFollowUp', { leave: nb(issue.leave), codes: codeList(issue.oneOf, t) })
    case 'leave-without-follow-up':
      return t('issues.leaveWithoutFollowUp', { codes: codeList(issue.oneOf, t) })
    case 'follow-up-without-leave':
      return t('issues.followUpWithoutLeave', { codes: codeList(issue.leaveCards, t) })
    case 'same-pace':
      return t(`issues.samePace.${issue.pace}`)
    case 'pace-incompatible':
      return t(`issues.paceIncompatible.${issue.pace}`)
    case 'side-only':
      return t(`issues.sideOnly.${issue.side}`)
    case 'max-repeats':
      return t('issues.maxRepeats', { max: issue.max })
    case 'supplementary-not-allowed':
      return t('issues.supplementaryNotAllowed', { d0: issue.supplementary, cls: cl })
    case 'not-in-class':
      return t('issues.notInClass', { cls: cl })
    case 'last-only':
      return t('issues.lastOnly', { cls: cl })
    case 'not-new':
      return t('issues.notNew', { cls: cl })
    case 'not-exercise':
      return t('issues.notExercise')
    case 'equipment':
      return t('issues.equipment')
    case 'twice-in-row':
      return t('issues.twiceInRow')
    case 'dealt-twice':
      return t('issues.dealtTwice')
    case 'after-static':
      return t('issues.afterStatic')
    case 'missing-supplementary':
      return t('issues.missingSupplementary')
    case 'unexpected-supplementary':
      return t('issues.unexpectedSupplementary')
    case 'side-mismatch':
      return t('issues.sideMismatch')
    case 'pace-mismatch':
      return t('issues.paceMismatch')
    case 'supplementary-changes-side':
      return t('issues.supplementaryChangesSide')
  }
}
