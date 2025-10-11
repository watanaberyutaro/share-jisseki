import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Route Segmentのキャッシュを完全に無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData()
    const eventId = params.id

    // Service roleを使用してRLSをバイパス
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // フォームデータから必要な情報を抽出
    const formDataObj: any = {}
    const photos: File[] = []

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('photo_')) {
        photos.push(value as File)
      } else {
        formDataObj[key] = value
      }
    }

    const data = JSON.parse(formDataObj.data || '{}')
    const photosToDelete = formDataObj.photosToDelete ? JSON.parse(formDataObj.photosToDelete) : []

    // イベントが存在するか確認
    const { data: existingEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // イベント基本情報を更新
    const { error: updateEventError } = await supabase
      .from('events')
      .update({
        venue: data.venue,
        agency_name: data.agencyName,
        start_date: data.startDate,
        end_date: data.endDate,
        year: data.year,
        month: data.month,
        week_number: data.weekNumber,
        include_cellup_in_hs_total: data.includeCellupInHsTotal || false,
      })
      .eq('id', eventId)

    if (updateEventError) {
      console.error('Error updating event:', updateEventError)
      throw new Error('Failed to update event')
    }

    // 既存のperformancesを削除
    const { error: deletePerformanceError } = await supabase
      .from('performances')
      .delete()
      .eq('event_id', eventId)

    if (deletePerformanceError) {
      console.error('Error deleting performances:', deletePerformanceError)
    }

    // スタッフごとの実績を集計して全体の合計を計算
    let totalPerformance = {
      auMnpSp1: 0, auMnpSp2: 0, auMnpSim: 0,
      uqMnpSp1: 0, uqMnpSp2: 0, uqMnpSim: 0,
      auHsSp1: 0, auHsSp2: 0, auHsSim: 0,
      uqHsSp1: 0, uqHsSp2: 0, uqHsSim: 0,
      cellUpSp1: 0, cellUpSp2: 0, cellUpSim: 0,
      creditCard: 0, goldCard: 0, jiBankAccount: 0,
      warranty: 0, ott: 0, electricity: 0, gas: 0
    }

    // 既存のstaff_performancesを削除
    const { error: deleteStaffError } = await supabase
      .from('staff_performances')
      .delete()
      .eq('event_id', eventId)

    if (deleteStaffError) {
      console.error('Error deleting staff performances:', deleteStaffError)
    }

    // 数値変換ヘルパー関数
    const toNumber = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0
      const num = Number(value)
      return isNaN(num) ? 0 : num
    }

    // スタッフの日別実績を保存
    if (data.staffPerformances && data.staffPerformances.length > 0) {
      for (const staff of data.staffPerformances) {
        // 日別データをループして保存
        if (staff.dailyPerformances && staff.dailyPerformances.length > 0) {
          staff.dailyPerformances.forEach((day: any, dayIndex: number) => {
            // 全体の合計に加算
            totalPerformance.auMnpSp1 += toNumber(day.auMnpSp1)
            totalPerformance.auMnpSp2 += toNumber(day.auMnpSp2)
            totalPerformance.auMnpSim += toNumber(day.auMnpSim)
            totalPerformance.uqMnpSp1 += toNumber(day.uqMnpSp1)
            totalPerformance.uqMnpSp2 += toNumber(day.uqMnpSp2)
            totalPerformance.uqMnpSim += toNumber(day.uqMnpSim)
            totalPerformance.auHsSp1 += toNumber(day.auHsSp1)
            totalPerformance.auHsSp2 += toNumber(day.auHsSp2)
            totalPerformance.auHsSim += toNumber(day.auHsSim)
            totalPerformance.uqHsSp1 += toNumber(day.uqHsSp1)
            totalPerformance.uqHsSp2 += toNumber(day.uqHsSp2)
            totalPerformance.uqHsSim += toNumber(day.uqHsSim)
            totalPerformance.cellUpSp1 += toNumber(day.cellUpSp1)
            totalPerformance.cellUpSp2 += toNumber(day.cellUpSp2)
            totalPerformance.cellUpSim += toNumber(day.cellUpSim)
            totalPerformance.creditCard += toNumber(day.creditCard)
            totalPerformance.goldCard += toNumber(day.goldCard)
            totalPerformance.jiBankAccount += toNumber(day.jiBankAccount)
            totalPerformance.warranty += toNumber(day.warranty)
            totalPerformance.ott += toNumber(day.ott)
            totalPerformance.electricity += toNumber(day.electricity)
            totalPerformance.gas += toNumber(day.gas)
          })

          // staff_performancesテーブルに日別データを挿入
          const staffDailyData = staff.dailyPerformances.map((day: any, dayIndex: number) => ({
            event_id: eventId,
            staff_name: staff.staffName,
            day_number: dayIndex + 1,
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
          }))

          const { error: staffPerformanceError } = await supabase
            .from('staff_performances')
            .insert(staffDailyData)

          if (staffPerformanceError) {
            console.error('Error inserting staff daily performances:', staffPerformanceError)
          }
        }
      }
    }

    // performancesテーブルに全体の合計データを挿入
    const performanceData = {
      event_id: eventId,
      target_hs_total: data.targetHsTotal || 0,
      target_au_mnp: data.targetAuMnp || 0,
      target_uq_mnp: data.targetUqMnp || 0,
      target_au_new: data.targetAuNew || 0,
      target_uq_new: data.targetUqNew || 0,
      au_mnp_sp1: totalPerformance.auMnpSp1,
      au_mnp_sp2: totalPerformance.auMnpSp2,
      au_mnp_sim: totalPerformance.auMnpSim,
      uq_mnp_sp1: totalPerformance.uqMnpSp1,
      uq_mnp_sp2: totalPerformance.uqMnpSp2,
      uq_mnp_sim: totalPerformance.uqMnpSim,
      au_hs_sp1: totalPerformance.auHsSp1,
      au_hs_sp2: totalPerformance.auHsSp2,
      au_hs_sim: totalPerformance.auHsSim,
      uq_hs_sp1: totalPerformance.uqHsSp1,
      uq_hs_sp2: totalPerformance.uqHsSp2,
      uq_hs_sim: totalPerformance.uqHsSim,
      cell_up_sp1: totalPerformance.cellUpSp1,
      cell_up_sp2: totalPerformance.cellUpSp2,
      cell_up_sim: totalPerformance.cellUpSim,
      credit_card: totalPerformance.creditCard,
      gold_card: totalPerformance.goldCard,
      ji_bank_account: totalPerformance.jiBankAccount,
      warranty: totalPerformance.warranty,
      ott: totalPerformance.ott,
      electricity: totalPerformance.electricity,
      gas: totalPerformance.gas,
      operation_details: data.operationDetails || '',
      preparation_details: data.preparationDetails || '',
      promotion_method: data.promotionMethod || '',
      success_case_1: data.successCase1 || '',
      success_case_2: data.successCase2 || '',
      challenges_and_solutions: data.challengesAndSolutions || '',
    }

    console.log('Performance data being inserted:', performanceData)

    const { data: insertedPerformance, error: performanceError } = await supabase
      .from('performances')
      .insert(performanceData)
      .select()

    if (performanceError) {
      console.error('Error inserting performance:', performanceError)
      throw new Error('Failed to update performance')
    }

    console.log('Performance data successfully inserted:', insertedPerformance)

    // 削除する写真がある場合は削除
    if (photosToDelete.length > 0) {
      for (const photoId of photosToDelete) {
        // データベースから写真の情報を取得
        const { data: photoData, error: photoFetchError } = await supabase
          .from('event_photos')
          .select('file_path')
          .eq('id', photoId)
          .single()

        if (!photoFetchError && photoData) {
          // Storageから写真を削除
          const { error: storageDeleteError } = await supabase.storage
            .from('event-photos')
            .remove([photoData.file_path])

          if (storageDeleteError) {
            console.error('Error deleting photo from storage:', storageDeleteError)
          }

          // データベースから写真レコードを削除
          const { error: dbDeleteError } = await supabase
            .from('event_photos')
            .delete()
            .eq('id', photoId)

          if (dbDeleteError) {
            console.error('Error deleting photo record:', dbDeleteError)
          }
        }
      }
    }

    // 新しい写真がある場合はアップロード
    if (photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${eventId}/${Date.now()}_${i}.${fileExt}`

        // Storageにファイルをアップロード（キャッシュを短時間に設定）
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, file, {
            cacheControl: '0',  // キャッシュを無効化
            upsert: false,
            contentType: file.type
          })

        if (uploadError) {
          console.error('Error uploading photo:', uploadError)
          continue
        }

        // データベースに写真情報を保存（統一されたスキーマを使用）
        const { error: photoError } = await supabase
          .from('event_photos')
          .insert({
            event_id: eventId,
            filename: fileName,
            original_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            upload_order: i
          })

        if (photoError) {
          console.error('Error saving photo record:', photoError)
        }
      }
    }

    return NextResponse.json({
      eventId,
      message: 'Performance updated successfully',
    })

  } catch (error) {
    console.error('Error updating performance:', error)
    return NextResponse.json(
      { error: 'Failed to update performance' },
      { status: 500 }
    )
  }
}