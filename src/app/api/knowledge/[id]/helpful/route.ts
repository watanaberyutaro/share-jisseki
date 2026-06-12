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
    const { user_name } = await request.json()
    const postId = params.id

    const { data: existing } = await supabase
      .from('knowledge_helpfuls').select('id').eq('post_id', postId).eq('user_name', user_name || '').maybeSingle()

    const { data: post } = await supabase.from('knowledge_posts').select('helpful_count').eq('id', postId).single()

    if (existing) {
      await supabase.from('knowledge_helpfuls').delete().eq('id', existing.id)
      const newCount = Math.max(0, (post?.helpful_count || 1) - 1)
      await supabase.from('knowledge_posts').update({ helpful_count: newCount }).eq('id', postId)
      return NextResponse.json({ is_helpful: false, helpful_count: newCount })
    } else {
      await supabase.from('knowledge_helpfuls').insert({ post_id: postId, user_name: user_name || 'unknown' })
      const newCount = (post?.helpful_count || 0) + 1
      await supabase.from('knowledge_posts').update({ helpful_count: newCount }).eq('id', postId)
      return NextResponse.json({ is_helpful: true, helpful_count: newCount })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
