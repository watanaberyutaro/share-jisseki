import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subDays, startOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period')
    const team = searchParams.get('team')
    const venue = searchParams.get('venue')
    
    // イベントテーブルから関連するperformancesを取得する方式に変更
    let eventQuery = supabase
      .from('events')
      .select(`
        *,
        performances(*)
      `)
    
    // 日付フィルター
    if (period) {
      const now = new Date()
      let startDate: Date
      
      if (period === '7days') {
        startDate = subDays(now, 7)
      } else if (period === '30days') {
        startDate = subDays(now, 30)
      } else if (period === '90days') {
        startDate = subDays(now, 90)
      } else {
        startDate = subDays(now, 30) // デフォルト
      }
      
      eventQuery = eventQuery.gte('date', startDate.toISOString())
    }
    
    // チームフィルター
    if (team && team !== 'all') {
      eventQuery = eventQuery.eq('team', team)
    }
    
    // 会場フィルター
    if (venue && venue !== 'all') {
      eventQuery = eventQuery.eq('venue', venue)
    }
    
    eventQuery = eventQuery.order('date', { ascending: false })
    
    const { data: events, error } = await eventQuery
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    if (!events || events.length === 0) {
      return NextResponse.json({
        performances: [],
        venueStats: [],
        teamStats: [],
        monthlyTrends: [],
      })
    }
    
    // イベントデータをパフォーマンス形式に変換
    const performances = events.flatMap(event =>
      event.performances.map((performance: any) => ({
        ...performance,
        event
      }))
    )
    
    if (!performances || performances.length === 0) {
      return NextResponse.json({
        performances: [],
        venueStats: [],
        teamStats: [],
        monthlyTrends: [],
      })
    }
    
    const formattedPerformances = performances.map(p => ({
      id: p.id,
      eventName: p.event.name,
      date: p.event.date,
      venue: p.event.venue,
      team: p.event.team,
      totalNewIds: 
        (p.au_mnp_sp1 || 0) + (p.au_mnp_sp2 || 0) + (p.au_mnp_sim || 0) +
        (p.uq_mnp_sp1 || 0) + (p.uq_mnp_sp2 || 0) + (p.uq_mnp_sim || 0) +
        (p.au_hs_sp1 || 0) + (p.au_hs_sp2 || 0) + (p.au_hs_sim || 0) +
        (p.uq_hs_sp1 || 0) + (p.uq_hs_sp2 || 0) + (p.uq_hs_sim || 0) +
        (p.cell_up_sp1 || 0) + (p.cell_up_sp2 || 0) + (p.cell_up_sim || 0),
      totalLtv: 
        (p.credit_card || 0) + (p.gold_card || 0) + (p.ji_bank_account || 0) +
        (p.warranty || 0) + (p.ott || 0) + (p.electricity || 0) + (p.gas || 0),
      auMnpTotal: (p.au_mnp_sp1 || 0) + (p.au_mnp_sp2 || 0) + (p.au_mnp_sim || 0),
      uqMnpTotal: (p.uq_mnp_sp1 || 0) + (p.uq_mnp_sp2 || 0) + (p.uq_mnp_sim || 0),
      auHsTotal: (p.au_hs_sp1 || 0) + (p.au_hs_sp2 || 0) + (p.au_hs_sim || 0),
      uqHsTotal: (p.uq_hs_sp1 || 0) + (p.uq_hs_sp2 || 0) + (p.uq_hs_sim || 0),
      cellUpTotal: (p.cell_up_sp1 || 0) + (p.cell_up_sp2 || 0) + (p.cell_up_sim || 0),
      networkCount: p.network_count || 0,
    }))
    
    const venueStatsMap = new Map<string, { totalSales: number; eventCount: number }>()
    const teamStatsMap = new Map<string, { totalSales: number; eventCount: number }>()
    const monthlyStatsMap = new Map<string, { totalSales: number; eventCount: number }>()
    
    formattedPerformances.forEach(p => {
      const sales = p.totalNewIds + p.totalLtv
      
      // Venue stats
      if (p.venue) {
        const venueData = venueStatsMap.get(p.venue) || { totalSales: 0, eventCount: 0 }
        venueData.totalSales += sales
        venueData.eventCount += 1
        venueStatsMap.set(p.venue, venueData)
      }
      
      // Team stats
      if (p.team) {
        const teamData = teamStatsMap.get(p.team) || { totalSales: 0, eventCount: 0 }
        teamData.totalSales += sales
        teamData.eventCount += 1
        teamStatsMap.set(p.team, teamData)
      }
      
      // Monthly stats
      const month = format(new Date(p.date), 'yyyy-MM')
      const monthData = monthlyStatsMap.get(month) || { totalSales: 0, eventCount: 0 }
      monthData.totalSales += sales
      monthData.eventCount += 1
      monthlyStatsMap.set(month, monthData)
    })
    
    const venueStats = Array.from(venueStatsMap.entries()).map(([venue, data]) => ({
      venue,
      totalSales: data.totalSales,
      averageSales: data.eventCount > 0 ? data.totalSales / data.eventCount : 0,
      eventCount: data.eventCount,
    })).sort((a, b) => b.totalSales - a.totalSales)
    
    const teamStats = Array.from(teamStatsMap.entries()).map(([team, data]) => ({
      team,
      totalSales: data.totalSales,
      averageSales: data.eventCount > 0 ? data.totalSales / data.eventCount : 0,
      eventCount: data.eventCount,
    })).sort((a, b) => b.totalSales - a.totalSales)
    
    const monthlyTrends = Array.from(monthlyStatsMap.entries()).map(([month, data]) => ({
      month,
      totalSales: data.totalSales,
      eventCount: data.eventCount,
    })).sort((a, b) => a.month.localeCompare(b.month))
    
    return NextResponse.json({
      performances: formattedPerformances,
      venueStats,
      teamStats,
      monthlyTrends,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}