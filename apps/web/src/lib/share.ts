/**
 * Shares a link with the system share sheet where there is one (phones), else copies it.
 * Resolves to `'copied'` when it went to the clipboard, so the button can say so.
 */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    await navigator.share({ title, url }).catch(() => {})
    return 'shared'
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
