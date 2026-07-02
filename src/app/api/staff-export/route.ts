import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 全イベント取得
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, year, month, week_number, start_date, end_date, venue, agency_name, agency_tier')
      .order('start_date', { ascending: false })
      .limit(10000)

    if (eventsError || !events || events.length === 0) {
      return NextResponse.json([])
    }

    const eventMap = new Map(events.map(e => [e.id, e]))
    const eventIds = events.map(e => e.id)

    // staff_performances を chunk 取得（URL長制限回避のため100件ずつ分割）
    const CHUNK = 100
    const allSP: any[] = []
    for (let i = 0; i < eventIds.length; i += CHUNK) {
      const chunk = eventIds.slice(i, i + CHUNK)
      const { data, error } = await supabase
        .from('staff_performances')
        .select(`
          event_id, staff_name,
          au_mnp_sp1, au_mnp_sp2, au_mnp_sim,
          uq_mnp_sp1, uq_mnp_sp2, uq_mnp_sim,
          au_hs_sp1, au_hs_sp2, au_hs_sim,
          uq_hs_sp1, uq_hs_sp2, uq_hs_sim,
          cell_up_sp1, cell_up_sp2, cell_up_sim,
          credit_card, gold_card, ji_bank_account,
          warranty, ott, electricity, gas, network_count
        `)
        .in('event_id', chunk)
        .limit(10000)
      if (error) return NextResponse.json({ error: 'Failed to fetch staff performances' }, { status: 500 })
      if (data) allSP.push(...data)
    }

    // (staff_name, event_id) ごとに集計
    const key = (sp: any) => `${sp.staff_name}__${sp.event_id}`
    const agg = new Map<string, any>()

    const NUM_COLS = [
      'au_mnp_sp1', 'au_mnp_sp2', 'au_mnp_sim',
      'uq_mnp_sp1', 'uq_mnp_sp2', 'uq_mnp_sim',
      'au_hs_sp1', 'au_hs_sp2', 'au_hs_sim',
      'uq_hs_sp1', 'uq_hs_sp2', 'uq_hs_sim',
      'cell_up_sp1', 'cell_up_sp2', 'cell_up_sim',
      'credit_card', 'gold_card', 'ji_bank_account',
      'warranty', 'ott', 'electricity', 'gas', 'network_count',
    ]

    for (const sp of allSP) {
      const k = key(sp)
      if (!agg.has(k)) {
        const ev = eventMap.get(sp.event_id)
        // year/month が未設定の場合は start_date 文字列から直接補完（タイムゾーン問題を回避）
        const sd = ev?.start_date ?? ''
        const derivedYear = ev?.year ?? (sd.length >= 4 ? parseInt(sd.slice(0, 4), 10) : null)
        const derivedMonth = ev?.month ?? (sd.length >= 7 ? parseInt(sd.slice(5, 7), 10) : null)
        agg.set(k, {
          year: derivedYear,
          month: derivedMonth,
          week_number: ev?.week_number ?? null,
          start_date: ev?.start_date ?? null,
          end_date: ev?.end_date ?? null,
          venue: ev?.venue ?? '',
          agency_name: ev?.agency_name ?? '',
          agency_tier: ev?.agency_tier ?? '',
          staff_name: sp.staff_name,
          ...Object.fromEntries(NUM_COLS.map(c => [c, 0])),
        })
      }
      const row = agg.get(k)!
      for (const c of NUM_COLS) row[c] += Number(sp[c] || 0)
    }

    const result = Array.from(agg.values()).sort((a, b) => {
      if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0)
      if (a.month !== b.month) return (b.month ?? 0) - (a.month ?? 0)
      if (a.start_date !== b.start_date) return (b.start_date ?? '').localeCompare(a.start_date ?? '')
      return (a.staff_name ?? '').localeCompare(b.staff_name ?? '')
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('staff-export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
