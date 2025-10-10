import type { Metadata } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import './globals.css'
import { ConditionalNavigation } from '@/components/conditional-navigation'
import { ConditionalHeader } from '@/components/conditional-header'
import { SessionMonitor } from '@/components/session-monitor'
import { NavigationProvider } from '@/contexts/navigation-context'

const inter = Inter({ subsets: ['latin'] })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })

export const metadata: Metadata = {
  title: 'イベント実績分析ツール',
  description: '携帯ショップ外販イベント実績分析システム',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%233B82F6'/><path d='M8 12L16 8L24 12V20C24 22.2091 22.2091 24 20 24H12C9.79086 24 8 22.2091 8 20V12Z' stroke='white' stroke-width='2' fill='none'/><path d='M12 16L16 20L22 14' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>",
        type: 'image/svg+xml',
      },
    ],
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