import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = serviceClient()
    const { body, user_name } = await request.json()

    if (!body?.trim()) return NextResponse.json({ error: 'コメント本文は必須です' }, { status: 400 })

    const { data: comment, error } = await supabase
      .from('knowledge_comments')
      .insert({ post_id: params.id, user_name: user_name || 'unknown', body: body.trim() })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ comment }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
