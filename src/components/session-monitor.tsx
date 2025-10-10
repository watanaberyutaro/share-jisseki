'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateSessionActivity, cleanupOldSessions } from '@/lib/supabase/sessions'

/**
 * セッション監視コンポーネント
 * - 5分ごとにセッションのアクティビティを更新
 * - ページ読み込み時に古いセッションをクリーンアップ
 * - ブラウザを閉じて30分経過すると自動ログアウト
 */
export function SessionMonitor() {
  const router = useRouter()

  useEffect(() => {
    const userName = localStorage.getItem('userName')
    const userRole = localStorage.getItem('userRole')

    // ログインしていない場合は何もしない
    if (!userName || !userRole) {
      return
    }

    // 初回に古いセッションをクリーンアップ
    cleanupOldSessions()

    // 5分ごとにアクティビティを更新
    const heartbeatInterval = setInterval(() => {
      updateSessionActivity(userName)
    }, 5 * 60 * 1000) // 5分

    // アンマウント時にクリーンアップ
    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [router])

  return null // UIを持たないコンポーネント
}
