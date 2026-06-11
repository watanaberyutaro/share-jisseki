'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, Target, StickyNote, Save, Edit3, Trophy, Award, Medal, BarChart, User, Store, Filter, Building2, MapPin } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart as RechartsBarChart, Bar } from 'recharts'
import { MagneticDots } from '@/components/MagneticDots'
import {
  StaffFilterConfig,
  DEFAULT_STAFF_FILTER,
  INTERNAL_ONLY_FILTER,
  aggregateFilteredPerformances,
  getFilterDisplayName
} from '@/lib/staff-filter'
import {
  AgencyTierFilter,
  EventTypeFilter,
  DEFAULT_AGENCY_TIER_FILTER,
  DEFAULT_EVENT_TYPE_FILTER,
  applyAgencyTierFilter,
  applyEventTypeFilter,
  getAgencyTierFilterDisplayName,
  getEventTypeFilterDisplayName
} from '@/lib/event-filter'

export default function Dashboard() {
  const [currentTime] = useState(new Date())

  useEffect(() => {
    // 分析ページ専用のスタイルを動的に追加
    const style = document.createElement('style')
    style.id = 'dashboard-custom-styles'
    style.textContent = `
      @media (max-width: 768px) {
        .dashboard-page {
          font-size: 0.7rem !important;
        }
        .dashboard-container {
          padding-left: 0.5rem !important;
          padding-right: 0.5rem !important;
        }
        .dashboard-page .glass {
          padding: 0.7rem !important;
        }
        .dashboard-page h1 {
          font-size: 1.12rem !important;
        }
        .dashboard-page h2 {
          font-size: 1rem !important;
        }
        .dashboard-page h3 {
          font-size: 0.84rem !important;
        }
        .dashboard-page .text-xs {
          font-size: 0.504rem !important;
        }
        .dashboard-page .text-sm {
          font-size: 0.56rem !important;
        }
        .dashboard-page .text-base {
          font-size: 0.7rem !important;
        }
        .dashboard-page .text-lg {
          font-size: 1rem !important;
        }
        .dashboard-page .text-xl {
          font-size: 1rem !important;
        }
        .dashboard-page .text-2xl {
          font-size: 1rem !important;
        }
        .dashboard-page .text-3xl {
          font-size: 1.26rem !important;
        }
        .dashboard-page .dashboard-title {
          font-size: 1rem !important;
        }
        .dashboard-page .mx-2 {
          font-size: 0.504rem !important;
        }
        .dashboard-page button,
        .dashboard-page button * {
          font-size: 0.56rem !important;
        }
        .dashboard-page .flex.items-center button {
          font-size: 0.56rem !important;
        }
        .dashboard-page svg:not(.recharts-surface) {
          width: 0.7em !important;
          height: 0.7em !important;
        }
        .dashboard-page .w-3 {
          width: 0.525rem !important;
        }
        .dashboard-page .h-3 {
          height: 0.525rem !important;
        }
        .dashboard-page .w-4 {
          width: 0.7rem !important;
        }
        .dashboard-page .h-4 {
          height: 0.7rem !important;
        }
        .dashboard-page .w-5 {
          width: 0.875rem !important;
        }
        .dashboard-page .h-5 {
          height: 0.875rem !important;
        }
        .dashboard-page .w-6 {
          width: 1.05rem !important;
        }
        .dashboard-page .h-6 {
          height: 1.05rem !important;
        }
        .dashboard-page .w-8 {
          width: 1.4rem !important;
        }
        .dashboard-page .h-8 {
          height: 1.4rem !important;
        }
        .dashboard-page .gap-2 {
          gap: 0.35rem !important;
        }
        .dashboard-page .gap-3 {
          gap: 0.525rem !important;
        }
        .dashboard-page .gap-6 {
          gap: 1.05rem !important;
        }
        .dashboard-page .space-x-2 > * + * {
          margin-left: 0.35rem !important;
        }
        .dashboard-page .space-x-3 > * + * {
          margin-left: 0.525rem !important;
        }
        .dashboard-page .space-y-2 > * + * {
          margin-top: 0.35rem !important;
        }
        .dashboard-page .p-3 {
          padding: 0.525rem !important;
        }
        .dashboard-page .p-4 {
          padding: 0.7rem !important;
        }
        .dashboard-page .p-6 {
          padding: 1.05rem !important;
        }
        .dashboard-page .px-2 {
          padding-left: 0.35rem !important;
          padding-right: 0.35rem !important;
        }
        .dashboard-page .px-3 {
          padding-left: 0.525rem !important;
          padding-right: 0.525rem !important;
        }
        .dashboard-page .px-4 {
          padding-left: 0.7rem !important;
          padding-right: 0.7rem !important;
        }
        .dashboard-page .py-1 {
          padding-top: 0.175rem !important;
          padding-bottom: 0.175rem !important;
        }
        .dashboard-page .py-1\.5 {
          padding-top: 0.2625rem !important;
          padding-bottom: 0.2625rem !important;
        }
        .dashboard-page .py-2 {
          padding-top: 0.35rem !important;
          padding-bottom: 0.35rem !important;
        }
        .dashboard-page .py-8 {
          padding-top: 1.4rem !important;
          padding-bottom: 1.4rem !important;
        }
        .dashboard-page .mb-1 {
          margin-bottom: 0.175rem !important;
        }
        .dashboard-page .mb-2 {
          margin-bottom: 0.35rem !important;
        }
        .dashboard-page .mb-3 {
          margin-bottom: 0.525rem !important;
        }
        .dashboard-page .mb-4 {
          margin-bottom: 0.7rem !important;
        }
        .dashboard-page .mb-6 {
          margin-bottom: 1.05rem !important;
        }
        .dashboard-page .mr-1 {
          margin-right: 0.175rem !important;
        }
        .dashboard-page .mr-2 {
          margin-right: 0.35rem !important;
        }
        .dashboard-page .mr-3 {
          margin-right: 0.525rem !important;
        }
        .dashboard-page .mt-2 {
          margin-top: 0.35rem !important;
        }
        .dashboard-page .mt-3 {
          margin-top: 0.525rem !important;
        }
        .dashboard-page .mt-4 {
          margin-top: 0.7rem !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('dashboard-custom-styles')
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [staffData, setStaffData] = useState<any[]>([])
  const [memo, setMemo] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savedMemo, setSavedMemo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [staffFilter, setStaffFilter] = useState<StaffFilterConfig>(DEFAULT_STAFF_FILTER)
  const [agencyTierFilter, setAgencyTierFilter] = useState<AgencyTierFilter>(DEFAULT_AGENCY_TIER_FILTER)
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>(DEFAULT_EVENT_TYPE_FILTER)

  // メモ機能のローカルストレージ管理
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-memo')
    if (saved) {
      setSavedMemo(saved)
      setMemo(saved)
    }
  }, [])

  const handleSaveMemo = useCallback(() => {
    localStorage.setItem('dashboard-memo', memo)
    setSavedMemo(memo)
    setIsEditing(false)
  }, [memo])

  const handleEditMemo = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setMemo(savedMemo)
    setIsEditing(false)
  }, [savedMemo])


  // データフェッチ処理
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/performances/enhanced-v2', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          setAllEvents(data)

          // 当月イベントIDを取得してスタッフデータをフェッチ
          const currentMonth = currentTime.getMonth() + 1
          const currentYear = currentTime.getFullYear()
          const currentMonthEvents = data.filter((event: any) =>
            event.month === currentMonth && event.year === currentYear
          )
          const currentMonthEventIds = currentMonthEvents.map((event: any) => event.id).filter(Boolean)

          if (currentMonthEventIds.length > 0) {
            try {
              const staffResponse = await fetch(
                `/api/staff-performances?eventIds=${currentMonthEventIds.join(',')}`
              )
              if (staffResponse.ok) {
                const data = await staffResponse.json()
                setStaffData(data)
              }
            } catch (staffError) {
              console.error('Failed to fetch staff data:', staffError)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentTime])

  // 当月イベントのフィルタリング（メモ化）
  const currentMonthEvents = useMemo(() => {
    const currentMonth = currentTime.getMonth() + 1
    const currentYear = currentTime.getFullYear()
    let filtered = allEvents.filter((event: any) =>
      event.month === currentMonth && event.year === currentYear
    )

    // Apply agency tier filter
    filtered = applyAgencyTierFilter(filtered, agencyTierFilter)

    // Apply event type filter
    filtered = applyEventTypeFilter(filtered, eventTypeFilter)

    return filtered
  }, [allEvents, currentTime, agencyTierFilter, eventTypeFilter])

  // スタッフフィルター適用後のイベントデータ再計算（メモ化）
  const filteredCurrentMonthEvents = useMemo(() => {
    // デフォルトフィルター（全て含む）の場合は元のイベントデータをそのまま返す
    if (staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore) {
      return currentMonthEvents
    }

    // スタッフデータがない場合も元のイベントデータを返す
    if (staffData.length === 0) {
      return currentMonthEvents
    }

    // イベントごとにスタッフフィルターを適用して再計算
    return currentMonthEvents.map((event: any) => {
      // このイベントのスタッフパフォーマンスを取得
      const eventStaffPerformances = staffData.filter((sp: any) => sp.event_id === event.id)

      if (eventStaffPerformances.length === 0) {
        // スタッフデータがない場合は元のイベントを返す
        return event
      }

      // フィルター適用して集計
      const aggregated = aggregateFilteredPerformances(eventStaffPerformances, staffFilter)

      // イベントデータのコピーを作成し、実績値を再計算した値で置き換え
      return {
        ...event,
        actual_au_mnp: aggregated.au_mnp,
        actual_uq_mnp: aggregated.uq_mnp,
        actual_au_new: aggregated.au_new,
        actual_uq_new: aggregated.uq_new,
        actual_hs_total: aggregated.hs_total,
        credit_card: aggregated.credit_card,
        gold_card: aggregated.gold_card,
        ji_bank_account: aggregated.ji_bank_account,
        warranty: aggregated.warranty,
        ott: aggregated.ott,
        electricity: aggregated.electricity,
        gas: aggregated.gas,
        network_count: aggregated.network_count
      }
    })
  }, [currentMonthEvents, staffData, staffFilter])

  // 月次統計の計算（メモ化）- フィルター適用後のデータを使用
  const monthlyStats = useMemo(() => {
    const eventsWithTargets = filteredCurrentMonthEvents.filter((event: any) => event.target_hs_total > 0)
    const achievedEvents = eventsWithTargets.filter((event: any) =>
      event.actual_hs_total >= event.target_hs_total
    )

    const totalTarget = eventsWithTargets.reduce((sum: number, event: any) => sum + event.target_hs_total, 0)
    const totalActual = eventsWithTargets.reduce((sum: number, event: any) => sum + event.actual_hs_total, 0)
    const totalMnp = filteredCurrentMonthEvents.reduce((sum: number, event: any) => sum + (event.actual_au_mnp || 0) + (event.actual_uq_mnp || 0), 0)
    const totalNew = filteredCurrentMonthEvents.reduce((sum: number, event: any) => sum + (event.actual_au_new || 0) + (event.actual_uq_new || 0), 0)
    const totalHs = totalMnp + totalNew
    const mnpRatio = totalHs > 0 ? Math.round((totalMnp / totalHs) * 100) : 0

    return {
      totalEvents: eventsWithTargets.length,
      achievedEvents: achievedEvents.length,
      achievementRate: eventsWithTargets.length > 0 ? Math.round((achievedEvents.length / eventsWithTargets.length) * 100) : 0,
      totalTarget,
      totalActual,
      totalMnp,
      totalNew,
      mnpRatio
    }
  }, [filteredCurrentMonthEvents])

  // 商流別統計の計算（メモ化）- フィルター適用後のデータを使用
  const agencyTierStats = useMemo(() => {
    const primaryEvents = filteredCurrentMonthEvents.filter((e: any) => e.agency_tier === '一次')
    const secondaryEvents = filteredCurrentMonthEvents.filter((e: any) => e.agency_tier === '二次')

    return {
      primary: {
        count: primaryEvents.length,
        totalHS: primaryEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0),
        avgHS: primaryEvents.length > 0
          ? Math.round(primaryEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0) / primaryEvents.length)
          : 0
      },
      secondary: {
        count: secondaryEvents.length,
        totalHS: secondaryEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0),
        avgHS: secondaryEvents.length > 0
          ? Math.round(secondaryEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0) / secondaryEvents.length)
          : 0
      }
    }
  }, [filteredCurrentMonthEvents])

  // イベントタイプ別統計の計算（メモ化）- フィルター適用後のデータを使用
  const eventTypeStats = useMemo(() => {
    const gaihanEvents = filteredCurrentMonthEvents.filter((e: any) => e.event_type === '外販')
    const tentoEvents = filteredCurrentMonthEvents.filter((e: any) => e.event_type === '店頭')

    return {
      gaihan: {
        count: gaihanEvents.length,
        totalHS: gaihanEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0),
        avgHS: gaihanEvents.length > 0
          ? Math.round(gaihanEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0) / gaihanEvents.length)
          : 0
      },
      tento: {
        count: tentoEvents.length,
        totalHS: tentoEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0),
        avgHS: tentoEvents.length > 0
          ? Math.round(tentoEvents.reduce((sum: number, e: any) => sum + (e.actual_hs_total || 0), 0) / tentoEvents.length)
          : 0
      }
    }
  }, [filteredCurrentMonthEvents])

  // 年次データの計算（メモ化）
  const yearlyData = useMemo(() => {
    const yearlyMonthlyData: any = {}
    allEvents.forEach((event: any) => {
      const year = event.year
      const month = event.month
      const key = `${year}-${month}`
      if (!yearlyMonthlyData[key]) {
        yearlyMonthlyData[key] = {
          year,
          month,
          totalEvents: 0,
          achievedEvents: 0,
          achievementRate: 0
        }
      }

      if (event.target_hs_total > 0) {
        yearlyMonthlyData[key].totalEvents++
        if (event.actual_hs_total >= event.target_hs_total) {
          yearlyMonthlyData[key].achievedEvents++
        }
      }
    })

    return Object.values(yearlyMonthlyData).map((data: any) => ({
      ...data,
      achievementRate: data.totalEvents > 0 ? Math.round((data.achievedEvents / data.totalEvents) * 100) : 0,
      monthLabel: `${data.year}年${data.month}月`
    })).sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })
  }, [allEvents])

  // イベントランキングの計算（メモ化）
  const eventRanking = useMemo(() => {
    const allEventRanking = currentMonthEvents
      .map((event: any) => ({
        id: event.id,
        eventName: `${event.venue} (${event.start_date?.split('-')[0]}/${event.start_date?.split('-')[1]})` || '名称未設定',
        venue: event.venue,
        startDate: event.start_date,
        totalIds: event.actual_hs_total || 0,
        auMnp: event.actual_au_mnp || 0,
        uqMnp: event.actual_uq_mnp || 0,
        auNew: event.actual_au_new || 0,
        uqNew: event.actual_uq_new || 0,
        staffCount: event.staff_performances?.length || 0
      }))
      .filter((event: any) => event.totalIds > 0)
      .sort((a: any, b: any) => b.totalIds - a.totalIds)

    if (allEventRanking.length === 0) return []

    const top5 = allEventRanking.slice(0, 5)
    if (top5.length === 5) {
      const fifthPlaceScore = top5[4].totalIds
      return allEventRanking.filter((event: any) => event.totalIds >= fifthPlaceScore)
    }
    return top5
  }, [currentMonthEvents])

  // 週次データの計算（メモ化）
  const weeklyIdData = useMemo(() => {
    const weeklyData: any = {}
    currentMonthEvents.forEach((event: any) => {
      const week = event.week_number

      if (!weeklyData[week]) {
        weeklyData[week] = {
          week: `第${week}週`,
          weekNumber: week,
          totalIds: 0,
          mnp: 0,
          new: 0
        }
      }

      weeklyData[week].totalIds += event.actual_hs_total || 0
      weeklyData[week].mnp += (event.actual_au_mnp || 0) + (event.actual_uq_mnp || 0)
      weeklyData[week].new += (event.actual_au_new || 0) + (event.actual_uq_new || 0)
    })

    return Object.values(weeklyData).sort((a: any, b: any) => a.weekNumber - b.weekNumber)
  }, [currentMonthEvents])

  // スタッフランキングの計算（メモ化）
  const staffRanking = useMemo(() => {
    if (staffData.length === 0) return []

    const staffStats: any = {}

    staffData.forEach((record: any) => {
      const staffName = record.staff_name

      if (!staffStats[staffName]) {
        staffStats[staffName] = {
          staffName,
          totalIds: 0,
          mnp: 0,
          new: 0,
          eventCount: new Set()
        }
      }

      const mnp = (record.au_mnp_sp1 || 0) + (record.au_mnp_sp2 || 0) + (record.au_mnp_sim || 0) +
                  (record.uq_mnp_sp1 || 0) + (record.uq_mnp_sp2 || 0) + (record.uq_mnp_sim || 0)
      const newCount = (record.au_hs_sp1 || 0) + (record.au_hs_sp2 || 0) + (record.au_hs_sim || 0) +
                       (record.uq_hs_sp1 || 0) + (record.uq_hs_sp2 || 0) + (record.uq_hs_sim || 0)

      staffStats[staffName].mnp += mnp
      staffStats[staffName].new += newCount
      staffStats[staffName].totalIds += mnp + newCount
      staffStats[staffName].eventCount.add(record.event_id)
    })

    const excludedNames = ['店舗', '他社スタッフ', '他社スタッフA', '他社スタッフB', '他社スタッフC', '他社スタッフD', '他社スタッフE', '他社スタッフF']
    const allStaffRanking = Object.values(staffStats)
      .map((staff: any) => ({
        staffName: staff.staffName,
        totalIds: staff.totalIds,
        mnp: staff.mnp,
        new: staff.new,
        eventCount: staff.eventCount.size
      }))
      .filter((staff: any) => staff.totalIds > 0 && !excludedNames.includes(staff.staffName))
      .sort((a: any, b: any) => b.totalIds - a.totalIds)

    if (allStaffRanking.length === 0) return []

    const top5 = allStaffRanking.slice(0, 5)
    if (top5.length === 5) {
      const fifthPlaceScore = top5[4].totalIds
      return allStaffRanking.filter((staff: any) => staff.totalIds >= fifthPlaceScore)
    }
    return top5
  }, [staffData])

  // 色パレット定義（分析ページと統一・メモ化）
  const COLORS = useMemo(() => [
    '#4abf79', '#7cd08e', '#a6e09e',
    '#ffd942', '#ffe680', '#ffedb3', '#fff5e0',
    '#3dae6c', '#FFB300', '#DCEDC8', '#9E9E9E', '#FAFAFA', '#FFFBF3', '#858680', '#97724A',
    '#ffbb00', '#f8d549', '#f4e3a4', '#b7e59e',
    '#795939', '#a58a69', '#d5cec3', '#e8e2ce', '#b4a89d', '#2c9b5e'
  ], [])

  return (
    <div className="min-h-screen relative dashboard-mobile dashboard-page" style={{ paddingTop: '2.5rem' }}>
      {/* 磁石効果のあるドット背景（データ読み込み後に表示） */}
      {!isLoading && <MagneticDots />}

      {/* Monthly Achievement Stats and Memo Panel */}
      <div className="relative z-10 max-w-6xl mx-auto dashboard-container pb-32 md:pb-6" style={{ paddingLeft: '6rem', paddingRight: '6rem', paddingTop: '2.5rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* 達成状況パネル */}
          <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-3 md:w-6 h-3 md:h-6 shrink-0" style={{ color: '#22211A' }} />
                <h2 className="dashboard-title font-bold leading-tight whitespace-nowrap" style={{ color: '#22211A' }}>
                  {currentTime.getFullYear()}年{currentTime.getMonth() + 1}月の達成状況
                </h2>
              </div>

              <div className="flex items-center">
                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full" style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#FFB300' }}>
                  <span className="text-xs md:text-sm font-medium whitespace-nowrap">総イベント数: {monthlyStats.totalEvents}件</span>
                </div>
              </div>
            </div>

            {/* フィルターセクション */}
            <div className="mb-4 space-y-2">
              {/* スタッフ区分フィルター */}
              <div className="p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: '#22211A' }} />
                    <span className="text-sm font-medium" style={{ color: '#22211A' }}>区分:</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(74, 191, 121, 0.1)', color: '#4abf79' }}>
                      {getFilterDisplayName(staffFilter)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setStaffFilter(DEFAULT_STAFF_FILTER)}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore
                          ? 'border-[#4abf79] bg-[#4abf79] text-white'
                          : 'border-[#22211A40] hover:border-[#4abf79] hover:bg-muted/50'
                      }`}
                      style={{ color: staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore ? 'white' : '#22211A' }}
                    >
                      全体
                    </button>
                    <button
                      onClick={() => setStaffFilter(INTERNAL_ONLY_FILTER)}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        staffFilter.includeInternal && !staffFilter.includeExternal && !staffFilter.includeStore
                          ? 'border-[#4abf79] bg-[#4abf79] text-white'
                          : 'border-[#22211A40] hover:border-[#4abf79] hover:bg-muted/50'
                      }`}
                      style={{ color: staffFilter.includeInternal && !staffFilter.includeExternal && !staffFilter.includeStore ? 'white' : '#22211A' }}
                    >
                      自社のみ
                    </button>
                    <button
                      onClick={() => setStaffFilter({
                        includeInternal: true,
                        includeExternal: false,
                        includeStore: true
                      })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        staffFilter.includeInternal && !staffFilter.includeExternal && staffFilter.includeStore
                          ? 'border-[#4abf79] bg-[#4abf79] text-white'
                          : 'border-[#22211A40] hover:border-[#4abf79] hover:bg-muted/50'
                      }`}
                      style={{ color: staffFilter.includeInternal && !staffFilter.includeExternal && staffFilter.includeStore ? 'white' : '#22211A' }}
                    >
                      他社除外
                    </button>
                    <button
                      onClick={() => setStaffFilter({
                        includeInternal: true,
                        includeExternal: true,
                        includeStore: false
                      })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        staffFilter.includeInternal && staffFilter.includeExternal && !staffFilter.includeStore
                          ? 'border-[#4abf79] bg-[#4abf79] text-white'
                          : 'border-[#22211A40] hover:border-[#4abf79] hover:bg-muted/50'
                      }`}
                      style={{ color: staffFilter.includeInternal && staffFilter.includeExternal && !staffFilter.includeStore ? 'white' : '#22211A' }}
                    >
                      店舗除外
                    </button>
                  </div>
                </div>
              </div>

              {/* 商流フィルター */}
              <div className="p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" style={{ color: '#22211A' }} />
                    <span className="text-sm font-medium" style={{ color: '#22211A' }}>商流:</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(241, 173, 38, 0.1)', color: '#F1AD26' }}>
                      {getAgencyTierFilterDisplayName(agencyTierFilter)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAgencyTierFilter({ showAll: true, showPrimary: false, showSecondary: false })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        agencyTierFilter.showAll
                          ? 'border-[#F1AD26] bg-[#F1AD26] text-white'
                          : 'border-[#22211A40] hover:border-[#F1AD26] hover:bg-muted/50'
                      }`}
                      style={{ color: agencyTierFilter.showAll ? 'white' : '#22211A' }}
                    >
                      全て
                    </button>
                    <button
                      onClick={() => setAgencyTierFilter({ showAll: false, showPrimary: true, showSecondary: false })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        !agencyTierFilter.showAll && agencyTierFilter.showPrimary && !agencyTierFilter.showSecondary
                          ? 'border-[#F1AD26] bg-[#F1AD26] text-white'
                          : 'border-[#22211A40] hover:border-[#F1AD26] hover:bg-muted/50'
                      }`}
                      style={{ color: !agencyTierFilter.showAll && agencyTierFilter.showPrimary && !agencyTierFilter.showSecondary ? 'white' : '#22211A' }}
                    >
                      一次
                    </button>
                    <button
                      onClick={() => setAgencyTierFilter({ showAll: false, showPrimary: false, showSecondary: true })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        !agencyTierFilter.showAll && !agencyTierFilter.showPrimary && agencyTierFilter.showSecondary
                          ? 'border-[#F1AD26] bg-[#F1AD26] text-white'
                          : 'border-[#22211A40] hover:border-[#F1AD26] hover:bg-muted/50'
                      }`}
                      style={{ color: !agencyTierFilter.showAll && !agencyTierFilter.showPrimary && agencyTierFilter.showSecondary ? 'white' : '#22211A' }}
                    >
                      二次
                    </button>
                  </div>
                </div>
              </div>

              {/* イベントタイプフィルター */}
              <div className="p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: '#22211A' }} />
                    <span className="text-sm font-medium" style={{ color: '#22211A' }}>種別:</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(61, 174, 108, 0.1)', color: '#3dae6c' }}>
                      {getEventTypeFilterDisplayName(eventTypeFilter)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEventTypeFilter({ showAll: true, showGaihan: false, showTento: false })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        eventTypeFilter.showAll
                          ? 'border-[#3dae6c] bg-[#3dae6c] text-white'
                          : 'border-[#22211A40] hover:border-[#3dae6c] hover:bg-muted/50'
                      }`}
                      style={{ color: eventTypeFilter.showAll ? 'white' : '#22211A' }}
                    >
                      全て
                    </button>
                    <button
                      onClick={() => setEventTypeFilter({ showAll: false, showGaihan: true, showTento: false })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        !eventTypeFilter.showAll && eventTypeFilter.showGaihan && !eventTypeFilter.showTento
                          ? 'border-[#3dae6c] bg-[#3dae6c] text-white'
                          : 'border-[#22211A40] hover:border-[#3dae6c] hover:bg-muted/50'
                      }`}
                      style={{ color: !eventTypeFilter.showAll && eventTypeFilter.showGaihan && !eventTypeFilter.showTento ? 'white' : '#22211A' }}
                    >
                      外販
                    </button>
                    <button
                      onClick={() => setEventTypeFilter({ showAll: false, showGaihan: false, showTento: true })}
                      className={`px-2 py-1 text-xs rounded-lg transition-all border ${
                        !eventTypeFilter.showAll && !eventTypeFilter.showGaihan && eventTypeFilter.showTento
                          ? 'border-[#3dae6c] bg-[#3dae6c] text-white'
                          : 'border-[#22211A40] hover:border-[#3dae6c] hover:bg-muted/50'
                      }`}
                      style={{ color: !eventTypeFilter.showAll && !eventTypeFilter.showGaihan && eventTypeFilter.showTento ? 'white' : '#22211A' }}
                    >
                      店頭
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {monthlyStats.totalEvents}
                </div>
                <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                  対象<br />イベント数
                </div>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {monthlyStats.achievedEvents}
                </div>
                <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                  達成<br />イベント数
                </div>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {monthlyStats.achievementRate}%
                </div>
                <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                  イベント<br />達成率
                </div>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {monthlyStats.mnpRatio}%
                </div>
                <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                  当月<br />MNP比率
                </div>
                <div className="text-xs mt-1" style={{ color: '#22211A' }}>
                  MNP: {monthlyStats.totalMnp}件<br />新規: {monthlyStats.totalNew}件
                </div>
              </div>
            </div>

            {/* 円グラフセクション */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* イベント達成状況円グラフ */}
              <div className="bg-gray-50 rounded-xl p-3 md:p-4 border" style={{ borderColor: '#22211A20' }}>
                <h3 className="text-sm md:text-lg font-semibold mb-3 md:mb-4 text-center" style={{ color: '#22211A' }}>
                  <span className="whitespace-nowrap">イベント達成状況</span>
                </h3>
                <div className="h-48" style={{ minHeight: '192px' }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: '達成', value: monthlyStats.achievedEvents, color: COLORS[0] },
                          { name: '未達成', value: monthlyStats.totalEvents - monthlyStats.achievedEvents, color: COLORS[10] }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={30}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        <Cell fill={COLORS[0]} />
                        <Cell fill={COLORS[10]} />
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value}件`, name]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #22211A',
                          borderRadius: '8px',
                          color: '#22211A'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-1">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[0] }}></div>
                      <span className="text-sm font-semibold" style={{ color: '#22211A' }}>達成</span>
                    </div>
                    <span className="text-xs" style={{ color: '#22211A' }}>({monthlyStats.achievedEvents}件)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-1">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[10] }}></div>
                      <span className="text-sm font-semibold" style={{ color: '#22211A' }}>未達成</span>
                    </div>
                    <span className="text-xs" style={{ color: '#22211A' }}>({monthlyStats.totalEvents - monthlyStats.achievedEvents}件)</span>
                  </div>
                </div>
              </div>

              {/* MNP/新規比率円グラフ */}
              <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
                <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#22211A' }}>MNP/新規比率</h3>
                <div className="h-48" style={{ minHeight: '192px' }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'MNP',
                            value: monthlyStats.totalMnp,
                            color: COLORS[0]
                          },
                          {
                            name: '新規',
                            value: monthlyStats.totalNew,
                            color: COLORS[1]
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={30}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        <Cell fill={COLORS[0]} />
                        <Cell fill={COLORS[1]} />
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value}件`, name]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #22211A',
                          borderRadius: '8px',
                          color: '#22211A'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-1">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[0] }}></div>
                      <span className="text-sm font-semibold" style={{ color: '#22211A' }}>MNP</span>
                    </div>
                    <span className="text-xs" style={{ color: '#22211A' }}>({monthlyStats.totalMnp}件)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-1">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[1] }}></div>
                      <span className="text-sm font-semibold" style={{ color: '#22211A' }}>新規</span>
                    </div>
                    <span className="text-xs" style={{ color: '#22211A' }}>({monthlyStats.totalNew}件)</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <div className="text-lg font-bold" style={{ color: '#22211A' }}>
                    MNP比率: {monthlyStats.mnpRatio}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* メモ機能パネル */}
          <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <StickyNote className="w-6 h-6 mr-3" style={{ color: '#22211A' }} />
                <h2 className="text-2xl font-bold" style={{ color: '#22211A' }}>
                  メモ
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveMemo}
                      className="flex items-center px-3 py-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-all border"
                      style={{ borderColor: '#22211A', color: '#22211A' }}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted/50 transition-all"
                      style={{ borderColor: '#22211A', color: '#22211A' }}
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditMemo}
                    className="flex items-center px-3 py-1.5 bg-muted rounded-lg hover:bg-muted/80 transition-all border"
                    style={{ borderColor: '#22211A', color: '#22211A' }}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    編集
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full h-48 p-3 bg-background/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                style={{ border: '1px solid #22211A', color: '#22211A' }}
                placeholder="ここにメモを入力してください..."
              />
            ) : (
              <div className="min-h-[192px] p-3 bg-background/50 rounded-lg" style={{ border: '1px solid #22211A' }}>
                {savedMemo ? (
                  <div className="whitespace-pre-wrap" style={{ color: '#22211A' }}>
                    {savedMemo}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[168px] text-center" style={{ color: '#22211A', opacity: 0.6 }}>
                    <div>
                      <StickyNote className="w-8 h-8 mx-auto mb-2" style={{ color: '#22211A', opacity: 0.4 }} />
                      <p>メモを追加するには「編集」ボタンをクリック</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 text-xs" style={{ color: '#22211A', opacity: 0.7 }}>
              メモはブラウザのローカルストレージに保存されます
            </div>
          </div>
        </div>

        {/* 商流別・イベントタイプ別統計 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 商流別統計パネル */}
          <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center mb-6">
              <TrendingUp className="w-6 h-6 mr-3" style={{ color: '#22211A' }} />
              <h2 className="text-2xl font-bold" style={{ color: '#22211A' }}>
                商流別統計
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 一次代理店 */}
              <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
                <h3 className="text-lg font-semibold mb-3 text-center" style={{ color: '#22211A' }}>一次</h3>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>イベント数</div>
                    <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{agencyTierStats.primary.count}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>合計HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[0] }}>{agencyTierStats.primary.totalHS}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>平均HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[0] }}>{agencyTierStats.primary.avgHS}件</div>
                  </div>
                </div>
              </div>

              {/* 二次代理店 */}
              <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
                <h3 className="text-lg font-semibold mb-3 text-center" style={{ color: '#22211A' }}>二次</h3>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>イベント数</div>
                    <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{agencyTierStats.secondary.count}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>合計HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[1] }}>{agencyTierStats.secondary.totalHS}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>平均HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[1] }}>{agencyTierStats.secondary.avgHS}件</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 商流別比較バーチャート */}
            <div className="mt-6 bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
              <h3 className="text-sm font-semibold mb-3 text-center" style={{ color: '#22211A' }}>商流別HS数比較</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={[
                    { name: '一次', hs: agencyTierStats.primary.totalHS, avg: agencyTierStats.primary.avgHS },
                    { name: '二次', hs: agencyTierStats.secondary.totalHS, avg: agencyTierStats.secondary.avgHS }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS[10]} />
                    <XAxis dataKey="name" stroke="#22211A" fontSize={12} />
                    <YAxis stroke="#22211A" fontSize={11} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}件`,
                        name === 'hs' ? '合計HS数' : '平均HS数'
                      ]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #22211A',
                        borderRadius: '8px',
                        color: '#22211A'
                      }}
                    />
                    <Legend
                      formatter={(value) => value === 'hs' ? '合計HS数' : '平均HS数'}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="hs" fill={COLORS[0]} animationBegin={0} animationDuration={800} />
                    <Bar dataKey="avg" fill={COLORS[3]} animationBegin={0} animationDuration={800} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* イベントタイプ別統計パネル */}
          <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center mb-6">
              <Store className="w-6 h-6 mr-3" style={{ color: '#22211A' }} />
              <h2 className="text-2xl font-bold" style={{ color: '#22211A' }}>
                イベントタイプ別統計
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 外販 */}
              <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
                <h3 className="text-lg font-semibold mb-3 text-center" style={{ color: '#22211A' }}>外販</h3>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>イベント数</div>
                    <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{eventTypeStats.gaihan.count}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>合計HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[0] }}>{eventTypeStats.gaihan.totalHS}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>平均HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[0] }}>{eventTypeStats.gaihan.avgHS}件</div>
                  </div>
                </div>
              </div>

              {/* 店頭 */}
              <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
                <h3 className="text-lg font-semibold mb-3 text-center" style={{ color: '#22211A' }}>店頭</h3>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>イベント数</div>
                    <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{eventTypeStats.tento.count}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>合計HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[1] }}>{eventTypeStats.tento.totalHS}件</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs mb-1" style={{ color: '#22211A', opacity: 0.7 }}>平均HS数</div>
                    <div className="text-xl font-bold" style={{ color: COLORS[1] }}>{eventTypeStats.tento.avgHS}件</div>
                  </div>
                </div>
              </div>
            </div>

            {/* イベントタイプ別比較バーチャート */}
            <div className="mt-6 bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
              <h3 className="text-sm font-semibold mb-3 text-center" style={{ color: '#22211A' }}>イベントタイプ別HS数比較</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={[
                    { name: '外販', hs: eventTypeStats.gaihan.totalHS, avg: eventTypeStats.gaihan.avgHS },
                    { name: '店頭', hs: eventTypeStats.tento.totalHS, avg: eventTypeStats.tento.avgHS }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS[10]} />
                    <XAxis dataKey="name" stroke="#22211A" fontSize={12} />
                    <YAxis stroke="#22211A" fontSize={11} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}件`,
                        name === 'hs' ? '合計HS数' : '平均HS数'
                      ]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #22211A',
                        borderRadius: '8px',
                        color: '#22211A'
                      }}
                    />
                    <Legend
                      formatter={(value) => value === 'hs' ? '合計HS数' : '平均HS数'}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="hs" fill={COLORS[0]} animationBegin={0} animationDuration={800} />
                    <Bar dataKey="avg" fill={COLORS[3]} animationBegin={0} animationDuration={800} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 当月の週毎ID数グラフと月次イベント達成率推移のグリッド */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* 当月の週毎ID数グラフ */}
          <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center mb-6">
              <BarChart className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              <h2 className="text-lg font-bold" style={{ color: '#22211A' }}>
                {currentTime.getFullYear()}年{currentTime.getMonth() + 1}月 当月週次獲得実績
              </h2>
            </div>

            {weeklyIdData.length > 0 ? (
              <div className="h-80" style={{ minHeight: '320px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <RechartsBarChart data={weeklyIdData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS[10]} />
                    <XAxis
                      dataKey="week"
                      stroke={COLORS[0]}
                      fontSize={11}
                    />
                    <YAxis
                      stroke={COLORS[0]}
                      fontSize={11}
                      tickFormatter={(value) => `${value.toLocaleString()}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const mnp = payload.find(p => p.dataKey === 'mnp')?.value || 0
                          const newCount = payload.find(p => p.dataKey === 'new')?.value || 0
                          const total = Number(mnp) + Number(newCount)
                          return (
                            <div style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #22211A',
                              borderRadius: '8px',
                              padding: '12px',
                              color: '#22211A'
                            }}>
                              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
                              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  backgroundColor: COLORS[0],
                                  marginRight: '8px',
                                  borderRadius: '2px'
                                }}></span>
                                MNP: {Number(mnp).toLocaleString()}件
                              </p>
                              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  backgroundColor: COLORS[1],
                                  marginRight: '8px',
                                  borderRadius: '2px'
                                }}></span>
                                新規: {Number(newCount).toLocaleString()}件
                              </p>
                              <p style={{ margin: '8px 0 0 0', paddingTop: '8px', borderTop: '1px solid rgba(34, 33, 26, 0.2)', fontWeight: 'bold' }}>
                                合計: {total.toLocaleString()}件
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#22211A' }}
                    />
                    <Bar
                      dataKey="mnp"
                      fill={COLORS[0]}
                      name="MNP"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                    <Bar
                      dataKey="new"
                      fill={COLORS[1]}
                      name="新規"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: '#22211A', opacity: 0.6 }}>
                <BarChart className="w-8 h-8 mx-auto mb-2" style={{ color: '#22211A', opacity: 0.4 }} />
                <p className="text-sm">当月のデータが見つかりませんでした</p>
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#22211A' }}>対象期間: {currentTime.getFullYear()}年{currentTime.getMonth() + 1}月</span>
                <span style={{ color: '#22211A' }}>総ID数: {weeklyIdData.reduce((sum: number, week: any) => sum + week.totalIds, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 月次イベント達成率推移 */}
          <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center mb-6">
              <TrendingUp className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              <h2 className="text-lg font-bold" style={{ color: '#22211A' }}>
                月次イベント達成率推移
              </h2>
            </div>

            <div className="h-80" style={{ minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <LineChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS[10]} />
                  <XAxis
                    dataKey="monthLabel"
                    stroke={COLORS[0]}
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke={COLORS[0]}
                    fontSize={11}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, '達成率']}
                    labelFormatter={(label) => `期間: ${label}`}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #22211A',
                      borderRadius: '8px',
                      color: '#22211A'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#22211A' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="achievementRate"
                    stroke={COLORS[0]}
                    strokeWidth={3}
                    dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS[0], strokeWidth: 2, fill: '#ffffff' }}
                    name="イベント達成率"
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#22211A' }}>データ期間: {yearlyData.length > 0 ? `${yearlyData[0]?.monthLabel} 〜 ${yearlyData[yearlyData.length - 1]?.monthLabel}` : '未登録'}</span>
                <span style={{ color: '#22211A' }}>総データ数: {yearlyData.length}ヶ月分</span>
              </div>
            </div>
          </div>
        </div>

        {/* ランキングセクション */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* イベント別ID総合獲得ランキング */}
          <div className="glass rounded-lg border p-4" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center mb-4">
            <Trophy className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
            <h2 className="text-xl font-bold" style={{ color: '#22211A' }}>
              当月獲得実績ランキング（TOP5）
            </h2>
          </div>

          {eventRanking.length > 0 ? (
            <div className="space-y-2">
              {eventRanking.map((event, index) => {
                // 順位を計算（同率対応）
                let rank = 1
                for (let i = 0; i < index; i++) {
                  if (eventRanking[i].totalIds > event.totalIds) {
                    rank++
                  }
                }
                const displayIndex = rank - 1

                return (
                <Link
                  key={event.id}
                  href={`/view/${event.id}`}
                  className="block transition-all duration-200 hover:scale-[1.01]"
                >
                  <div
                    className="flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:border-[#FFB300] cursor-pointer"
                    style={{
                      borderColor: '#22211A20',
                      backgroundColor: displayIndex < 3 ? `rgba(255, 179, 0, ${0.08 - displayIndex * 0.01})` : 'rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs"
                           style={{
                             backgroundColor: displayIndex === 0 ? '#FFB300' : displayIndex === 1 ? '#C0C0C0' : displayIndex === 2 ? '#CD7F32' : '#22211A15',
                             color: displayIndex < 3 ? '#FFFFFF' : '#22211A'
                           }}>
                        {displayIndex < 3 ? (
                          displayIndex === 0 ? <Trophy className="w-3 h-3" /> :
                          displayIndex === 1 ? <Award className="w-3 h-3" /> :
                          <Medal className="w-3 h-3" />
                        ) : (
                          rank
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: '#22211A' }}>
                          {event.eventName}
                        </div>
                        <div className="text-xs opacity-70" style={{ color: '#22211A' }}>
                          {event.staffCount}名・{event.startDate}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: displayIndex < 3 ? '#FFB300' : '#22211A' }}>
                        {event.totalIds.toLocaleString()}
                      </div>
                      <div className="text-xs opacity-70" style={{ color: '#22211A' }}>
                        MNP：{event.auMnp + event.uqMnp} 新規：{event.auNew + event.uqNew}
                      </div>
                    </div>
                  </div>
                </Link>
              )
              })}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#22211A', opacity: 0.6 }}>
              <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: '#22211A', opacity: 0.4 }} />
              <p className="text-sm">実績データが見つかりませんでした</p>
            </div>
          )}
          </div>

          {/* スタッフ当月ID獲得ランキング */}
          <div className="glass rounded-lg border p-4" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
              <h2 className="text-xl font-bold" style={{ color: '#22211A' }}>
                スタッフ当月獲得実績ランキング（TOP5）
              </h2>
            </div>

            {staffRanking.length > 0 ? (
              <div className="space-y-2">
                {staffRanking.map((staff, index) => {
                  // 順位を計算（同率対応）
                  let rank = 1
                  for (let i = 0; i < index; i++) {
                    if (staffRanking[i].totalIds > staff.totalIds) {
                      rank++
                    }
                  }
                  const displayIndex = rank - 1

                  return (
                  <div
                    key={staff.staffName}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{
                      borderColor: '#22211A20',
                      backgroundColor: displayIndex < 3 ? `rgba(255, 179, 0, ${0.08 - displayIndex * 0.01})` : 'rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs"
                           style={{
                             backgroundColor: displayIndex === 0 ? '#FFB300' : displayIndex === 1 ? '#C0C0C0' : displayIndex === 2 ? '#CD7F32' : '#22211A15',
                             color: displayIndex < 3 ? '#FFFFFF' : '#22211A'
                           }}>
                        {displayIndex < 3 ? (
                          displayIndex === 0 ? <Trophy className="w-3 h-3" /> :
                          displayIndex === 1 ? <Award className="w-3 h-3" /> :
                          <Medal className="w-3 h-3" />
                        ) : (
                          rank
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: '#22211A' }}>
                          {staff.staffName}
                        </div>
                        <div className="text-xs opacity-70" style={{ color: '#22211A' }}>
                          参加イベント: {staff.eventCount}件
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: displayIndex < 3 ? '#FFB300' : '#22211A' }}>
                        {staff.totalIds.toLocaleString()}
                      </div>
                      <div className="text-xs opacity-70" style={{ color: '#22211A' }}>
                        MNP：{staff.mnp} 新規：{staff.new}
                      </div>
                    </div>
                  </div>
                )
                })}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: '#22211A', opacity: 0.6 }}>
                <User className="w-8 h-8 mx-auto mb-2" style={{ color: '#22211A', opacity: 0.4 }} />
                <p className="text-sm">スタッフ実績データが見つかりませんでした</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}