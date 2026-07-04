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
      .limit(10000)

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

    // staff_performancesをchunk分割して取得（MNP集計列も含めて取得）
    const EVENT_CHUNK_SIZE = 500
    const allStaffPerformances: Array<{
      id: string
      staff_name: string
      event_id: string
      au_mnp_sp1: number
      au_mnp_sp2: number
      au_mnp_sim: number
      uq_mnp_sp1: number
      uq_mnp_sp2: number
      uq_mnp_sim: number
      au_hs_sp1: number
      au_hs_sp2: number
      au_hs_sim: number
      uq_hs_sp1: number
      uq_hs_sp2: number
      uq_hs_sim: number
      cell_up_sp1: number
      cell_up_sp2: number
      cell_up_sim: number
    }> = []
    for (let i = 0; i < eventIds.length; i += EVENT_CHUNK_SIZE) {
      const chunk = eventIds.slice(i, i + EVENT_CHUNK_SIZE)
      const { data: chunkSP, error: chunkSPError } = await supabase
        .from('staff_performances')
        .select('id, staff_name, event_id, au_mnp_sp1, au_mnp_sp2, au_mnp_sim, uq_mnp_sp1, uq_mnp_sp2, uq_mnp_sim, au_hs_sp1, au_hs_sp2, au_hs_sim, uq_hs_sp1, uq_hs_sp2, uq_hs_sim, cell_up_sp1, cell_up_sp2, cell_up_sim')
        .in('event_id', chunk)
        .limit(50000)
      if (chunkSPError) {
        console.error('Error fetching staff_performances chunk:', chunkSPError)
        return NextResponse.json({ error: 'Failed to fetch staff performances' }, { status: 500 })
      }
      if (chunkSP) allStaffPerformances.push(...chunkSP)
    }
    const staffPerformances = allStaffPerformances

    if (staffPerformances.length === 0) {
      return NextResponse.json([])
    }

    const staffPerfIds = staffPerformances.map(sp => sp.id)

    // mnp_id_contractsをchunk分割して取得（.in()のURL長制限回避 + 行数制限対策）
    const CHUNK_SIZE = 500
    const allContracts: Array<{ staff_performance_id: string; count: number; excluded_count: number; total_id_score: number }> = []
    for (let i = 0; i < staffPerfIds.length; i += CHUNK_SIZE) {
      const chunk = staffPerfIds.slice(i, i + CHUNK_SIZE)
      const { data: chunkContracts, error: chunkError } = await supabase
        .from('mnp_id_contracts')
        .select('staff_performance_id, count, excluded_count, total_id_score')
        .in('staff_performance_id', chunk)
        .limit(50000)
      if (chunkError) {
        console.error('Error fetching mnp_id_contracts chunk:', chunkError)
        return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
      }
      if (chunkContracts) allContracts.push(...chunkContracts)
    }
    const contracts = allContracts

    if (!contracts || contracts.length === 0) {
      return NextResponse.json([])
    }

    // staff_performance_id → staff_name / event_id / MNP列 のマップを作成
    const staffPerfMap = new Map<string, { staffName: string; eventId: string; mnpCount: number; newCount: number; cellupCount: number }>()
    staffPerformances.forEach(sp => {
      const mnpCount =
        (sp.au_mnp_sp1 || 0) + (sp.au_mnp_sp2 || 0) + (sp.au_mnp_sim || 0) +
        (sp.uq_mnp_sp1 || 0) + (sp.uq_mnp_sp2 || 0) + (sp.uq_mnp_sim || 0)
      const newCount =
        (sp.au_hs_sp1 || 0) + (sp.au_hs_sp2 || 0) + (sp.au_hs_sim || 0) +
        (sp.uq_hs_sp1 || 0) + (sp.uq_hs_sp2 || 0) + (sp.uq_hs_sim || 0)
      const cellupCount =
        (sp.cell_up_sp1 || 0) + (sp.cell_up_sp2 || 0) + (sp.cell_up_sim || 0)
      staffPerfMap.set(sp.id, { staffName: sp.staff_name, eventId: sp.event_id, mnpCount, newCount, cellupCount })
    })

    // スタッフ名ごとに集計
    const staffScores = new Map<string, {
      staffName: string
      totalIdScore: number
      eventIds: Set<string>
      mnpCount: number
      newCount: number
      cellupCount: number
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
          newCount: 0,
          cellupCount: 0,
          effectiveCount: 0,
        })
      }

      const entry = staffScores.get(staffName)!
      entry.eventIds.add(eventId)
      entry.totalIdScore += parseFloat(String(contract.total_id_score || '0'))
      entry.effectiveCount += Math.max(0, (contract.count || 0) - (contract.excluded_count || 0))
    })

    // MNP件数・新規件数・セルアップ件数はstaff_performancesの集計列から算出
    staffPerformances.forEach(sp => {
      const { staffName, mnpCount, newCount, cellupCount } = staffPerfMap.get(sp.id)!
      if (!staffScores.has(staffName)) return // ID係数が0のスタッフは除外
      const entry = staffScores.get(staffName)!
      entry.mnpCount += mnpCount
      entry.newCount += newCount
      entry.cellupCount += cellupCount
    })

    const result = Array.from(staffScores.values())
      .filter(s => s.totalIdScore > 0)
      .sort((a, b) => b.totalIdScore - a.totalIdScore)
      .map(s => ({
        staffName: s.staffName,
        totalIdScore: s.totalIdScore,
        eventCount: s.eventIds.size,
        mnpCount: s.mnpCount,
        newCount: s.newCount,
        cellupCount: s.cellupCount,
        effectiveCount: s.effectiveCount,
        avgIdScore: s.eventIds.size > 0 ? s.totalIdScore / s.eventIds.size : 0,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
