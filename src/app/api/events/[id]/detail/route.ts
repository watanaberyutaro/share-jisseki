import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Route Segmentのキャッシュを完全に無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Service roleを使用してRLSをバイパス
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const eventId = params.id

    // イベントの基本情報を取得
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        venue,
        agency_name,
        start_date,
        end_date,
        year,
        month,
        week_number,
        created_at
      `)
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Event fetch error:', eventError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // パフォーマンス情報を取得
    const { data: performances, error: perfError } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId)

    if (perfError) {
      console.error('Performance fetch error:', perfError)
    }

    // スタッフの日別パフォーマンスを取得（複数のテーブルをチェック）
    let staffDailyPerformances = []
    
    // まずstaff_daily_performancesから取得を試行
    const { data: dailyData, error: dailyError } = await supabase
      .from('staff_daily_performances')
      .select('*')
      .eq('event_id', eventId)
      
    if (!dailyError && dailyData && dailyData.length > 0) {
      staffDailyPerformances = dailyData
    } else {
      console.log('Daily performances error or empty:', dailyError)
      
      // staff_daily_performancesで取得できない場合、staff_performancesから取得
      const { data: staffData, error: staffError } = await supabase
        .from('staff_performances') 
        .select('*')
        .eq('event_id', eventId)
        
      if (!staffError && staffData) {
        staffDailyPerformances = staffData
      } else {
        console.error('Staff performance fetch error:', staffError)
      }
    }

    // 写真を取得（デバッグモード）
    console.log(`Fetching photos for event_id: ${eventId}`)
    
    const { data: photos, error: photoError } = await supabase
      .from('event_photos')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    console.log('Photo query result:', { 
      data: photos, 
      error: photoError,
      eventId,
      dataLength: photos?.length || 0
    })

    if (photoError) {
      console.error('Photo fetch error details:', photoError)
    }

    // パフォーマンスデータを集計（実際のカラム名を使用）
    let totalPerformances = {
      target_hs_total: 0,
      target_au_mnp: 0,
      target_uq_mnp: 0,
      target_au_new: 0,
      target_uq_new: 0,
      actual_hs_total: 0,
      actual_au_mnp: 0,
      actual_uq_mnp: 0,
      actual_au_new: 0,
      actual_uq_new: 0,
      operation_details: '',
      preparation_details: '',
      promotion_method: '',
      success_case_1: '',
      success_case_2: '',
      challenges_and_solutions: ''
    }

    if (performances && performances.length > 0) {
      totalPerformances = performances.reduce((acc, perf) => {
        // MNPの計算（SP1, SP2, SIM）
        const auMnpTotal = (Number(perf.au_mnp_sp1) || 0) + (Number(perf.au_mnp_sp2) || 0) + (Number(perf.au_mnp_sim) || 0)
        const uqMnpTotal = (Number(perf.uq_mnp_sp1) || 0) + (Number(perf.uq_mnp_sp2) || 0) + (Number(perf.uq_mnp_sim) || 0)
        
        // 新規の計算（HS総販）
        const auNewTotal = (Number(perf.au_hs_sp1) || 0) + (Number(perf.au_hs_sp2) || 0) + (Number(perf.au_hs_sim) || 0)
        const uqNewTotal = (Number(perf.uq_hs_sp1) || 0) + (Number(perf.uq_hs_sp2) || 0) + (Number(perf.uq_hs_sim) || 0)
        
        // HS総販の計算
        const hsTotal = auMnpTotal + uqMnpTotal + auNewTotal + uqNewTotal

        return {
          target_hs_total: acc.target_hs_total + (Number(perf.target_hs_total) || 0),
          target_au_mnp: acc.target_au_mnp + (Number(perf.target_au_mnp) || 0),
          target_uq_mnp: acc.target_uq_mnp + (Number(perf.target_uq_mnp) || 0),
          target_au_new: acc.target_au_new + (Number(perf.target_au_new) || 0),
          target_uq_new: acc.target_uq_new + (Number(perf.target_uq_new) || 0),
          actual_hs_total: acc.actual_hs_total + hsTotal,
          actual_au_mnp: acc.actual_au_mnp + auMnpTotal,
          actual_uq_mnp: acc.actual_uq_mnp + uqMnpTotal,
          actual_au_new: acc.actual_au_new + auNewTotal,
          actual_uq_new: acc.actual_uq_new + uqNewTotal,
          operation_details: perf.operation_details || acc.operation_details,
          preparation_details: perf.preparation_details || acc.preparation_details,
          promotion_method: perf.promotion_method || acc.promotion_method,
          success_case_1: perf.success_case_1 || acc.success_case_1,
          success_case_2: perf.success_case_2 || acc.success_case_2,
          challenges_and_solutions: perf.challenges_and_solutions || acc.challenges_and_solutions
        }
      }, {
        target_hs_total: 0,
        target_au_mnp: 0,
        target_uq_mnp: 0,
        target_au_new: 0,
        target_uq_new: 0,
        actual_hs_total: 0,
        actual_au_mnp: 0,
        actual_uq_mnp: 0,
        actual_au_new: 0,
        actual_uq_new: 0,
        operation_details: '',
        preparation_details: '',
        promotion_method: '',
        success_case_1: '',
        success_case_2: '',
        challenges_and_solutions: ''
      })
    }

    // 写真のURLを正しく生成する（キャッシュバスティング付き）
    const photosWithUrls = photos?.map(photo => {
      // Supabase Storageの公開URLを生成
      const publicUrl = supabase.storage
        .from('event-photos')
        .getPublicUrl(photo.file_path)

      // キャッシュバスティングのためのタイムスタンプを追加
      const urlWithCacheBust = `${publicUrl.data.publicUrl}?t=${Date.now()}`

      return {
        id: photo.id,
        file_url: urlWithCacheBust,
        file_name: photo.filename || photo.original_name || 'photo',
        description: '',
        created_at: photo.created_at
      }
    }) || []

    // スタッフごとの日別実績を集計
    const staffAggregated = {}
    if (staffDailyPerformances && staffDailyPerformances.length > 0) {
      staffDailyPerformances.forEach(daily => {
        const staffName = daily.staff_name
        if (!staffAggregated[staffName]) {
          staffAggregated[staffName] = {
            staff_name: staffName,
            au_mnp: 0,
            uq_mnp: 0,
            au_new: 0,
            uq_new: 0,
            credit_card: 0,
            gold_card: 0,
            ji_bank_account: 0,
            warranty: 0,
            ott: 0,
            electricity: 0,
            gas: 0
          }
        }
        
        const staff = staffAggregated[staffName]
        // MNPの集計
        staff.au_mnp += (Number(daily.au_mnp_sp1) || 0) + (Number(daily.au_mnp_sp2) || 0) + (Number(daily.au_mnp_sim) || 0)
        staff.uq_mnp += (Number(daily.uq_mnp_sp1) || 0) + (Number(daily.uq_mnp_sp2) || 0) + (Number(daily.uq_mnp_sim) || 0)
        // 新規の集計
        staff.au_new += (Number(daily.au_hs_sp1) || 0) + (Number(daily.au_hs_sp2) || 0) + (Number(daily.au_hs_sim) || 0)
        staff.uq_new += (Number(daily.uq_hs_sp1) || 0) + (Number(daily.uq_hs_sp2) || 0) + (Number(daily.uq_hs_sim) || 0)
        // LTV系の集計
        staff.credit_card += (Number(daily.credit_card) || 0)
        staff.gold_card += (Number(daily.gold_card) || 0)
        staff.ji_bank_account += (Number(daily.ji_bank_account) || 0)
        staff.warranty += (Number(daily.warranty) || 0)
        staff.ott += (Number(daily.ott) || 0)
        staff.electricity += (Number(daily.electricity) || 0)
        staff.gas += (Number(daily.gas) || 0)
      })
    }

    const formattedStaffPerformances = Object.values(staffAggregated)

    // テキスト項目を取得（最初のパフォーマンスレコードから）
    const textFields = performances && performances.length > 0 ? {
      operation_details: performances[0].operation_details,
      preparation_details: performances[0].preparation_details,
      promotion_method: performances[0].promotion_method,
      success_case_1: performances[0].success_case_1,
      success_case_2: performances[0].success_case_2,
      challenges_and_solutions: performances[0].challenges_and_solutions
    } : {}

    const eventDetail = {
      ...event,
      ...totalPerformances,
      ...textFields,
      staff_performances: formattedStaffPerformances,
      photos: photosWithUrls
    }

    console.log('Event detail being returned:', {
      eventId,
      event,
      performances: performances,
      totalPerformances,
      textFields,
      finalEventDetail: eventDetail
    })

    const response = NextResponse.json(eventDetail)

    // キャッシュを無効化して常に最新データを取得
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}