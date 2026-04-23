import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'F3XYKEE · TERMINAL',
  description: 'Elosztott adathálózati interfész — bejegyzések, operátorok, jelzésláncok.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  )
}
