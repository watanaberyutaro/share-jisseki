'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
  } catch {
    return new Uint8Array()
  }
}

export function PushBell() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (
      !VAPID_KEY ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return

    setSupported(true)
    setPermission(Notification.permission)
    checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {}
  }

  async function subscribe() {
    if (!VAPID_KEY) return
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
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
      setSubscribed(true)
    } catch (err) {
      console.error('push subscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch {}
    setLoading(false)
  }

  if (!supported) return null

  const label =
    permission === 'denied' ? '通知ブロック中'
    : loading               ? (subscribed ? 'オフにしています...' : 'オンにしています...')
    : subscribed            ? '通知オン'
    :                         '通知オフ'

  return (
    <div className="relative group flex items-center">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading || permission === 'denied'}
        className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg transition-all disabled:opacity-40 active:scale-95"
        style={{
          backgroundColor: loading
            ? 'rgba(255,255,255,0.25)'
            : subscribed
            ? 'rgba(74,191,121,0.3)'
            : 'rgba(255,255,255,0.15)',
        }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin drop-shadow-sm" style={{ color: '#FFFFFF' }} />
        ) : subscribed ? (
          <Bell className="w-4 h-4 drop-shadow-sm" style={{ color: '#4abf79' }} />
        ) : (
          <BellOff className="w-4 h-4 drop-shadow-sm" style={{ color: '#FFFFFF' }} />
        )}
        <span
          className="text-xs font-bold drop-shadow-sm hidden sm:inline"
          style={{ color: subscribed ? '#4abf79' : '#FFFFFF' }}
        >
          {label}
        </span>
      </button>

      {/* モバイル用ツールチップ */}
      <div
        className="sm:hidden absolute bottom-full left-1/2 mb-2 px-2 py-1 rounded text-xs font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ transform: 'translateX(-50%)', backgroundColor: '#22211A', color: '#DCEDC8' }}
      >
        {label}
      </div>
    </div>
  )
}
