import type { DeckIssue, RoClass } from '@rota/content'
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

/** Required exercises with more cards than this are named by their label only. */
const MAX_LISTED = 8

/**
 * A broken rule of a hand-made course (plan §12) in plain Czech, with what would fix it
 * where the rule says so — sequencing rules of the regulations and, when asked for, the
 * judges' guidelines.
 */
export function issueMessage(issue: DeckIssue, cls: RoClass, t: TFunction): string {
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
    // The judges' guidelines.
    case 'supplementary-changes-side':
      return t('issues.supplementaryChangesSide')
    case 'too-often':
      return t('issues.tooOften', { card: nb(issue.card), count: issue.count, max: issue.limit })
    case 'right-to-finish-early':
      return t('issues.rightToFinishEarly', { count: issue.within })
    case 'right-mid-course':
      return t('issues.rightMidCourse', { cls: cl })
    case 'right-mid-too-long':
      return t(issue.max === 0 ? 'issues.rightMidBack' : 'issues.rightMidTooLong', {
        max: issue.max,
      })
    case 'required-missing':
      return issue.oneOf.length <= MAX_LISTED
        ? t('issues.requiredMissingCards', {
            label: issue.label,
            codes: codeList(issue.oneOf, t),
          })
        : t('issues.requiredMissing', { label: issue.label })
    case 'static-share':
      return t('issues.staticShare', { statics: issue.statics, count: issue.count })
    case 'right-start-late':
      return t('issues.rightStartLate', { by: issue.by })
    case 'right-pattern':
      // RO1 allows one change only; RO2 and RO3 also a stretch mid-course.
      return t(
        cls.course.rightHand?.midLength === undefined
          ? 'issues.rightPattern.single'
          : 'issues.rightPattern.withMid',
        { cls: cl },
      )
    case 'course-size':
      return t('issues.courseSize', { min: issue.min, max: issue.max })
    case 'points-mix':
      return t('issues.pointsMix', { points: issue.points, min: issue.min })
  }
}

/** Identical messages once, with how many times they came ("… (3×)."). */
export function countedMessages(messages: string[]): string[] {
  const counts = new Map<string, number>()
  for (const m of messages) counts.set(m, (counts.get(m) ?? 0) + 1)
  return [...counts].map(([m, n]) => (n > 1 ? `${m.replace(/\.$/, '')} (${n}×).` : m))
}
