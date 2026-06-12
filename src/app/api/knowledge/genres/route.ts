import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = serviceClient()
    const { data: genres, error } = await supabase
      .from('knowledge_genres')
      .select('id, name, created_at')
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ genres: genres || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = serviceClient()
    const { name, user_id } = await request.json()

    if (!name?.trim()) return NextResponse.json({ error: 'ジャンル名は必須です' }, { status: 400 })

    const { data: genre, error } = await supabase
      .from('knowledge_genres')
      .insert({ name: name.trim(), created_by: user_id || null })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'そのジャンル名はすでに存在します' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ genre }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = serviceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('user_id')

    if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', userId).maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ削除できます' }, { status: 403 })
    }

    const { error } = await supabase.from('knowledge_genres').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
