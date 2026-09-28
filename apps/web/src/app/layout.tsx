import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Analytics } from '@/components/analytics'
import { I18nProvider } from '@/components/i18n-provider'
import { ServiceWorkerRegistration } from '@/components/pwa'
import './globals.css'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
})

export const metadata: Metadata = {
  title: {
    default: 'ROTA | Rally Obedience Training App',
    template: '%s | ROTA',
  },
  description: 'Náhodné karty rally obedience pro trénink – národní řád i FCI.',
  // Installable on the home screen (R5). iOS needs the Apple meta tags on top of the
  // manifest; without `apple-mobile-web-app-capable` the icon opens a Safari tab.
  appleWebApp: { capable: true, title: 'ROTA', statusBarStyle: 'default' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="cs" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider>{children}</I18nProvider>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
