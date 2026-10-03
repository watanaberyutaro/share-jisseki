'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isPathAllowedForViewer } from '@/lib/user-access'

/**
 * 一般ユーザー(role='user' = 三浦)を閲覧ページのみに制限するガード。
 * 閲覧ページ以外にアクセスした場合は /view に強制的に戻す。
 * 管理者・未ログインは対象外（従来どおり）。
 */
export function UserAccessGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const role = localStorage.getItem('userRole')
    if (role !== 'user') return // 管理者・未ログインはそのまま
    if (pathname && !isPathAllowedForViewer(pathname)) {
      router.replace('/view')
    }
  }, [pathname, router])

  return null
}
