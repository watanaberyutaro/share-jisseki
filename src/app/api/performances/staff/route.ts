import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Service roleを使用してRLSをバイパス
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // スタッフ実績データを取得（イベント情報も含む）
    const { data: staffPerformances, error } = await supabase
      .from('staff_performances')
      .select(`
        *,
        event:events (
          id,
          year,
          month,
          week_number,
          venue,
          agency_name,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching staff performances:', error)
      throw error
    }

    const response = NextResponse.json(staffPerformances || [])

    // キャッシュヘッダーを設定（60秒キャッシュ）
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    return response

  } catch (error) {
    console.error('Error fetching staff performances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff performance data' },
      { status: 500 }
    )
  }
}
