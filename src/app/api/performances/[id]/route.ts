import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mnpIdContractToDb, isIdCalculationEnabled } from '@/lib/mnp-id-calculator'
import { uploadEventPhotos, deleteEventPhoto } from '@/lib/supabase/storage'

// Route Segmentのキャッシュを完全に無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 大きな画像ファイルをアップロードできるように最大実行時間を設定
export const maxDuration = 60 // 最大60秒
export const runtime = 'nodejs'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData()
    const eventId = params.id

    console.log('=== PUT Request Debug ===')
    console.log('Event ID:', eventId)
    console.log('FormData keys:', Array.from(formData.keys()))

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

    console.log('FormData object keys:', Object.keys(formDataObj))
    console.log('Photos count:', photos.length)

    const data = JSON.parse(formDataObj.data || '{}')
    const photosToDelete = formDataObj.photosToDelete ? JSON.parse(formDataObj.photosToDelete) : []

    console.log('Parsed data keys:', Object.keys(data))
    console.log('Staff performances count:', data.staffPerformances?.length)
    console.log('Photos to delete:', photosToDelete)

    // 数値変換ヘルパー関数
    const toNumber = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0
      const num = Number(value)
      return isNaN(num) ? 0 : num
    }

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
        agency_tier: data.agencyTier || null,
        event_type: data.eventType || null,
        start_date: data.startDate,
        end_date: data.endDate,
        year: toNumber(data.year),
        month: toNumber(data.month),
        week_number: toNumber(data.weekNumber),
        include_cellup_in_hs_total: data.includeCellupInHsTotal || false,
      })
      .eq('id', eventId)

    if (updateEventError) {
      console.error('Error updating event:', updateEventError)
      return NextResponse.json(
        { error: 'Failed to update event', details: updateEventError.message },
        { status: 500 }
      )
    }

    console.log('Event updated successfully')

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
      warranty: 0, ott: 0, electricity: 0, gas: 0, networkCount: 0
    }

    // 既存のstaff_performancesとMNP ID契約を削除
    // まず、既存のstaff_performancesのIDを取得
    const { data: existingStaffPerfs } = await supabase
      .from('staff_performances')
      .select('id')
      .eq('event_id', eventId)

    // MNP ID契約を削除（staff_performance_idに依存）
    if (existingStaffPerfs && existingStaffPerfs.length > 0) {
      const staffPerfIds = existingStaffPerfs.map((sp: any) => sp.id)
      const { error: deleteMnpError } = await supabase
        .from('mnp_id_contracts')
        .delete()
        .in('staff_performance_id', staffPerfIds)

      if (deleteMnpError) {
        console.error('Error deleting MNP ID contracts:', deleteMnpError)
      }
    }

    // staff_performancesを削除
    const { error: deleteStaffError } = await supabase
      .from('staff_performances')
      .delete()
      .eq('event_id', eventId)

    if (deleteStaffError) {
      console.error('Error deleting staff performances:', deleteStaffError)
    }

    console.log('Existing data deleted successfully')

    // スタッフの日別実績を保存
    const allStaffPerformances: any[] = []
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
            totalPerformance.networkCount += toNumber(day.networkCount)
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

          const { data: insertedStaffPerformances, error: staffPerformanceError } = await supabase
            .from('staff_performances')
            .insert(staffDailyData)
            .select()

          if (staffPerformanceError) {
            console.error('Error inserting staff daily performances:', staffPerformanceError)
          } else if (insertedStaffPerformances) {
            allStaffPerformances.push(...insertedStaffPerformances)
          }
        }
      }
    }

    // performancesテーブルに全体の合計データを挿入
    const performanceData = {
      event_id: eventId,
      target_hs_total: toNumber(data.targetHsTotal),
      target_au_mnp: toNumber(data.targetAuMnp),
      target_uq_mnp: toNumber(data.targetUqMnp),
      target_au_new: toNumber(data.targetAuNew),
      target_uq_new: toNumber(data.targetUqNew),
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
      network_count: totalPerformance.networkCount,
      operation_details: data.operationDetails || null,
      preparation_details: data.preparationDetails || null,
      promotion_method: data.promotionMethod || null,
      success_case_1: data.successCase1 || null,
      success_case_2: data.successCase2 || null,
      challenges_and_solutions: data.challengesAndSolutions || null,
    }

    console.log('Performance data being inserted:', performanceData)

    const { data: insertedPerformance, error: performanceError } = await supabase
      .from('performances')
      .insert(performanceData)
      .select()

    if (performanceError) {
      console.error('Error inserting performance:', performanceError)
      return NextResponse.json(
        { error: 'Failed to update performance', details: performanceError.message },
        { status: 500 }
      )
    }

    console.log('Performance data successfully inserted:', insertedPerformance)

    // MNP ID契約を保存（2026-06-02以降のイベントのみ）
    if (isIdCalculationEnabled(data.startDate)) {
      console.log('=== MNP ID契約処理開始 ===')
      console.log('Start Date:', data.startDate)
      console.log('Staff Performances:', data.staffPerformances?.length)

      const mnpIdContractsData: any[] = []

      data.staffPerformances.forEach((staff: any, staffIdx: number) => {
        console.log(`Staff ${staffIdx}:`, staff.staffName)
        console.log(`  Daily performances:`, staff.dailyPerformances?.length)

        staff.dailyPerformances.forEach((day: any, dayIndex: number) => {
          console.log(`    Day ${dayIndex + 1}:`)
          console.log(`      mnpIdContracts exists:`, !!day.mnpIdContracts)
          console.log(`      mnpIdContracts length:`, day.mnpIdContracts?.length || 0)

          // この日のスタッフ実績IDを取得
          const staffPerformance = allStaffPerformances.find(
            (sp: any) =>
              sp.staff_name === staff.staffName &&
              sp.day_number === dayIndex + 1
          )

          if (!staffPerformance) {
            console.log(`      Warning: Staff performance not found for ${staff.staffName}, day ${dayIndex + 1}`)
          }

          if (staffPerformance && day.mnpIdContracts && day.mnpIdContracts.length > 0) {
            console.log(`      Adding ${day.mnpIdContracts.length} MNP ID contracts`)
            // MNP ID契約を追加
            day.mnpIdContracts.forEach((contract: any) => {
              const dbContract = mnpIdContractToDb(contract)
              mnpIdContractsData.push({
                staff_performance_id: staffPerformance.id,
                ...dbContract
              })
            })
          }
        })
      })

      console.log('Total MNP ID contracts to insert:', mnpIdContractsData.length)

      if (mnpIdContractsData.length > 0) {
        console.log('Inserting MNP ID contracts...')
        const { data: mnpContracts, error: mnpError } = await supabase
          .from('mnp_id_contracts')
          .insert(mnpIdContractsData)
          .select()

        if (mnpError) {
          console.error('MNP ID contracts creation error:', mnpError)
          console.error('Error details:', {
            message: mnpError.message,
            code: mnpError.code,
            details: mnpError.details,
            hint: mnpError.hint
          })
          // MNP ID契約のエラーは警告として扱い、実績データは保存する
        } else {
          console.log('MNP ID contracts created successfully:', mnpContracts?.length || 0)
        }
      } else {
        console.log('No MNP ID contracts to insert (empty array)')
      }
    } else {
      console.log('MNP ID calculation not enabled for this event date:', data.startDate)
    }

    // 削除する写真がある場合は削除
    if (photosToDelete.length > 0) {
      for (const photoId of photosToDelete) {
        try {
          // データベースから写真の情報を取得
          const { data: photoData, error: photoFetchError } = await supabase
            .from('event_photos')
            .select('file_path')
            .eq('id', photoId)
            .single()

          if (!photoFetchError && photoData) {
            // Storageから写真を削除
            await deleteEventPhoto(photoData.file_path)

            // データベースから写真レコードを削除
            const { error: dbDeleteError } = await supabase
              .from('event_photos')
              .delete()
              .eq('id', photoId)

            if (dbDeleteError) {
              console.error('Error deleting photo record:', dbDeleteError)
            }
          }
        } catch (error) {
          console.error(`Error deleting photo ${photoId}:`, error)
        }
      }
    }

    // 新しい写真がある場合はアップロード
    let uploadedPhotos = []
    if (photos.length > 0) {
      try {
        console.log(`Uploading ${photos.length} photos for event ${eventId}`)
        const photoUploadResult = await uploadEventPhotos(eventId, photos)
        uploadedPhotos = photoUploadResult.photos
        console.log('Photos uploaded successfully:', uploadedPhotos.length)
      } catch (photoError) {
        console.error('Photo upload failed:', photoError)
        // 写真アップロードのエラーは警告として扱い、実績データは保存する
      }
    }

    return NextResponse.json({
      success: true,
      eventId,
      uploadedPhotos,
      message: `実績が正常に更新されました${uploadedPhotos.length > 0 ? `（写真${uploadedPhotos.length}枚を含む）` : ''}`
    })

  } catch (error) {
    console.error('Error updating performance:', error)
    return NextResponse.json(
      { error: 'Failed to update performance' },
      { status: 500 }
    )
  }
}