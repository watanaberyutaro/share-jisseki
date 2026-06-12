import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = serviceClient()
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userName = searchParams.get('user_name') || ''

    const { data: post, error } = await supabase
      .from('knowledge_posts').select('*').eq('id', id).single()

    if (error || !post) {
      return NextResponse.json({ error: 'ナレッジが見つかりません' }, { status: 404 })
    }

    const [genreRes, tagsRes, commentsRes, filesRes, helpfulRes, favoriteRes] =
      await Promise.all([
        post.genre_id
          ? supabase.from('knowledge_genres').select('id, name, created_at').eq('id', post.genre_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('knowledge_post_tags').select('knowledge_tags(id, name)').eq('post_id', id),
        supabase.from('knowledge_comments').select('*').eq('post_id', id).order('created_at', { ascending: true }),
        supabase.from('knowledge_files').select('*').eq('post_id', id).order('created_at', { ascending: true }),
        userName
          ? supabase.from('knowledge_helpfuls').select('id').eq('post_id', id).eq('user_name', userName).maybeSingle()
          : Promise.resolve({ data: null }),
        userName
          ? supabase.from('knowledge_favorites').select('id').eq('post_id', id).eq('user_name', userName).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

    const tags = (tagsRes.data || []).map((pt: any) => pt.knowledge_tags).filter(Boolean)

    if (userName) {
      await supabase.from('knowledge_views').insert({ post_id: id, user_name: userName })
      await supabase.from('knowledge_posts').update({ view_count: (post.view_count || 0) + 1 }).eq('id', id)
    }

    return NextResponse.json({
      post: {
        ...post,
        genre: (genreRes as any).data ?? null,
        tags,
        comments: commentsRes.data || [],
        files: filesRes.data || [],
        is_helpful:  !!(helpfulRes  as any).data,
        is_favorite: !!(favoriteRes as any).data,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = serviceClient()
    const body = await request.json()
    const {
      title, bodyText, knowledge_type, genre_id, tag_names,
      related_carrier, related_plan, related_venue,
      user_name, user_role,
    } = body

    const { data: existing } = await supabase
      .from('knowledge_posts').select('author_name').eq('id', params.id).single()

    if (!existing) return NextResponse.json({ error: 'ナレッジが見つかりません' }, { status: 404 })

    if (existing.author_name !== user_name && user_role !== 'admin') {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })
    }

    const updateData: Record<string, any> = {}
    if (title           !== undefined) updateData.title           = title.trim()
    if (bodyText        !== undefined) updateData.body            = bodyText
    if (knowledge_type  !== undefined) updateData.knowledge_type  = knowledge_type
    if (genre_id        !== undefined) updateData.genre_id        = genre_id || null
    if (related_carrier !== undefined) updateData.related_carrier = related_carrier
    if (related_plan    !== undefined) updateData.related_plan    = related_plan
    if (related_venue   !== undefined) updateData.related_venue   = related_venue

    const { data: beforePost } = await supabase.from('knowledge_posts').select('*').eq('id', params.id).single()
    const { data: updated, error } = await supabase.from('knowledge_posts').update(updateData).eq('id', params.id).select().single()
    if (error) throw error

    await supabase.from('knowledge_edit_histories').insert({
      post_id: params.id,
      before_data: beforePost,
      after_data: updated,
    })

    if (Array.isArray(tag_names)) {
      await supabase.from('knowledge_post_tags').delete().eq('post_id', params.id)
      for (const tagName of tag_names) {
        const trimmed = String(tagName).trim()
        if (!trimmed) continue
        const { data: existingTag } = await supabase.from('knowledge_tags').select('id').eq('name', trimmed).maybeSingle()
        let tagId: string
        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag, error: tagErr } = await supabase.from('knowledge_tags').insert({ name: trimmed }).select('id').single()
          if (tagErr) continue
          tagId = newTag.id
        }
        await supabase.from('knowledge_post_tags').insert({ post_id: params.id, tag_id: tagId })
      }
    }

    return NextResponse.json({ post: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const userRole = searchParams.get('user_role')
    if (userRole !== 'admin') return NextResponse.json({ error: '管理者のみ削除できます' }, { status: 403 })

    const supabase = serviceClient()
    const { error } = await supabase.from('knowledge_posts').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
