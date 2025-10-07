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

    if (data.staffPerformances && data.staffPerformances.length > 0) {
      for (const staff of data.staffPerformances) {
        const dailyTotals = staff.dailyPerformances?.reduce((acc: any, day: any) => ({
          auMnpSp1: acc.auMnpSp1 + (day.auMnpSp1 || 0),
          auMnpSp2: acc.auMnpSp2 + (day.auMnpSp2 || 0),
          auMnpSim: acc.auMnpSim + (day.auMnpSim || 0),
          uqMnpSp1: acc.uqMnpSp1 + (day.uqMnpSp1 || 0),
          uqMnpSp2: acc.uqMnpSp2 + (day.uqMnpSp2 || 0),
          uqMnpSim: acc.uqMnpSim + (day.uqMnpSim || 0),
          auHsSp1: acc.auHsSp1 + (day.auHsSp1 || 0),
          auHsSp2: acc.auHsSp2 + (day.auHsSp2 || 0),
          auHsSim: acc.auHsSim + (day.auHsSim || 0),
          uqHsSp1: acc.uqHsSp1 + (day.uqHsSp1 || 0),
          uqHsSp2: acc.uqHsSp2 + (day.uqHsSp2 || 0),
          uqHsSim: acc.uqHsSim + (day.uqHsSim || 0),
          creditCard: acc.creditCard + (day.creditCard || 0),
          goldCard: acc.goldCard + (day.goldCard || 0),
          jiBankAccount: acc.jiBankAccount + (day.jiBankAccount || 0),
          warranty: acc.warranty + (day.warranty || 0),
          ott: acc.ott + (day.ott || 0),
          electricity: acc.electricity + (day.electricity || 0),
          gas: acc.gas + (day.gas || 0),
        }), {
          auMnpSp1: 0, auMnpSp2: 0, auMnpSim: 0,
          uqMnpSp1: 0, uqMnpSp2: 0, uqMnpSim: 0,
          auHsSp1: 0, auHsSp2: 0, auHsSim: 0,
          uqHsSp1: 0, uqHsSp2: 0, uqHsSim: 0,
          creditCard: 0, goldCard: 0, jiBankAccount: 0,
          warranty: 0, ott: 0, electricity: 0, gas: 0
        })

        // 全体の合計に加算
        totalPerformance.auMnpSp1 += dailyTotals.auMnpSp1
        totalPerformance.auMnpSp2 += dailyTotals.auMnpSp2
        totalPerformance.auMnpSim += dailyTotals.auMnpSim
        totalPerformance.uqMnpSp1 += dailyTotals.uqMnpSp1
        totalPerformance.uqMnpSp2 += dailyTotals.uqMnpSp2
        totalPerformance.uqMnpSim += dailyTotals.uqMnpSim
        totalPerformance.auHsSp1 += dailyTotals.auHsSp1
        totalPerformance.auHsSp2 += dailyTotals.auHsSp2
        totalPerformance.auHsSim += dailyTotals.auHsSim
        totalPerformance.uqHsSp1 += dailyTotals.uqHsSp1
        totalPerformance.uqHsSp2 += dailyTotals.uqHsSp2
        totalPerformance.uqHsSim += dailyTotals.uqHsSim
        totalPerformance.creditCard += dailyTotals.creditCard
        totalPerformance.goldCard += dailyTotals.goldCard
        totalPerformance.jiBankAccount += dailyTotals.jiBankAccount
        totalPerformance.warranty += dailyTotals.warranty
        totalPerformance.ott += dailyTotals.ott
        totalPerformance.electricity += dailyTotals.electricity
        totalPerformance.gas += dailyTotals.gas

        // staff_performancesテーブルにスタッフごとのデータを挿入
        const staffPerformanceData = {
          event_id: eventId,
          staff_name: staff.staffName,
          au_mnp: dailyTotals.auMnpSp1 + dailyTotals.auMnpSp2 + dailyTotals.auMnpSim,
          uq_mnp: dailyTotals.uqMnpSp1 + dailyTotals.uqMnpSp2 + dailyTotals.uqMnpSim,
          au_new: dailyTotals.auHsSp1 + dailyTotals.auHsSp2 + dailyTotals.auHsSim,
          uq_new: dailyTotals.uqHsSp1 + dailyTotals.uqHsSp2 + dailyTotals.uqHsSim,
          credit_card: dailyTotals.creditCard,
          gold_card: dailyTotals.goldCard,
          ji_bank_account: dailyTotals.jiBankAccount,
          warranty: dailyTotals.warranty,
          ott: dailyTotals.ott,
          electricity: dailyTotals.electricity,
          gas: dailyTotals.gas,
        }

        const { error: staffPerformanceError } = await supabase
          .from('staff_performances')
          .insert(staffPerformanceData)

        if (staffPerformanceError) {
          console.error('Error inserting staff performance:', staffPerformanceError)
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