import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { searchParams } = new URL(request.url)

    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const agencyTier = searchParams.get('agencyTier')

    // eventsテーブルから2026-06-02以降のイベントを取得（年・月・商流フィルターをクエリで適用）
    let eventsQuery = supabase
      .from('events')
      .select('id, start_date, year, month, agency_tier')
      .gte('start_date', '2026-06-02')
      .order('start_date', { ascending: false })

    if (year && year !== 'all') eventsQuery = eventsQuery.eq('year', parseInt(year))
    if (month && month !== 'all') eventsQuery = eventsQuery.eq('month', parseInt(month))
    if (agencyTier && agencyTier !== 'all') eventsQuery = eventsQuery.eq('agency_tier', agencyTier)

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json([])
    }

    const eventIds = events.map(e => e.id)

    // staff_performancesを取得（event_idでリンク）
    const { data: staffPerformances, error: staffError } = await supabase
      .from('staff_performances')
      .select('id, staff_name, event_id')
      .in('event_id', eventIds)

    if (staffError) {
      console.error('Error fetching staff_performances:', staffError)
      return NextResponse.json({ error: 'Failed to fetch staff performances' }, { status: 500 })
    }

    if (!staffPerformances || staffPerformances.length === 0) {
      return NextResponse.json([])
    }

    const staffPerfIds = staffPerformances.map(sp => sp.id)

    // mnp_id_contractsを取得（staff_performance_idでリンク）
    const { data: contracts, error: contractsError } = await supabase
      .from('mnp_id_contracts')
      .select('staff_performance_id, count, excluded_count, total_id_score')
      .in('staff_performance_id', staffPerfIds)

    if (contractsError) {
      console.error('Error fetching mnp_id_contracts:', contractsError)
      return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
    }

    if (!contracts || contracts.length === 0) {
      return NextResponse.json([])
    }

    // staff_performance_id → staff_name / event_id のマップを作成
    const staffPerfMap = new Map<string, { staffName: string; eventId: string }>()
    staffPerformances.forEach(sp => staffPerfMap.set(sp.id, { staffName: sp.staff_name, eventId: sp.event_id }))

    // スタッフ名ごとに集計
    const staffScores = new Map<string, {
      staffName: string
      totalIdScore: number
      eventIds: Set<string>
      mnpCount: number
      effectiveCount: number
    }>()

    contracts.forEach(contract => {
      const sp = staffPerfMap.get(contract.staff_performance_id)
      if (!sp) return

      const { staffName, eventId } = sp

      if (!staffScores.has(staffName)) {
        staffScores.set(staffName, {
          staffName,
          totalIdScore: 0,
          eventIds: new Set<string>(),
          mnpCount: 0,
          effectiveCount: 0,
        })
      }

      const entry = staffScores.get(staffName)!
      entry.eventIds.add(eventId)
      entry.totalIdScore += parseFloat(String(contract.total_id_score || '0'))
      entry.mnpCount += contract.count || 0
      entry.effectiveCount += Math.max(0, (contract.count || 0) - (contract.excluded_count || 0))
    })

    const result = Array.from(staffScores.values())
      .filter(s => s.totalIdScore > 0)
      .sort((a, b) => b.totalIdScore - a.totalIdScore)
      .map(s => ({
        staffName: s.staffName,
        totalIdScore: s.totalIdScore,
        eventCount: s.eventIds.size,
        mnpCount: s.mnpCount,
        effectiveCount: s.effectiveCount,
        avgIdScore: s.eventIds.size > 0 ? s.totalIdScore / s.eventIds.size : 0,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
