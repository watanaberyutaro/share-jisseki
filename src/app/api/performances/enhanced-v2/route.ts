import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadEventPhotos } from '@/lib/supabase/storage'

export async function POST(request: NextRequest) {
  try {
    // Service roleを使用してRLSをバイパス
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // FormDataから実績データを取得
    const formData = await request.formData()
    const jsonData = formData.get('data') as string
    
    if (!jsonData) {
      throw new Error('データが見つかりません')
    }
    
    const data = JSON.parse(jsonData)
    console.log('Received enhanced v2 form data:', JSON.stringify(data, null, 2))
    console.log('Staff performances structure:', data.staffPerformances?.map((staff: any, index: number) => ({
      index,
      staffName: staff.staffName,
      dailyPerformancesCount: staff.dailyPerformances?.length,
      firstDayData: staff.dailyPerformances?.[0]
    })))
    
    // 写真ファイルを処理
    const photos: File[] = []
    for (let i = 0; i < 5; i++) {
      const photo = formData.get(`photo_${i}`) as File
      console.log(`Checking photo_${i}:`, {
        exists: !!photo,
        name: photo?.name || 'N/A',
        size: photo?.size || 'N/A',
        type: photo?.type || 'N/A'
      })
      
      if (photo && photo.name && photo.size > 0) {
        photos.push(photo)
      }
    }
    console.log('Valid photos found:', photos.length)
    
    // FormDataの全キーをログ出力（デバッグ用）
    console.log('All FormData keys:', Array.from(formData.keys()))
    
    // 数値変換ヘルパー関数
    const toNumber = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0
      const num = Number(value)
      return isNaN(num) ? 0 : num
    }
    
    // イベントを作成（イベント名なし）
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        venue: data.venue,
        agency_name: data.agencyName,
        start_date: data.startDate,
        end_date: data.endDate,
        year: toNumber(data.year),
        month: toNumber(data.month),
        week_number: toNumber(data.weekNumber),
      })
      .select()
      .single()
    
    if (eventError) {
      console.error('Event creation error:', {
        error: eventError,
        attemptedData: {
          venue: data.venue,
          agency_name: data.agencyName,
          start_date: data.startDate,
          end_date: data.endDate,
          year: toNumber(data.year),
          month: toNumber(data.month),
          week_number: toNumber(data.weekNumber),
        }
      })
      throw new Error(`Event creation failed: ${eventError.message || eventError}`)
    }
    
    console.log('Event created successfully:', event)
    
    // 全体の実績データを保存（スタッフの日別実績を集計）
    const aggregatedPerformances = data.staffPerformances.reduce((acc: any, staff: any) => {
      staff.dailyPerformances.forEach((day: any) => {
        acc.au_mnp_sp1 += toNumber(day.auMnpSp1)
        acc.au_mnp_sp2 += toNumber(day.auMnpSp2)
        acc.au_mnp_sim += toNumber(day.auMnpSim)
        acc.uq_mnp_sp1 += toNumber(day.uqMnpSp1)
        acc.uq_mnp_sp2 += toNumber(day.uqMnpSp2)
        acc.uq_mnp_sim += toNumber(day.uqMnpSim)
        acc.au_hs_sp1 += toNumber(day.auHsSp1)
        acc.au_hs_sp2 += toNumber(day.auHsSp2)
        acc.au_hs_sim += toNumber(day.auHsSim)
        acc.uq_hs_sp1 += toNumber(day.uqHsSp1)
        acc.uq_hs_sp2 += toNumber(day.uqHsSp2)
        acc.uq_hs_sim += toNumber(day.uqHsSim)
        acc.cell_up_sp1 += toNumber(day.cellUpSp1)
        acc.cell_up_sp2 += toNumber(day.cellUpSp2)
        acc.cell_up_sim += toNumber(day.cellUpSim)
        acc.credit_card += toNumber(day.creditCard)
        acc.gold_card += toNumber(day.goldCard)
        acc.ji_bank_account += toNumber(day.jiBankAccount)
        acc.warranty += toNumber(day.warranty)
        acc.ott += toNumber(day.ott)
        acc.electricity += toNumber(day.electricity)
        acc.gas += toNumber(day.gas)
        acc.network_count += toNumber(day.networkCount)
      })
      return acc
    }, {
      au_mnp_sp1: 0, au_mnp_sp2: 0, au_mnp_sim: 0,
      uq_mnp_sp1: 0, uq_mnp_sp2: 0, uq_mnp_sim: 0,
      au_hs_sp1: 0, au_hs_sp2: 0, au_hs_sim: 0,
      uq_hs_sp1: 0, uq_hs_sp2: 0, uq_hs_sim: 0,
      cell_up_sp1: 0, cell_up_sp2: 0, cell_up_sim: 0,
      credit_card: 0, gold_card: 0, ji_bank_account: 0,
      warranty: 0, ott: 0, electricity: 0, gas: 0,
      network_count: 0
    })
    
    const { data: performance, error: performanceError } = await supabase
      .from('performances')
      .insert({
        event_id: event.id,
        target_hs_total: toNumber(data.targetHsTotal),
        target_au_mnp: toNumber(data.targetAuMnp),
        target_uq_mnp: toNumber(data.targetUqMnp),
        target_au_new: toNumber(data.targetAuNew),
        target_uq_new: toNumber(data.targetUqNew),
        operation_details: data.operationDetails || null,
        preparation_details: data.preparationDetails || null,
        promotion_method: data.promotionMethod || null,
        success_case_1: data.successCase1 || null,
        success_case_2: data.successCase2 || null,
        challenges_and_solutions: data.challengesAndSolutions || null,
        ...aggregatedPerformances,
      })
      .select()
      .single()
    
    if (performanceError) {
      console.error('Performance creation error:', {
        error: performanceError,
        attemptedData: {
          event_id: event.id,
          target_hs_total: toNumber(data.targetHsTotal),
          target_au_mnp: toNumber(data.targetAuMnp),
          target_uq_mnp: toNumber(data.targetUqMnp),
          target_au_new: toNumber(data.targetAuNew),
          target_uq_new: toNumber(data.targetUqNew),
          aggregatedPerformances
        }
      })
      throw new Error(`Performance creation failed: ${performanceError.message || performanceError}`)
    }
    
    console.log('Performance created successfully:', performance)
    
    // スタッフの日別実績を保存
    const staffDailyData: any[] = []
    
    data.staffPerformances.forEach((staff: any, staffIndex: number) => {
      staff.dailyPerformances.forEach((day: any, dayIndex: number) => {
        staffDailyData.push({
          event_id: event.id,
          staff_name: staff.staffName,
          day_number: dayIndex + 1, // 1日目、2日目...
          au_mnp_sp1: toNumber(day.auMnpSp1),
          au_mnp_sp2: toNumber(day.auMnpSp2),
          au_mnp_sim: toNumber(day.auMnpSim),
          uq_mnp_sp1: toNumber(day.uqMnpSp1),
          uq_mnp_sp2: toNumber(day.uqMnpSp2),
          uq_mnp_sim: toNumber(day.uqMnpSim),
          au_hs_sp1: toNumber(day.auHsSp1),
          au_hs_sp2: toNumber(day.auHsSp2),
          au_hs_sim: toNumber(day.auHsSim),
          uq_hs_sp1: toNumber(day.uqHsSp1),
          uq_hs_sp2: toNumber(day.uqHsSp2),
          uq_hs_sim: toNumber(day.uqHsSim),
          cell_up_sp1: toNumber(day.cellUpSp1),
          cell_up_sp2: toNumber(day.cellUpSp2),
          cell_up_sim: toNumber(day.cellUpSim),
          credit_card: toNumber(day.creditCard),
          gold_card: toNumber(day.goldCard),
          ji_bank_account: toNumber(day.jiBankAccount),
          warranty: toNumber(day.warranty),
          ott: toNumber(day.ott),
          electricity: toNumber(day.electricity),
          gas: toNumber(day.gas),
          network_count: toNumber(day.networkCount),
        })
      })
    })
    
    const { data: staffPerformances, error: staffError } = await supabase
      .from('staff_performances')
      .insert(staffDailyData)
      .select()
    
    if (staffError) {
      console.error('Staff performances creation error:', {
        error: staffError,
        attemptedDataCount: staffDailyData.length,
        sampleData: staffDailyData.slice(0, 2)
      })
      throw new Error(`Staff performances creation failed: ${staffError.message || staffError}`)
    }
    
    console.log('Staff daily performances created successfully:', staffPerformances)
    
    // 写真がある場合はアップロード
    let uploadedPhotos = []
    if (photos.length > 0) {
      try {
        console.log(`Uploading ${photos.length} photos for event ${event.id}`)
        console.log('Photos to upload:', photos.map(p => ({ name: p.name, size: p.size, type: p.type })))
        
        const photoUploadResult = await uploadEventPhotos(event.id, photos)
        uploadedPhotos = photoUploadResult.photos
        console.log('Photos uploaded successfully:', uploadedPhotos.length)
        console.log('Upload result:', photoUploadResult)
      } catch (photoError) {
        console.error('Photo upload failed:', {
          error: photoError,
          message: photoError instanceof Error ? photoError.message : 'Unknown error',
          stack: photoError instanceof Error ? photoError.stack : undefined
        })
        // 写真アップロードのエラーは警告として扱い、実績データは保存する
      }
    } else {
      console.log('No photos to upload')
    }
    
    return NextResponse.json({
      success: true,
      event,
      performance,
      staffPerformances,
      uploadedPhotos,
      eventId: event.id,
      message: `実績が正常に保存されました${uploadedPhotos.length > 0 ? `（写真${uploadedPhotos.length}枚を含む）` : ''}`
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating enhanced v2 performance:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to create performance data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Service roleを使用してRLSをバイパス
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // ビューを使用してイベントデータを取得
    const { data: events, error } = await supabase
      .from('event_summary')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching event summary:', error)
      throw error
    }
    
    const response = NextResponse.json(events || [])

    // キャッシュヘッダーを設定（60秒キャッシュ）
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    return response
    
  } catch (error) {
    console.error('Error fetching enhanced v2 performances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}