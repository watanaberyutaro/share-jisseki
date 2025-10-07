import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: performances, error } = await supabase
      .from('performances')
      .select(`
        *,
        event:events(*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    return NextResponse.json(performances || [])
  } catch (error) {
    console.error('Error fetching performances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performances' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const data = await request.json()
    
    console.log('Received data:', data)
    
    // まずイベントを作成
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: data.eventName,
        date: data.date,
        venue: data.venue,
        team: data.team,
      })
      .select()
      .single()
    
    if (eventError) {
      console.error('Event creation error:', eventError)
      console.error('Error details:', {
        message: eventError.message,
        details: eventError.details,
        hint: eventError.hint,
        code: eventError.code,
      })
      throw eventError
    }
    
    console.log('Event created successfully:', event)
    
    // 次に実績を作成
    const { data: performance, error: performanceError } = await supabase
      .from('performances')
      .insert({
        event_id: event.id,
        au_mnp_sp1: data.auMnpSp1 || 0,
        au_mnp_sp2: data.auMnpSp2 || 0,
        au_mnp_sim: data.auMnpSim || 0,
        uq_mnp_sp1: data.uqMnpSp1 || 0,
        uq_mnp_sp2: data.uqMnpSp2 || 0,
        uq_mnp_sim: data.uqMnpSim || 0,
        au_hs_sp1: data.auHsSp1 || 0,
        au_hs_sp2: data.auHsSp2 || 0,
        au_hs_sim: data.auHsSim || 0,
        uq_hs_sp1: data.uqHsSp1 || 0,
        uq_hs_sp2: data.uqHsSp2 || 0,
        uq_hs_sim: data.uqHsSim || 0,
        cell_up_sp1: data.cellUpSp1 || 0,
        cell_up_sp2: data.cellUpSp2 || 0,
        cell_up_sim: data.cellUpSim || 0,
        credit_card: data.creditCard || 0,
        gold_card: data.goldCard || 0,
        ji_bank_account: data.jiBankAccount || 0,
        warranty: data.warranty || 0,
        ott: data.ott || 0,
        electricity: data.electricity || 0,
        gas: data.gas || 0,
        network_count: data.networkCount || 0,
        notes: data.notes || null,
      })
      .select(`
        *,
        event:events(*)
      `)
      .single()
    
    if (performanceError) {
      console.error('Performance creation error:', performanceError)
      console.error('Performance error details:', {
        message: performanceError.message,
        details: performanceError.details,
        hint: performanceError.hint,
        code: performanceError.code,
      })
      throw performanceError
    }
    
    console.log('Performance created successfully:', performance)
    return NextResponse.json(performance, { status: 201 })
  } catch (error) {
    console.error('Error creating performance:', error)
    return NextResponse.json(
      { error: 'Failed to create performance' },
      { status: 500 }
    )
  }
}