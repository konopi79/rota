import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { I18nProvider } from '@/components/i18n-provider'
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
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="cs" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
