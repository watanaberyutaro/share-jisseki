'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'

export function ConditionalHeader() {
  const pathname = usePathname()

  // ルートページとログインページでは表示しない
  if (pathname === '/' || pathname === '/login') {
    return null
  }

  return <Header />
}