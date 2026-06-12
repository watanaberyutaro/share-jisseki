import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushToAll } from '@/lib/send-push'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = serviceClient()
    const { searchParams } = new URL(request.url)

    const search       = searchParams.get('search')        || ''
    const status       = searchParams.get('status')        || ''
    const knowledge_type = searchParams.get('knowledge_type') || ''
    const genre_id     = searchParams.get('genre_id')      || ''
    const sort         = searchParams.get('sort')          || 'created_at_desc'
    const page         = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit        = 10

    let query = supabase
      .from('knowledge_posts')
      .select(
        'id, title, knowledge_type, genre_id, status, author_name, related_carrier, related_plan, related_venue, view_count, helpful_count, favorite_count, created_at, updated_at',
        { count: 'exact' }
      )

    if (search)         query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
    if (status)         query = query.eq('status', status)
    if (knowledge_type) query = query.eq('knowledge_type', knowledge_type)
    if (genre_id)       query = query.eq('genre_id', genre_id)

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      created_at_desc:    { column: 'created_at',    ascending: false },
      created_at_asc:     { column: 'created_at',    ascending: true  },
      helpful_count_desc: { column: 'helpful_count', ascending: false },
      view_count_desc:    { column: 'view_count',    ascending: false },
    }
    const s = sortMap[sort] ?? sortMap.created_at_desc
    query = query.order(s.column, { ascending: s.ascending })

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data: posts, error, count } = await query
    if (error) throw error

    if (!posts || posts.length === 0) return NextResponse.json({ posts: [], total: 0 })

    const postIds  = posts.map((p: any) => p.id)
    const genreIds = [...new Set(posts.map((p: any) => p.genre_id).filter(Boolean))]

    const [genresRes, tagsRes] = await Promise.all([
      genreIds.length > 0
        ? supabase.from('knowledge_genres').select('id, name').in('id', genreIds as string[])
        : Promise.resolve({ data: [] }),
      supabase
        .from('knowledge_post_tags')
        .select('post_id, knowledge_tags(id, name)')
        .in('post_id', postIds),
    ])

    const genresMap: Record<string, any> = Object.fromEntries(
      (genresRes.data || []).map((g: any) => [g.id, g])
    )
    const tagsMap: Record<string, any[]> = {}
    for (const pt of (tagsRes.data || []) as any[]) {
      if (!tagsMap[pt.post_id]) tagsMap[pt.post_id] = []
      if (pt.knowledge_tags) tagsMap[pt.post_id].push(pt.knowledge_tags)
    }

    const enriched = posts.map((p: any) => ({
      ...p,
      genre: p.genre_id ? (genresMap[p.genre_id] ?? null) : null,
      tags:  tagsMap[p.id] ?? [],
    }))

    return NextResponse.json({ posts: enriched, total: count || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = serviceClient()
    const body = await request.json()
    const {
      title, bodyText, knowledge_type, genre_id, tag_names,
      related_carrier, related_plan, related_venue,
      author_name, author_role,
    } = body

    if (!title?.trim() || !knowledge_type) {
      return NextResponse.json({ error: 'タイトルと種別は必須です' }, { status: 400 })
    }

    const { data: post, error: postError } = await supabase
      .from('knowledge_posts')
      .insert({
        title: title.trim(),
        body: bodyText || '',
        knowledge_type,
        genre_id: genre_id || null,
        status: 'unverified',
        author_name: author_name || 'unknown',
        related_carrier: related_carrier || [],
        related_plan: related_plan || '',
        related_venue: related_venue || '',
      })
      .select()
      .single()

    if (postError) throw postError

    if (Array.isArray(tag_names) && tag_names.length > 0) {
      for (const tagName of tag_names) {
        const trimmed = String(tagName).trim()
        if (!trimmed) continue

        const { data: existingTag } = await supabase
          .from('knowledge_tags').select('id').eq('name', trimmed).maybeSingle()

        let tagId: string
        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag, error: tagErr } = await supabase
            .from('knowledge_tags').insert({ name: trimmed }).select('id').single()
          if (tagErr) continue
          tagId = newTag.id
        }
        await supabase.from('knowledge_post_tags').insert({ post_id: post.id, tag_id: tagId })
      }
    }

    // プッシュ通知（fire-and-forget）
    sendPushToAll({
      title: '📚 新しいナレッジが投稿されました',
      body: post.title,
      url: `/knowledge/${post.id}`,
      icon: '/api/pwa-icon?size=192',
    }).catch(() => {})

    return NextResponse.json({ post }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
