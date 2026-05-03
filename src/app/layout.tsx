import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ChatWidgetMount } from '@/components/ui/ChatWidgetMount'
import { BootScreen } from '@/components/shell/BootScreen'

export const metadata: Metadata = {
  title: 'F3XYKEE · TERMINAL',
  description: 'Elosztott adathálózati interfész — bejegyzések, operátorok, jelzésláncok.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#07080b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (!sessionStorage.getItem('f3x_boot_seen')) {
              document.documentElement.classList.add('booting');
              setTimeout(function(){ document.documentElement.classList.remove('booting'); }, 5000);
            }
          } catch(e) {}
        ` }}/>
        <BootScreen/>
        {children}
        <ChatWidgetMount/>
      </body>
    </html>
  )
}
