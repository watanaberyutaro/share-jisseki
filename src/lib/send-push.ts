import webpush from 'web-push'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function initWebPush() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function removeSub(endpoint: string) {
  const supabase = serviceClient()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

async function doSend(sub: any, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify(payload)
    )
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await removeSub(sub.endpoint)
    }
  }
}

export async function sendPushToAll(payload: PushPayload) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  initWebPush()
  const supabase = serviceClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return
  await Promise.allSettled(subs.map(sub => doSend(sub, payload)))
}

export async function sendPushToUser(userName: string, payload: PushPayload) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  initWebPush()
  const supabase = serviceClient()
  const { data: subs } = await supabase
    .from('push_subscriptions').select('*').eq('user_name', userName)
  if (!subs || subs.length === 0) return
  await Promise.allSettled(subs.map(sub => doSend(sub, payload)))
}
