'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './navigation'

export function ConditionalNavigation() {
  const pathname = usePathname()

  // ルートページとログインページでは表示しない
  if (pathname === '/' || pathname === '/login') {
    return null
  }

  return <Navigation />
}