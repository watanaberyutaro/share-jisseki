'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

const STORAGE_KEY = 'shela_notification_prompt'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function NotificationPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // 通知非対応・許可済み・却下済みは表示しない
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return

    if (Notification.permission === 'granted') return

    const prompted = localStorage.getItem(STORAGE_KEY)
    if (prompted) return

    // ログイン済みユーザーにのみ表示
    const role = localStorage.getItem('userRole')
    if (!role) return

    // 少し遅延して表示（ページロード直後を避ける）
    const timer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  async function handleAllow() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        localStorage.setItem(STORAGE_KEY, 'denied')
        setShow(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('VAPID公開鍵が設定されていません')
        setShow(false)
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const userName =
        localStorage.getItem('userName') ||
        localStorage.getItem('userRole') ||
        'unknown'

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), user_name: userName }),
      })

      localStorage.setItem(STORAGE_KEY, 'allowed')
      setDone(true)
      setTimeout(() => setShow(false), 1800)
    } catch (err) {
      console.error('通知登録エラー:', err)
      setShow(false)
    } finally {
      setLoading(false)
    }
  }

  function handleLater() {
    localStorage.setItem(STORAGE_KEY, 'later')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className="glass rounded-2xl border p-4 shadow-2xl"
        style={{
          borderColor: '#22211A',
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
          backgroundColor: 'rgba(255,255,255,0.97)',
        }}
      >
        {!done ? (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#22211A' }}
              >
                <Bell className="w-5 h-5" style={{ color: '#DCEDC8' }} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm mb-0.5" style={{ color: '#22211A' }}>
                  プッシュ通知を有効にしますか？
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#22211A', opacity: 0.65 }}>
                  新しいナレッジ投稿・コメント・イベント実績の投稿をリアルタイムでお知らせします
                </p>
              </div>
              <button onClick={handleLater} className="flex-shrink-0 mt-0.5">
                <X className="w-4 h-4" style={{ color: '#22211A', opacity: 0.4 }} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLater}
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: 'rgba(34,33,26,0.08)', color: '#22211A' }}
              >
                後で
              </button>
              <button
                onClick={handleAllow}
                disabled={loading}
                className="flex-[2] py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}
              >
                {loading ? '設定中...' : '🔔 許可する'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#4abf79' }}
            >
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#22211A' }}>
                通知をオンにしました ✅
              </p>
              <p className="text-xs" style={{ color: '#22211A', opacity: 0.6 }}>
                ヘッダーのベルアイコンでいつでも変更できます
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
