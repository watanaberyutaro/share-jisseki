import type { Metadata } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import './globals.css'
import { ConditionalNavigation } from '@/components/conditional-navigation'
import { ConditionalHeader } from '@/components/conditional-header'
import { SessionMonitor } from '@/components/session-monitor'
import { NavigationProvider } from '@/contexts/navigation-context'
import { PwaRegister } from '@/components/pwa-register'
import { NotificationPrompt } from '@/components/notification-prompt'

const inter = Inter({ subsets: ['latin'] })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })

export const metadata: Metadata = {
  title: 'SHELA - イベント実績分析',
  description: '携帯ショップ外販イベント実績分析システム',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SHELA',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} ${orbitron.variable}`}>
        <PwaRegister />
        <NotificationPrompt />
        <NavigationProvider>
          <SessionMonitor />
          <div className="flex min-h-screen">
            <ConditionalNavigation />
            <div className="flex flex-col flex-1">
              <ConditionalHeader />
              <main className="flex-1" style={{ backgroundColor: 'rgba(220, 237, 200, 0.75)' }}>
                {children}
              </main>
            </div>
          </div>
        </NavigationProvider>
      </body>
    </html>
  )
}
