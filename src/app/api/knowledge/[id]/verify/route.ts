import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_STATUSES = ['unverified', 'under_review', 'verified', 'returned', 'expired']

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = serviceClient()
    const { status, verification_method, verification_comment, user_name } = await request.json()

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: '無効なステータスです' }, { status: 400 })
    }

    const updateData: Record<string, any> = { status }
    if (status === 'verified') {
      updateData.verified_by_name = user_name || 'unknown'
      updateData.verified_at = new Date().toISOString()
    }
    if (verification_method  !== undefined) updateData.verification_method  = verification_method
    if (verification_comment !== undefined) updateData.verification_comment = verification_comment

    const { data: updated, error } = await supabase
      .from('knowledge_posts').update(updateData).eq('id', params.id).select().single()

    if (error) throw error
    return NextResponse.json({ post: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
