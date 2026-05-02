import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ChatWidgetMount } from '@/components/ui/ChatWidgetMount'

export const metadata: Metadata = {
  title: 'F3XYKEE · TERMINAL',
  description: 'Elosztott adathálózati interfész — bejegyzések, operátorok, jelzésláncok.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        {children}
        <ChatWidgetMount/>
      </body>
    </html>
  )
}
