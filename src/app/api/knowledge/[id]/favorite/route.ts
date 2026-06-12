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
      .from('knowledge_favorites').select('id').eq('post_id', postId).eq('user_name', user_name || '').maybeSingle()

    const { data: post } = await supabase.from('knowledge_posts').select('favorite_count').eq('id', postId).single()

    if (existing) {
      await supabase.from('knowledge_favorites').delete().eq('id', existing.id)
      const newCount = Math.max(0, (post?.favorite_count || 1) - 1)
      await supabase.from('knowledge_posts').update({ favorite_count: newCount }).eq('id', postId)
      return NextResponse.json({ is_favorite: false, favorite_count: newCount })
    } else {
      await supabase.from('knowledge_favorites').insert({ post_id: postId, user_name: user_name || 'unknown' })
      const newCount = (post?.favorite_count || 0) + 1
      await supabase.from('knowledge_posts').update({ favorite_count: newCount }).eq('id', postId)
      return NextResponse.json({ is_favorite: true, favorite_count: newCount })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
