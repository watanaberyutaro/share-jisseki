import { NextRequest, NextResponse } from 'next/server'
import { sendPushToAll } from '@/lib/send-push'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { title, body, url, user_role } = await request.json()

    if (user_role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ送信できます' }, { status: 403 })
    }
    if (!title || !body) {
      return NextResponse.json({ error: 'タイトルと本文は必須です' }, { status: 400 })
    }

    await sendPushToAll({ title, body, url: url || '/', icon: '/api/pwa-icon?size=192' })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
