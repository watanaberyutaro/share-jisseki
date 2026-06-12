import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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
    const search = searchParams.get('search') || ''

    let query = supabase
      .from('knowledge_tags')
      .select('id, name')
      .order('name', { ascending: true })
      .limit(50)

    if (search) query = query.ilike('name', `%${search}%`)

    const { data: tags, error } = await query
    if (error) throw error

    return NextResponse.json({ tags: tags || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
