import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const data = await request.json()
    
    console.log('Received enhanced form data:', data)
    
    // トランザクション的な処理のためにまずイベントを作成
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: data.eventName,
        venue: data.venue,
        agency_name: data.agencyName,
        start_date: data.startDate,
        end_date: data.endDate,
        year: data.year,
        month: data.month,
        week_number: data.weekNumber,
      })
      .select()
      .single()
    
    if (eventError) {
      console.error('Event creation error:', eventError)
      throw eventError
    }
    
    console.log('Event created successfully:', event)
    
    // 全体の実績データを保存
    const { data: performance, error: performanceError } = await supabase
      .from('performances')
      .insert({
        event_id: event.id,
        target_hs_total: data.targetHsTotal || 0,
        target_au_mnp: data.targetAuMnp || 0,
        target_uq_mnp: data.targetUqMnp || 0,
        target_au_new: data.targetAuNew || 0,
        target_uq_new: data.targetUqNew || 0,
        operation_details: data.operationDetails || null,
        preparation_details: data.preparationDetails || null,
        promotion_method: data.promotionMethod || null,
        success_case_1: data.successCase1 || null,
        success_case_2: data.successCase2 || null,
        challenges_and_solutions: data.challengesAndSolutions || null,
        // 各スタッフの合計値を集計
        au_mnp_sp1: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.auMnpSp1 || 0), 0),
        au_mnp_sp2: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.auMnpSp2 || 0), 0),
        au_mnp_sim: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.auMnpSim || 0), 0),
        uq_mnp_sp1: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.uqMnpSp1 || 0), 0),
        uq_mnp_sp2: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.uqMnpSp2 || 0), 0),
        uq_mnp_sim: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.uqMnpSim || 0), 0),
        au_hs_sp1: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.auHsSp1 || 0), 0),
        au_hs_sp2: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.auHsSp2 || 0), 0),
        au_hs_sim: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.auHsSim || 0), 0),
        uq_hs_sp1: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.uqHsSp1 || 0), 0),
        uq_hs_sp2: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.uqHsSp2 || 0), 0),
        uq_hs_sim: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.uqHsSim || 0), 0),
        cell_up_sp1: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.cellUpSp1 || 0), 0),
        cell_up_sp2: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.cellUpSp2 || 0), 0),
        cell_up_sim: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.cellUpSim || 0), 0),
        credit_card: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.creditCard || 0), 0),
        gold_card: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.goldCard || 0), 0),
        ji_bank_account: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.jiBankAccount || 0), 0),
        warranty: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.warranty || 0), 0),
        ott: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.ott || 0), 0),
        electricity: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.electricity || 0), 0),
        gas: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.gas || 0), 0),
        network_count: data.staffPerformances.reduce((sum: number, staff: any) => sum + (staff.networkCount || 0), 0),
      })
      .select()
      .single()
    
    if (performanceError) {
      console.error('Performance creation error:', performanceError)
      throw performanceError
    }
    
    console.log('Performance created successfully:', performance)
    
    // スタッフ個別実績を保存
    const staffData = data.staffPerformances.map((staff: any) => ({
      event_id: event.id,
      staff_name: staff.staffName,
      au_mnp_sp1: staff.auMnpSp1 || 0,
      au_mnp_sp2: staff.auMnpSp2 || 0,
      au_mnp_sim: staff.auMnpSim || 0,
      uq_mnp_sp1: staff.uqMnpSp1 || 0,
      uq_mnp_sp2: staff.uqMnpSp2 || 0,
      uq_mnp_sim: staff.uqMnpSim || 0,
      au_hs_sp1: staff.auHsSp1 || 0,
      au_hs_sp2: staff.auHsSp2 || 0,
      au_hs_sim: staff.auHsSim || 0,
      uq_hs_sp1: staff.uqHsSp1 || 0,
      uq_hs_sp2: staff.uqHsSp2 || 0,
      uq_hs_sim: staff.uqHsSim || 0,
      cell_up_sp1: staff.cellUpSp1 || 0,
      cell_up_sp2: staff.cellUpSp2 || 0,
      cell_up_sim: staff.cellUpSim || 0,
      credit_card: staff.creditCard || 0,
      gold_card: staff.goldCard || 0,
      ji_bank_account: staff.jiBankAccount || 0,
      warranty: staff.warranty || 0,
      ott: staff.ott || 0,
      electricity: staff.electricity || 0,
      gas: staff.gas || 0,
      network_count: staff.networkCount || 0,
    }))
    
    const { data: staffPerformances, error: staffError } = await supabase
      .from('staff_performances')
      .insert(staffData)
      .select()
    
    if (staffError) {
      console.error('Staff performances creation error:', staffError)
      throw staffError
    }
    
    console.log('Staff performances created successfully:', staffPerformances)
    
    return NextResponse.json({
      event,
      performance,
      staffPerformances,
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating enhanced performance:', error)
    return NextResponse.json(
      { error: 'Failed to create performance data' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // イベントと関連データを取得
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        performances(*),
        staff_performances(*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching events:', error)
      throw error
    }
    
    return NextResponse.json(events || [])
    
  } catch (error) {
    console.error('Error fetching enhanced performances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}