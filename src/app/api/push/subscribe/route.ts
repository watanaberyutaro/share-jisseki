import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { subscription, user_name } = await request.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'subscription が不正です' }, { status: 400 })
    }

    const supabase = serviceClient()
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_name: user_name || 'unknown',
          endpoint:  subscription.endpoint,
          p256dh:    subscription.keys.p256dh,
          auth_key:  subscription.keys.auth,
        },
        { onConflict: 'endpoint' }
      )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json()
    const supabase = serviceClient()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
