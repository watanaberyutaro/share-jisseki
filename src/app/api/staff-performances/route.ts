import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventIdsParam = searchParams.get('eventIds')

    if (!eventIdsParam) {
      return NextResponse.json(
        { error: 'eventIds parameter is required' },
        { status: 400 }
      )
    }

    const eventIds = eventIdsParam.split(',').filter(Boolean)

    if (eventIds.length === 0) {
      return NextResponse.json([])
    }

    // Service roleを使用してRLSをバイパス
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: staffPerformances, error } = await supabase
      .from('staff_performances')
      .select('*')
      .in('event_id', eventIds)

    if (error) {
      console.error('Error fetching staff performances:', error)
      throw error
    }

    const response = NextResponse.json(staffPerformances || [])

    // キャッシュヘッダーを設定
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    return response

  } catch (error) {
    console.error('Error in staff-performances API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff performance data' },
      { status: 500 }
    )
  }
}
