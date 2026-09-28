'use client'

import { ArrowRight, Download, Share, X } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  CANONICAL_URL,
  installMode,
  isOldHost,
  promptInstall,
  subscribeInstall,
} from '@/lib/install'
import { watchForUpdates } from '@/lib/sw-update'
import { dismissInstallHint, isInstallHintDismissed, subscribeStorage } from '@/lib/storage'

/**
 * Registers the service worker (production only — dev has no sw.js) and keeps an
 * installed app up to date (`lib/sw-update.ts`).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    return watchForUpdates({
      container: navigator.serviceWorker,
      registration: navigator.serviceWorker.register('/sw.js'),
      doc: document,
      reload: () => window.location.reload(),
    })
  }, [])
  return null
}

/** "Add ROTA to the home screen" — until installed or dismissed. */
export function InstallHint() {
  const { t } = useTranslation()
  const mode = useSyncExternalStore(subscribeInstall, installMode, () => 'none' as const)
  const dismissed = useSyncExternalStore(subscribeStorage, isInstallHintDismissed, () => true)
  if (dismissed || mode === 'installed' || mode === 'none') return null

  return (
    <aside className="bg-muted relative space-y-2 rounded-lg p-4 pr-10 text-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        aria-label={t('install.dismiss')}
        onClick={dismissInstallHint}
      >
        <X />
      </Button>
      <p className="font-semibold">{t('install.title')}</p>
      {mode === 'ios' ? (
        <p>
          {t('install.iosBefore')} <Share className="inline size-4 align-text-bottom" />{' '}
          {t('install.iosAfter')}
        </p>
      ) : (
        <Button size="sm" onClick={() => void promptInstall()}>
          <Download />
          {t('install.button')}
        </Button>
      )}
      <p className="text-muted-foreground">{t('install.offline')}</p>
    </aside>
  )
}

const noSubscription = () => () => {}

/** On the original address only: "ROTA moved to rotapp.cz — save it again". */
export function MovedHint() {
  const { t } = useTranslation()
  const old = useSyncExternalStore(
    noSubscription,
    () => isOldHost(window.location.hostname),
    () => false,
  )
  if (!old) return null

  return (
    <aside className="border-primary space-y-2 rounded-lg border-2 p-4 text-sm">
      <p className="font-semibold">{t('moved.title')}</p>
      <p>{t('moved.body')}</p>
      <Button size="sm" render={<a href={CANONICAL_URL} />}>
        {t('moved.open')}
        <ArrowRight />
      </Button>
    </aside>
  )
}
