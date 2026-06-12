import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/send-push'

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

    // 投稿者にプッシュ通知（自分のコメントは除外）
    const { data: post } = await supabase
      .from('knowledge_posts').select('title, author_name').eq('id', params.id).single()

    if (post && post.author_name && post.author_name !== user_name) {
      sendPushToUser(post.author_name, {
        title: '💬 あなたの投稿にコメントがつきました',
        body: `「${post.title}」に ${user_name || '誰か'} がコメントしました`,
        url: `/knowledge/${params.id}`,
        icon: '/api/pwa-icon?size=192',
      }).catch(() => {})
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
