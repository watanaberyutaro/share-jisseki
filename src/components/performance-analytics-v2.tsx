'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Calendar, Award, Filter, Search, MapPin, Building2, ChevronDown, Download, GitCompare, Trophy, Medal } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { LoadingAnimation } from '@/components/loading-animation'
import { MonthlyAchievementStatus } from '@/components/monthly-achievement-status'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface EventSummary {
  id: string
  venue: string
  agency_name: string
  year: number
  month: number
  week_number: number
  period_display: string
  event_days: number
  target_hs_total: number
  actual_hs_total: number
  actual_au_mnp: number
  actual_uq_mnp: number
  actual_au_new: number
  actual_uq_new: number
  created_at: string
}

const COLORS = [
  '#4abf79', '#7cd08e', '#a6e09e',
  '#ffd942', '#ffe680', '#ffedb3', '#fff5e0',
  '#3dae6c', '#FFB300', '#DCEDC8', '#b7e59e', '#c8e6c9', '#f9e79f',
  '#ffbb00', '#f8d549', '#f4e3a4', '#aed581',
  '#ffcc80', '#ffab91', '#ffe0b2', '#e8e2ce', '#dcedc8', '#2c9b5e',
  '#81c784', '#66bb6a', '#4db6ac', '#26a69a', '#ffd54f', '#ffca28'
]

// カスタムラベルコンポーネント - 実績レベル分析用
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent, index }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 35; // ラベルを円の外側に配置（さらに遠く）
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const fillColor = COLORS[index % COLORS.length];

  return (
    <text
      x={x}
      y={y}
      fill={fillColor}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="middle"
      style={{
        fontWeight: 'bold',
        fontSize: '10px'
      }}
    >
      {`${name}: ${value}件 (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

// カスタムラベルコンポーネント - 目標達成状況用
const AchievementPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent, fill }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 35; // ラベルを円の外側に配置（さらに遠く）
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="middle"
      style={{
        fontWeight: 'bold',
        fontSize: '10px'
      }}
    >
      {`${name}: ${value}件 (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

interface PerformanceAnalyticsProps {
  includeMonthlyStatus?: boolean
  renderPdfButton?: (onClick: () => void, isGenerating: boolean) => React.ReactNode
}

export function PerformanceAnalyticsV2({
  includeMonthlyStatus = false,
  renderPdfButton
}: PerformanceAnalyticsProps = {}) {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [staffPerformances, setStaffPerformances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all')
  const [venueFilter, setVenueFilter] = useState<string>('all')
  const [agencyFilter, setAgencyFilter] = useState<string>('all')

  // ランキング用の状態
  const [eventRanking, setEventRanking] = useState<any[]>([])
  const [rankingYear, setRankingYear] = useState<number | 'all'>('all')
  const [rankingMonth, setRankingMonth] = useState<number | 'all'>('all')

  // 一括分析条件用の期間選択
  const [bulkStartDate, setBulkStartDate] = useState<string>('')
  const [bulkEndDate, setBulkEndDate] = useState<string>('')

  // 分析実行状態
  const [appliedBulkStartDate, setAppliedBulkStartDate] = useState<string>('')
  const [appliedBulkEndDate, setAppliedBulkEndDate] = useState<string>('')
  const [appliedVenueFilter, setAppliedVenueFilter] = useState<string>('all')
  const [appliedAgencyFilter, setAppliedAgencyFilter] = useState<string>('all')

  // 会場別月次推移グラフ用の状態
  const [selectedVenues, setSelectedVenues] = useState<string[]>([])
  const [chartStartDate, setChartStartDate] = useState<string>('')
  const [chartEndDate, setChartEndDate] = useState<string>('')
  const [isVenueSelectOpen, setIsVenueSelectOpen] = useState(false)

  // 月次イベント達成率推移グラフ用の状態
  const [achievementStartDate, setAchievementStartDate] = useState<string>('')
  const [achievementEndDate, setAchievementEndDate] = useState<string>('')
  const [isAchievementDateManuallySet, setIsAchievementDateManuallySet] = useState(false)

  // 週次実績グラフ用の状態
  const [weeklyStartDate, setWeeklyStartDate] = useState<string>('')
  const [weeklyEndDate, setWeeklyEndDate] = useState<string>('')
  const [isWeeklyDateManuallySet, setIsWeeklyDateManuallySet] = useState(false)

  // 実績レベル分析用の状態
  const [levelStartDate, setLevelStartDate] = useState<string>('')
  const [levelEndDate, setLevelEndDate] = useState<string>('')
  const [isLevelDateManuallySet, setIsLevelDateManuallySet] = useState(false)

  // 目標達成状況用の状態
  const [achievementStatusStartDate, setAchievementStatusStartDate] = useState<string>('')
  const [achievementStatusEndDate, setAchievementStatusEndDate] = useState<string>('')
  const [isAchievementStatusDateManuallySet, setIsAchievementStatusDateManuallySet] = useState(false)

  // 代理店別実績用の状態
  const [agencyStartDate, setAgencyStartDate] = useState<string>('')
  const [agencyEndDate, setAgencyEndDate] = useState<string>('')
  const [isAgencyDateManuallySet, setIsAgencyDateManuallySet] = useState(false)
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([])
  const [isAgencySelectOpen, setIsAgencySelectOpen] = useState(false)

  // 会場別実績用の状態
  const [venueStartDate, setVenueStartDate] = useState<string>('')
  const [venueEndDate, setVenueEndDate] = useState<string>('')
  const [isVenueDateManuallySet, setIsVenueDateManuallySet] = useState(false)
  const [selectedVenuesVenue, setSelectedVenuesVenue] = useState<string[]>([])
  const [isVenueVenueSelectOpen, setIsVenueVenueSelectOpen] = useState(false)

  // スタッフ別週次獲得件数用の状態
  const [staffWeeklyYear, setStaffWeeklyYear] = useState<string>('')
  const [staffWeeklyMonth, setStaffWeeklyMonth] = useState<string>('')
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [isStaffSelectOpen, setIsStaffSelectOpen] = useState(false)

  // イベント別実績用の状態
  const [eventYear, setEventYear] = useState<string>('')
  const [eventMonth, setEventMonth] = useState<string>('')
  const [selectedEventAgencies, setSelectedEventAgencies] = useState<string[]>([])
  const [isEventAgencySelectOpen, setIsEventAgencySelectOpen] = useState(false)

  // PDF生成用のref
  const contentRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('')

  // 比較モーダル用のstate
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareType, setCompareType] = useState<'achievement' | 'weekly' | 'level' | 'achievementStatus' | 'venue' | 'agency' | 'staff' | 'venueMonthly' | 'monthly' | 'ranking' | 'eventWeekly'>('achievement')
  const [compareLeftStart, setCompareLeftStart] = useState<string>('')
  const [compareLeftEnd, setCompareLeftEnd] = useState<string>('')
  const [compareRightStart, setCompareRightStart] = useState<string>('')
  const [compareRightEnd, setCompareRightEnd] = useState<string>('')

  // 比較モーダル用のスタッフ選択
  const [compareSelectedStaff, setCompareSelectedStaff] = useState<string[]>([])
  const [isCompareStaffSelectOpen, setIsCompareStaffSelectOpen] = useState(false)

  // 比較モーダル用の会場選択
  const [compareSelectedVenues, setCompareSelectedVenues] = useState<string[]>([])
  const [isCompareVenueSelectOpen, setIsCompareVenueSelectOpen] = useState(false)

  // イベント別実績比較用の年・月選択
  const [compareLeftEventYear, setCompareLeftEventYear] = useState<string>('')
  const [compareLeftEventMonth, setCompareLeftEventMonth] = useState<string>('')
  const [compareRightEventYear, setCompareRightEventYear] = useState<string>('')
  const [compareRightEventMonth, setCompareRightEventMonth] = useState<string>('')

  useEffect(() => {
    fetchEvents()
    fetchStaffPerformances()
  }, [])

  const fetchStaffPerformances = async () => {
    try {
      const response = await fetch('/api/performances/staff')
      if (!response.ok) throw new Error('Failed to fetch staff performances')
      const data = await response.json()
      setStaffPerformances(data)
    } catch (error) {
      console.error('Error fetching staff performances:', error)
    }
  }

  // ランキング計算
  useEffect(() => {
    if (events.length === 0) return

    const filteredEvents = events.filter((event) => {
      const matchesYear = rankingYear === 'all' || event.year === rankingYear
      const matchesMonth = rankingMonth === 'all' || event.month === rankingMonth
      return matchesYear && matchesMonth
    })

    const allEventRanking = filteredEvents
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

    // トップ5と同率を含める
    let eventRankingData: any[] = []
    if (allEventRanking.length > 0) {
      const top5 = allEventRanking.slice(0, 5)
      if (top5.length === 5) {
        const fifthPlaceScore = top5[4].totalIds
        eventRankingData = allEventRanking.filter((event: any) =>
          event.totalIds >= fifthPlaceScore
        )
      } else {
        eventRankingData = top5
      }
    }

    setEventRanking(eventRankingData)
  }, [events, rankingYear, rankingMonth])

  // 分析実行関数
  const handleAnalyze = () => {
    setAppliedBulkStartDate(bulkStartDate)
    setAppliedBulkEndDate(bulkEndDate)
    setAppliedVenueFilter(venueFilter)
    setAppliedAgencyFilter(agencyFilter)
  }

  // 一括分析条件の期間選択が変更されたときに各パネルに反映
  useEffect(() => {
    if (appliedBulkStartDate && appliedBulkEndDate) {
      const bulkStartDate = appliedBulkStartDate
      const bulkEndDate = appliedBulkEndDate
      // 手動で設定されていない場合のみ反映
      if (!isAchievementDateManuallySet) {
        setAchievementStartDate(bulkStartDate)
        setAchievementEndDate(bulkEndDate)
      }
      if (!isWeeklyDateManuallySet) {
        setWeeklyStartDate(bulkStartDate)
        setWeeklyEndDate(bulkEndDate)
      }
      if (!isLevelDateManuallySet) {
        setLevelStartDate(bulkStartDate)
        setLevelEndDate(bulkEndDate)
      }
      if (!isAchievementStatusDateManuallySet) {
        setAchievementStatusStartDate(bulkStartDate)
        setAchievementStatusEndDate(bulkEndDate)
      }
      if (!isAgencyDateManuallySet) {
        setAgencyStartDate(bulkStartDate)
        setAgencyEndDate(bulkEndDate)
      }
      if (!isVenueDateManuallySet) {
        setVenueStartDate(bulkStartDate)
        setVenueEndDate(bulkEndDate)
      }
      // スタッフ別週次は年月選択なので一括設定対象外
    }
  }, [appliedBulkStartDate, appliedBulkEndDate, isAchievementDateManuallySet, isWeeklyDateManuallySet, isLevelDateManuallySet, isAchievementStatusDateManuallySet, isAgencyDateManuallySet, isVenueDateManuallySet])

  // ページトップのフィルターが変更されたときに全パネルの期間を反映
  useEffect(() => {
    if (yearFilter !== 'all' && monthFilter !== 'all') {
      // 年と月が両方指定されている場合、その月を設定
      const yearStr = yearFilter.toString()
      const monthStr = monthFilter.toString().padStart(2, '0')
      const dateStr = `${yearStr}-${monthStr}`

      // 手動で設定されていない場合のみ反映
      if (!isAchievementDateManuallySet) {
        setAchievementStartDate(dateStr)
        setAchievementEndDate(dateStr)
      }
      if (!isWeeklyDateManuallySet) {
        setWeeklyStartDate(dateStr)
        setWeeklyEndDate(dateStr)
      }
      if (!isLevelDateManuallySet) {
        setLevelStartDate(dateStr)
        setLevelEndDate(dateStr)
      }
      if (!isAchievementStatusDateManuallySet) {
        setAchievementStatusStartDate(dateStr)
        setAchievementStatusEndDate(dateStr)
      }
      if (!isAgencyDateManuallySet) {
        setAgencyStartDate(dateStr)
        setAgencyEndDate(dateStr)
      }
      if (!isVenueDateManuallySet) {
        setVenueStartDate(dateStr)
        setVenueEndDate(dateStr)
      }
      // スタッフ別週次は年月で設定
      setStaffWeeklyYear(yearFilter.toString())
      setStaffWeeklyMonth(monthFilter.toString())
    } else if (yearFilter !== 'all' && monthFilter === 'all') {
      // 年のみ指定されている場合、その年の1月から12月を設定
      const yearStr = yearFilter.toString()

      if (!isAchievementDateManuallySet) {
        setAchievementStartDate(`${yearStr}-01`)
        setAchievementEndDate(`${yearStr}-12`)
      }
      if (!isWeeklyDateManuallySet) {
        setWeeklyStartDate(`${yearStr}-01`)
        setWeeklyEndDate(`${yearStr}-12`)
      }
      if (!isLevelDateManuallySet) {
        setLevelStartDate(`${yearStr}-01`)
        setLevelEndDate(`${yearStr}-12`)
      }
      if (!isAchievementStatusDateManuallySet) {
        setAchievementStatusStartDate(`${yearStr}-01`)
        setAchievementStatusEndDate(`${yearStr}-12`)
      }
      if (!isAgencyDateManuallySet) {
        setAgencyStartDate(`${yearStr}-01`)
        setAgencyEndDate(`${yearStr}-12`)
      }
      if (!isVenueDateManuallySet) {
        setVenueStartDate(`${yearStr}-01`)
        setVenueEndDate(`${yearStr}-12`)
      }
      // スタッフ別週次は年のみ設定、月はクリア
      setStaffWeeklyYear(yearFilter.toString())
      setStaffWeeklyMonth('')
    } else if (yearFilter === 'all' && monthFilter !== 'all') {
      // 月のみ指定されている場合は何もしない（年が必要）
      // 期間選択はクリア
      if (!isAchievementDateManuallySet) {
        setAchievementStartDate('')
        setAchievementEndDate('')
      }
      if (!isWeeklyDateManuallySet) {
        setWeeklyStartDate('')
        setWeeklyEndDate('')
      }
      if (!isLevelDateManuallySet) {
        setLevelStartDate('')
        setLevelEndDate('')
      }
      if (!isAchievementStatusDateManuallySet) {
        setAchievementStatusStartDate('')
        setAchievementStatusEndDate('')
      }
      if (!isAgencyDateManuallySet) {
        setAgencyStartDate('')
        setAgencyEndDate('')
      }
      if (!isVenueDateManuallySet) {
        setVenueStartDate('')
        setVenueEndDate('')
      }
      // スタッフ別週次をクリア
      setStaffWeeklyYear('')
      setStaffWeeklyMonth('')
    } else {
      // 全て「all」の場合は期間選択をクリア
      if (!isAchievementDateManuallySet) {
        setAchievementStartDate('')
        setAchievementEndDate('')
      }
      if (!isWeeklyDateManuallySet) {
        setWeeklyStartDate('')
        setWeeklyEndDate('')
      }
      if (!isLevelDateManuallySet) {
        setLevelStartDate('')
        setLevelEndDate('')
      }
      if (!isAchievementStatusDateManuallySet) {
        setAchievementStatusStartDate('')
        setAchievementStatusEndDate('')
      }
      if (!isAgencyDateManuallySet) {
        setAgencyStartDate('')
        setAgencyEndDate('')
      }
      if (!isVenueDateManuallySet) {
        setVenueStartDate('')
        setVenueEndDate('')
      }
      // スタッフ別週次をクリア
      setStaffWeeklyYear('')
      setStaffWeeklyMonth('')
    }
  }, [yearFilter, monthFilter, isAchievementDateManuallySet, isWeeklyDateManuallySet, isLevelDateManuallySet, isAchievementStatusDateManuallySet, isAgencyDateManuallySet, isVenueDateManuallySet])

  // 外部クリックでポップアップを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isVenueSelectOpen && !target.closest('.venue-select-container')) {
        setIsVenueSelectOpen(false)
      }
      if (isStaffSelectOpen && !target.closest('.staff-select-container')) {
        setIsStaffSelectOpen(false)
      }
      if (isAgencySelectOpen && !target.closest('.agency-select-container')) {
        setIsAgencySelectOpen(false)
      }
      if (isVenueVenueSelectOpen && !target.closest('.venue-venue-select-container')) {
        setIsVenueVenueSelectOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVenueSelectOpen, isStaffSelectOpen, isAgencySelectOpen, isVenueVenueSelectOpen])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/performances/enhanced-v2')
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter(event => {
    return (
      (yearFilter === 'all' || event.year === yearFilter) &&
      (monthFilter === 'all' || event.month === monthFilter) &&
      (weekFilter === 'all' || event.week_number === weekFilter) &&
      (venueFilter === 'all' || event.venue === venueFilter) &&
      (agencyFilter === 'all' || event.agency_name === agencyFilter)
    )
  })

  const getAnalysisData = () => {
    if (filteredEvents.length === 0) {
      return {
        monthlyTrend: [],
        monthlyAchievementTrend: [],
        weeklyStats: [],
        performanceLevels: [],
        achievementStats: { achieved: 0, notAchieved: 0, noTarget: 0 },
        venueStats: [],
        agencyStats: [],
        venueMonthlyTrend: [],
        staffWeeklyStats: [],
        eventWeeklyStats: []
      }
    }

    // 月次トレンド
    const monthlyData = filteredEvents.reduce((acc, event) => {
      const key = `${event.year}-${String(event.month).padStart(2, '0')}`
      if (!acc[key]) {
        acc[key] = { period: key, totalSales: 0, count: 0 }
      }
      acc[key].totalSales += event.actual_hs_total
      acc[key].count += 1
      return acc
    }, {} as Record<string, any>)

    const monthlyTrend = Object.values(monthlyData).map((item: any) => ({
      ...item,
      averageSales: Math.round(item.totalSales / item.count)
    })).sort((a: any, b: any) => a.period.localeCompare(b.period))

    // 月次イベント達成率推移
    const monthlyAchievementData = filteredEvents.reduce((acc, event) => {
      const key = `${event.year}/${String(event.month).padStart(2, '0')}`
      if (!acc[key]) {
        acc[key] = {
          period: key,
          totalEvents: 0,
          achievedEvents: 0,
          achievementRate: 0
        }
      }
      if (event.target_hs_total > 0) {
        acc[key].totalEvents += 1
        if (event.actual_hs_total >= event.target_hs_total) {
          acc[key].achievedEvents += 1
        }
      }
      return acc
    }, {} as Record<string, any>)

    let monthlyAchievementTrend = Object.values(monthlyAchievementData).map((item: any) => ({
      ...item,
      achievementRate: item.totalEvents > 0 ? Math.round((item.achievedEvents / item.totalEvents) * 100) : 0
    })).sort((a: any, b: any) => a.period.localeCompare(b.period))

    // 期間フィルターを適用
    if (achievementStartDate && achievementEndDate) {
      monthlyAchievementTrend = monthlyAchievementTrend.filter(item =>
        item.period >= achievementStartDate.replace('-', '/') && item.period <= achievementEndDate.replace('-', '/')
      )
    } else if (achievementStartDate) {
      monthlyAchievementTrend = monthlyAchievementTrend.filter(item => item.period >= achievementStartDate.replace('-', '/'))
    } else if (achievementEndDate) {
      monthlyAchievementTrend = monthlyAchievementTrend.filter(item => item.period <= achievementEndDate.replace('-', '/'))
    }

    // 週次統計（MNPと新規の内訳付き）
    const weeklyData = filteredEvents.reduce((acc, event) => {
      const weekLabel = `第${event.week_number}週`
      const sortKey = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.week_number).padStart(2, '0')}`
      const yearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`

      if (!acc[sortKey]) {
        acc[sortKey] = {
          period: weekLabel,
          sortKey,
          yearMonth,
          mnp: 0,
          hs: 0,
          total: 0,
          count: 0
        }
      }

      const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
      const newTotal = event.actual_au_new + event.actual_uq_new

      acc[sortKey].mnp += mnpTotal
      acc[sortKey].hs += newTotal
      acc[sortKey].total += mnpTotal + newTotal
      acc[sortKey].count += 1

      return acc
    }, {} as Record<string, any>)

    let weeklyStats = Object.values(weeklyData)
      .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))

    // 週次実績の期間フィルタリング
    if (weeklyStartDate && weeklyEndDate) {
      weeklyStats = weeklyStats.filter(item => item.yearMonth >= weeklyStartDate && item.yearMonth <= weeklyEndDate)
    } else if (weeklyStartDate) {
      weeklyStats = weeklyStats.filter(item => item.yearMonth >= weeklyStartDate)
    } else if (weeklyEndDate) {
      weeklyStats = weeklyStats.filter(item => item.yearMonth <= weeklyEndDate)
    } else {
      // フィルタなしの場合は最新8週分のみ表示
      weeklyStats = weeklyStats.slice(-8)
    }

    // 実績レベル分析用のイベントフィルタリング
    let levelAnalysisEvents = filteredEvents
    if (levelStartDate && levelEndDate) {
      levelAnalysisEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= levelStartDate && eventYearMonth <= levelEndDate
      })
    } else if (levelStartDate) {
      levelAnalysisEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= levelStartDate
      })
    } else if (levelEndDate) {
      levelAnalysisEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth <= levelEndDate
      })
    }

    // 実績レベル分析
    const performanceLevels = [
      { level: '低(0-5)', count: 0 },
      { level: '標準(6-15)', count: 0 },
      { level: '良好(16-25)', count: 0 },
      { level: '優秀(26-35)', count: 0 },
      { level: '卓越(36+)', count: 0 }
    ]

    levelAnalysisEvents.forEach(event => {
      const total = event.actual_hs_total
      if (total <= 5) performanceLevels[0].count++
      else if (total <= 15) performanceLevels[1].count++
      else if (total <= 25) performanceLevels[2].count++
      else if (total <= 35) performanceLevels[3].count++
      else performanceLevels[4].count++
    })

    // 目標達成状況用のイベントフィルタリング
    let achievementStatusEvents = filteredEvents
    if (achievementStatusStartDate && achievementStatusEndDate) {
      achievementStatusEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= achievementStatusStartDate && eventYearMonth <= achievementStatusEndDate
      })
    } else if (achievementStatusStartDate) {
      achievementStatusEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= achievementStatusStartDate
      })
    } else if (achievementStatusEndDate) {
      achievementStatusEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth <= achievementStatusEndDate
      })
    }

    // 目標達成状況
    const achievementStats = achievementStatusEvents.reduce(
      (acc, event) => {
        if (event.target_hs_total === 0) {
          acc.noTarget++
        } else if (event.actual_hs_total >= event.target_hs_total) {
          acc.achieved++
        } else {
          acc.notAchieved++
        }
        return acc
      },
      { achieved: 0, notAchieved: 0, noTarget: 0 }
    )

    // 会場別実績用のイベントフィルタリング
    let venueStatsEvents = filteredEvents
    if (venueStartDate && venueEndDate) {
      venueStatsEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= venueStartDate && eventYearMonth <= venueEndDate
      })
    } else if (venueStartDate) {
      venueStatsEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= venueStartDate
      })
    } else if (venueEndDate) {
      venueStatsEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth <= venueEndDate
      })
    }

    // 会場別統計
    const venueData = venueStatsEvents.reduce((acc, event) => {
      if (!acc[event.venue]) {
        acc[event.venue] = { venue: event.venue, mnp: 0, hs: 0, total: 0, count: 0 }
      }
      const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
      const newTotal = event.actual_au_new + event.actual_uq_new
      acc[event.venue].mnp += mnpTotal
      acc[event.venue].hs += newTotal
      acc[event.venue].total += mnpTotal + newTotal
      acc[event.venue].count += 1
      return acc
    }, {} as Record<string, any>)

    const venueStats = Object.values(venueData).sort((a: any, b: any) => b.total - a.total)

    // 代理店別実績用のイベントフィルタリング
    let agencyStatsEvents = filteredEvents
    if (agencyStartDate && agencyEndDate) {
      agencyStatsEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= agencyStartDate && eventYearMonth <= agencyEndDate
      })
    } else if (agencyStartDate) {
      agencyStatsEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth >= agencyStartDate
      })
    } else if (agencyEndDate) {
      agencyStatsEvents = filteredEvents.filter(event => {
        const eventYearMonth = `${event.year}-${String(event.month).padStart(2, '0')}`
        return eventYearMonth <= agencyEndDate
      })
    }

    // 代理店別統計
    const agencyData = agencyStatsEvents.reduce((acc, event) => {
      if (!acc[event.agency_name]) {
        acc[event.agency_name] = { agency: event.agency_name, mnp: 0, hs: 0, total: 0, count: 0 }
      }
      const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
      const newTotal = event.actual_au_new + event.actual_uq_new
      acc[event.agency_name].mnp += mnpTotal
      acc[event.agency_name].hs += newTotal
      acc[event.agency_name].total += mnpTotal + newTotal
      acc[event.agency_name].count += 1
      return acc
    }, {} as Record<string, any>)

    const agencyStats = Object.values(agencyData).sort((a: any, b: any) => b.total - a.total)

    // 会場別月次推移データ（MNP + HS の合計）
    const venueMonthlyData: Record<string, Record<string, {total: number, mnp: number, hs: number}>> = {}
    filteredEvents.forEach(event => {
      const month = `${event.year}-${String(event.month).padStart(2, '0')}`
      if (!venueMonthlyData[event.venue]) {
        venueMonthlyData[event.venue] = {}
      }
      if (!venueMonthlyData[event.venue][month]) {
        venueMonthlyData[event.venue][month] = {total: 0, mnp: 0, hs: 0}
      }
      const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
      const newTotal = event.actual_au_new + event.actual_uq_new
      venueMonthlyData[event.venue][month].mnp += mnpTotal
      venueMonthlyData[event.venue][month].hs += newTotal
      venueMonthlyData[event.venue][month].total += mnpTotal + newTotal
    })

    // データを折れ線グラフ用に整形
    let allMonths = [...new Set(filteredEvents.map(e => `${e.year}-${String(e.month).padStart(2, '0')}`))].sort()

    // 期間フィルターを適用
    if (chartStartDate && chartEndDate) {
      allMonths = allMonths.filter(month => month >= chartStartDate && month <= chartEndDate)
    } else if (chartStartDate) {
      allMonths = allMonths.filter(month => month >= chartStartDate)
    } else if (chartEndDate) {
      allMonths = allMonths.filter(month => month <= chartEndDate)
    }

    const venueMonthlyTrend = allMonths.map(month => {
      const dataPoint: any = { month }
      Object.keys(venueMonthlyData).forEach(venue => {
        const data = venueMonthlyData[venue][month] || {total: 0, mnp: 0, hs: 0}
        dataPoint[venue] = data.total
        dataPoint[`${venue}_mnp`] = data.mnp
        dataPoint[`${venue}_hs`] = data.hs
      })
      return dataPoint
    })

    // スタッフ別週次実績の集計
    const staffWeeklyData: Record<string, any> = {}

    // デバッグ: データ構造を確認
    console.log('===== スタッフパフォーマンスデータ分析 =====')
    console.log('総レコード数:', staffPerformances.length)
    if (staffPerformances.length > 0) {
      console.log('サンプルデータ:', staffPerformances[0])
      console.log('テーブルのカラム:', Object.keys(staffPerformances[0]))

      // イベントIDごとのレコード数をカウント
      const eventCounts: Record<string, number> = {}
      staffPerformances.forEach((perf: any) => {
        const eventId = perf.event_id
        eventCounts[eventId] = (eventCounts[eventId] || 0) + 1
      })
      console.log('イベントIDごとのレコード数（上位5件）:', Object.entries(eventCounts).slice(0, 5))

      // スタッフ名ごとのレコード数をカウント
      const staffCounts: Record<string, number> = {}
      staffPerformances.forEach((perf: any) => {
        const staffName = perf.staff_name
        if (staffName) {
          staffCounts[staffName] = (staffCounts[staffName] || 0) + 1
        }
      })
      console.log('スタッフ名ごとのレコード数（上位5件）:', Object.entries(staffCounts).slice(0, 5))
    }

    staffPerformances.forEach((perf: any) => {
      if (!perf.staff_name) return

      const eventYear = perf.event?.year || new Date(perf.event?.created_at).getFullYear()
      const eventMonth = perf.event?.month || new Date(perf.event?.created_at).getMonth() + 1
      const eventWeek = perf.event?.week_number || 1
      const weekKey = `${eventYear}-W${String(eventWeek).padStart(2, '0')}`
      const yearMonth = `${eventYear}-${String(eventMonth).padStart(2, '0')}`

      if (!staffWeeklyData[weekKey]) {
        staffWeeklyData[weekKey] = { week: `第${eventWeek}週`, sortKey: weekKey, yearMonth }
      }

      // MNPと新規を分けて集計
      const auMnp = (perf.au_mnp_sp1 || 0) + (perf.au_mnp_sp2 || 0) + (perf.au_mnp_sim || 0)
      const uqMnp = (perf.uq_mnp_sp1 || 0) + (perf.uq_mnp_sp2 || 0) + (perf.uq_mnp_sim || 0)
      const auNew = (perf.au_hs_sp1 || 0) + (perf.au_hs_sp2 || 0) + (perf.au_hs_sim || 0)
      const uqNew = (perf.uq_hs_sp1 || 0) + (perf.uq_hs_sp2 || 0) + (perf.uq_hs_sim || 0)
      const cellup = (perf.cell_up_sp1 || 0) + (perf.cell_up_sp2 || 0) + (perf.cell_up_sim || 0)

      const mnpTotal = auMnp + uqMnp
      const newTotal = auNew + uqNew + cellup

      // デバッグ: 最初の数件のデータを詳しく出力
      if (staffPerformances.indexOf(perf) < 3) {
        console.log(`レコード${staffPerformances.indexOf(perf) + 1}:`, {
          staff_name: perf.staff_name,
          event_id: perf.event_id,
          day_number: perf.day_number,
          weekKey,
          mnpTotal,
          newTotal,
          auMnp, uqMnp, auNew, uqNew, cellup
        })
      }

      // スタッフ名_MNP と スタッフ名_新規 で分けて保存
      const mnpKey = `${perf.staff_name}_MNP`
      const newKey = `${perf.staff_name}_新規`

      if (!staffWeeklyData[weekKey][mnpKey]) {
        staffWeeklyData[weekKey][mnpKey] = 0
      }
      if (!staffWeeklyData[weekKey][newKey]) {
        staffWeeklyData[weekKey][newKey] = 0
      }

      staffWeeklyData[weekKey][mnpKey] += mnpTotal
      staffWeeklyData[weekKey][newKey] += newTotal
    })

    console.log('週次集計結果（最初の2週）:', Object.values(staffWeeklyData).slice(0, 2))

    let staffWeeklyStats = Object.values(staffWeeklyData)
      .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))

    // スタッフ別週次獲得件数の期間フィルタリング
    if (staffWeeklyYear && staffWeeklyMonth) {
      const targetYearMonth = `${staffWeeklyYear}-${String(staffWeeklyMonth).padStart(2, '0')}`
      staffWeeklyStats = staffWeeklyStats.filter(item => item.yearMonth === targetYearMonth)
    } else {
      // フィルタなしの場合は最新8週分のみ表示
      staffWeeklyStats = staffWeeklyStats.slice(-8)
    }

    // イベント別実績（週次・会場別）
    let eventWeeklyStats: any[] = []
    if (eventYear && eventMonth) {
      // 年月でフィルタリング（数値型に変換して比較）
      const targetYear = parseInt(eventYear)
      const targetMonth = parseInt(eventMonth)

      let eventFilteredEvents = events.filter((event: any) => {
        const eventYearNum = typeof event.year === 'string' ? parseInt(event.year) : event.year
        const eventMonthNum = typeof event.month === 'string' ? parseInt(event.month) : event.month
        return eventYearNum === targetYear && eventMonthNum === targetMonth
      })

      // 代理店でフィルタリング
      if (selectedEventAgencies.length > 0) {
        eventFilteredEvents = eventFilteredEvents.filter((event: any) =>
          selectedEventAgencies.includes(event.agency_name)
        )
      }

      // 週ごとにグループ化
      const weeklyData: Record<number, any> = {}
      eventFilteredEvents.forEach((event: any) => {
        const weekNum = event.week_number || 1
        if (!weeklyData[weekNum]) {
          weeklyData[weekNum] = {
            week: `第${weekNum}週`,
            weekNumber: weekNum,
            venues: {}
          }
        }

        const venue = event.venue
        if (!weeklyData[weekNum].venues[venue]) {
          weeklyData[weekNum].venues[venue] = {
            venue,
            mnp: 0,
            hs: 0
          }
        }

        weeklyData[weekNum].venues[venue].mnp += (event.actual_au_mnp || 0) + (event.actual_uq_mnp || 0)
        weeklyData[weekNum].venues[venue].hs += (event.actual_au_new || 0) + (event.actual_uq_new || 0)
      })

      // 配列に変換して整形
      eventWeeklyStats = Object.values(weeklyData)
        .map((weekData: any) => {
          const venuesArray = Object.values(weekData.venues)
          const totalMnp = venuesArray.reduce((sum: number, v: any) => sum + v.mnp, 0)
          const totalHs = venuesArray.reduce((sum: number, v: any) => sum + v.hs, 0)

          return {
            week: weekData.week,
            weekNumber: weekData.weekNumber,
            venues: venuesArray,
            totalMnp,
            totalHs,
            total: totalMnp + totalHs
          }
        })
        .sort((a, b) => a.weekNumber - b.weekNumber)
    }

    return {
      monthlyTrend,
      monthlyAchievementTrend,
      weeklyStats,
      performanceLevels,
      achievementStats,
      venueStats,
      agencyStats,
      venueMonthlyTrend,
      staffWeeklyStats,
      eventWeeklyStats
    }
  }

  const analysisData = getAnalysisData()
  const years = [...new Set(events.map(e => e.year))].sort()
  const venues = [...new Set(events.map(e => e.venue))].sort()
  const agencies = [...new Set(events.map(e => e.agency_name))].sort()
  const allStaffNames = [...new Set(staffPerformances.map((p: any) => p.staff_name).filter(Boolean))].sort()
  const availableYears = [...new Set(events.map((e: any) => e.year).filter(Boolean))].sort((a, b) => b - a)
  const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  // ツールチップの共通スタイル
  const tooltipStyle = {
    backgroundColor: '#fffef7',
    border: '2px solid #FFB300',
    borderRadius: '8px',
    color: '#3dae6c',
    fontWeight: 'bold',
    padding: '8px'
  }

  // 円グラフ用のカスタムツールチップスタイル
  const pieTooltipStyle = {
    backgroundColor: '#fffef7',
    border: '2px solid #FFB300',
    borderRadius: '8px',
    fontWeight: 'bold',
    padding: '8px'
  }

  // カスタムツールチップコンポーネント
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const color = data.payload.color || COLORS[data.payload.index % COLORS.length] || data.color;
      return (
        <div style={pieTooltipStyle}>
          <p style={{ color: '#a58a69', margin: '0 0 4px 0', textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)' }}>{label}</p>
          <p style={{ color: color, margin: 0, textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)' }}>
            {`${data.name}: ${data.value}件`}
          </p>
        </div>
      );
    }
    return null;
  };

  // カスタムツールチップコンポーネント - 実績レベル分析用
  const PerformanceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      // 実績レベル分析はフィルターされたデータのインデックスで色を取得
      const filteredData = analysisData.performanceLevels.filter(level => level.count > 0);
      const index = filteredData.findIndex(item => item.level === data.payload.level);
      const color = COLORS[index % COLORS.length];
      return (
        <div style={pieTooltipStyle}>
          <p style={{ color: '#a58a69', margin: '0 0 4px 0', textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)' }}>実績レベル分析</p>
          <p style={{ color: color, margin: 0, textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)' }}>
            {`${data.payload.level}: ${data.value}件`}
          </p>
        </div>
      );
    }
    return null;
  };

  // PDFプレビュー生成関数
  const showPdfPreviewModal = async () => {
    if (!contentRef.current) return

    setIsGeneratingPdf(true)

    try {
      // html2canvasでコンテンツをキャプチャ
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FAFAFA',
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')
      setPreviewImageUrl(imgData)
      setShowPdfPreview(true)

    } catch (error) {
      console.error('プレビュー生成エラー:', error)
      alert('プレビュー生成中にエラーが発生しました')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // 比較モーダルを開く関数
  const openCompareModal = (type: 'achievement' | 'weekly' | 'level' | 'achievementStatus' | 'venue' | 'agency' | 'staff' | 'venueMonthly' | 'monthly' | 'ranking' | 'eventWeekly') => {
    setCompareType(type)
    setCompareLeftStart('')
    setCompareLeftEnd('')
    setCompareRightStart('')
    setCompareRightEnd('')
    setCompareLeftEventYear('')
    setCompareLeftEventMonth('')
    setCompareRightEventYear('')
    setCompareRightEventMonth('')
    // スタッフ比較の場合は全スタッフを選択状態にする
    if (type === 'staff') {
      const allStaffNames = [...new Set(staffPerformances.map((p: any) => p.staff_name).filter(Boolean))].sort()
      setCompareSelectedStaff(allStaffNames)
    }
    // 会場別月次推移の場合は全会場を選択状態にする
    if (type === 'venueMonthly') {
      setCompareSelectedVenues([...venues])
    }
    setCompareModalOpen(true)
  }

  // 比較用のデータをフィルタリング
  const getCompareFilteredEvents = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return []

    const [startYear, startMonth] = startDate.split('-').map(Number)
    const [endYear, endMonth] = endDate.split('-').map(Number)

    return events.filter(event => {
      const eventDate = event.year * 100 + event.month
      const start = startYear * 100 + startMonth
      const end = endYear * 100 + endMonth

      return (
        eventDate >= start &&
        eventDate <= end &&
        (venueFilter === 'all' || event.venue === venueFilter) &&
        (agencyFilter === 'all' || event.agency_name === agencyFilter)
      )
    })
  }

  // イベント別実績の比較用コンポーネント
  const CompareEventWeeklyPanel = ({ year, month }: { year: string, month: string }) => {
    const panelKey = `panel-${year}-${month}`

    if (!year || !month) {
      return (
        <div className="text-center py-20" style={{ color: '#22211A', opacity: 0.6 }}>
          年月を選択してください
        </div>
      )
    }

    // 年月でフィルタリング（数値型に変換して比較）
    const targetYear = parseInt(year)
    const targetMonth = parseInt(month)

    const eventFilteredEvents = events.filter((event: any) => {
      const eventYearNum = typeof event.year === 'string' ? parseInt(event.year) : event.year
      const eventMonthNum = typeof event.month === 'string' ? parseInt(event.month) : event.month
      return eventYearNum === targetYear && eventMonthNum === targetMonth
    })

    if (eventFilteredEvents.length === 0) {
      return (
        <div className="text-center py-20" style={{ color: '#22211A', opacity: 0.6 }}>
          データがありません
        </div>
      )
    }

    // 週ごとにグループ化
    const weeklyData: Record<number, any> = {}
    eventFilteredEvents.forEach((event: any) => {
      const weekNum = event.week_number || 1
      if (!weeklyData[weekNum]) {
        weeklyData[weekNum] = {
          week: `第${weekNum}週`,
          weekNumber: weekNum,
          venues: {}
        }
      }

      const venue = event.venue
      if (!weeklyData[weekNum].venues[venue]) {
        weeklyData[weekNum].venues[venue] = {
          venue,
          mnp: 0,
          hs: 0
        }
      }

      weeklyData[weekNum].venues[venue].mnp += (event.actual_au_mnp || 0) + (event.actual_uq_mnp || 0)
      weeklyData[weekNum].venues[venue].hs += (event.actual_au_new || 0) + (event.actual_uq_new || 0)
    })

    const eventWeeklyStats = Object.values(weeklyData)
      .map((weekData: any) => {
        const venuesArray = Object.values(weekData.venues)
        const totalMnp = venuesArray.reduce((sum: number, v: any) => sum + v.mnp, 0)
        const totalHs = venuesArray.reduce((sum: number, v: any) => sum + v.hs, 0)

        return {
          week: weekData.week,
          weekNumber: weekData.weekNumber,
          venues: venuesArray,
          totalMnp,
          totalHs,
          total: totalMnp + totalHs
        }
      })
      .sort((a, b) => a.weekNumber - b.weekNumber)

    return (
      <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <div className="mb-4">
          <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
            <Calendar className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
            イベント別実績
          </h3>
        </div>
        {eventWeeklyStats && eventWeeklyStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={400} key={panelKey}>
            <BarChart data={eventWeeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
              <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
              <Tooltip
                contentStyle={tooltipStyle}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload
                    return (
                      <div style={{ ...tooltipStyle, maxHeight: '400px', overflowY: 'auto', display: 'block' }}>
                        <p className="font-bold mb-2">{data.week}</p>
                        <p className="mb-1">合計: {data.total}件</p>
                        <p className="mb-2 text-sm">　MNP: {data.totalMnp}件 / 新規: {data.totalHs}件</p>
                        <div className="border-t pt-2 mt-2 pb-2" style={{ borderColor: '#FFB300' }}>
                          <p className="font-semibold mb-1 text-sm">会場別内訳:</p>
                          {data.venues.map((venue: any, idx: number) => (
                            <div key={idx} className="text-sm mb-1">
                              <p className="font-medium">{venue.venue}</p>
                              <p className="ml-2 text-xs">MNP: {venue.mnp}件 / 新規: {venue.hs}件</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Bar dataKey="totalMnp" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
              <Bar dataKey="totalHs" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center" style={{ height: '400px' }}>
            <div className="text-center">
              <p style={{ color: '#22211A', opacity: 0.6 }}>
                表示できるデータがありません
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 各パネルの比較用コンポーネント - 元のパネルと同じデザインで表示
  const ComparePanelWrapper = ({ startDate, endDate, type, selectedStaff, selectedVenues: propSelectedVenues }: { startDate: string, endDate: string, type: string, selectedStaff?: string[], selectedVenues?: string[] }) => {
    if (!startDate || !endDate) {
      return (
        <div className="text-center py-20" style={{ color: '#22211A', opacity: 0.6 }}>
          期間を選択してください
        </div>
      )
    }

    const filteredEvents = getCompareFilteredEvents(startDate, endDate)

    if (filteredEvents.length === 0) {
      return (
        <div className="text-center py-20" style={{ color: '#22211A', opacity: 0.6 }}>
          データがありません
        </div>
      )
    }

    // 分析データを生成
    const getCompareAnalysisData = (events: EventSummary[]) => {
      // 月次達成率推移
      const monthlyAchievementData = events.reduce((acc: any, event) => {
        const key = `${event.year}-${String(event.month).padStart(2, '0')}`
        if (!acc[key]) {
          acc[key] = { period: key, achieved: 0, total: 0 }
        }
        acc[key].total++
        if (event.actual_hs_total >= event.target_hs_total) {
          acc[key].achieved++
        }
        return acc
      }, {})

      const monthlyAchievementTrend = Object.values(monthlyAchievementData).map((item: any) => ({
        period: item.period,
        achievementRate: parseFloat(((item.achieved / item.total) * 100).toFixed(1)),
        achieved: item.achieved,
        total: item.total,
        totalEvents: item.total
      }))

      // 週次実績(MNPと新規の内訳付き)
      const weeklyData = events.reduce((acc: any, event) => {
        const weekLabel = `第${event.week_number}週`
        const sortKey = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.week_number).padStart(2, '0')}`

        if (!acc[sortKey]) {
          acc[sortKey] = {
            period: weekLabel,
            sortKey,
            mnp: 0,
            hs: 0,
            total: 0
          }
        }

        const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
        const newTotal = event.actual_au_new + event.actual_uq_new

        acc[sortKey].mnp += mnpTotal
        acc[sortKey].hs += newTotal
        acc[sortKey].total += mnpTotal + newTotal

        return acc
      }, {})

      const weeklyStats = Object.values(weeklyData).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))

      // 実績レベル分析
      const performanceLevels = [
        { level: '低(0-5)', count: 0 },
        { level: '標準(6-15)', count: 0 },
        { level: '良好(16-25)', count: 0 },
        { level: '優秀(26-35)', count: 0 },
        { level: '卓越(36+)', count: 0 }
      ]

      events.forEach(event => {
        const total = event.actual_hs_total
        if (total <= 5) performanceLevels[0].count++
        else if (total <= 15) performanceLevels[1].count++
        else if (total <= 25) performanceLevels[2].count++
        else if (total <= 35) performanceLevels[3].count++
        else performanceLevels[4].count++
      })

      // 目標達成状況
      const achievementStats = events.reduce(
        (acc, event) => {
          if (event.target_hs_total === 0) {
            acc.noTarget++
          } else if (event.actual_hs_total >= event.target_hs_total) {
            acc.achieved++
          } else {
            acc.notAchieved++
          }
          return acc
        },
        { achieved: 0, notAchieved: 0, noTarget: 0 }
      )

      // 会場別実績
      const venueData = events.reduce((acc: any, event) => {
        if (!acc[event.venue]) {
          acc[event.venue] = { venue: event.venue, mnp: 0, hs: 0, total: 0, count: 0 }
        }
        const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
        const newTotal = event.actual_au_new + event.actual_uq_new
        acc[event.venue].mnp += mnpTotal
        acc[event.venue].hs += newTotal
        acc[event.venue].total += mnpTotal + newTotal
        acc[event.venue].count += 1
        return acc
      }, {})

      const venueStats = Object.values(venueData).sort((a: any, b: any) => b.total - a.total)

      // 代理店別実績
      const agencyData = events.reduce((acc: any, event) => {
        if (!acc[event.agency_name]) {
          acc[event.agency_name] = { agency: event.agency_name, mnp: 0, hs: 0, total: 0, count: 0 }
        }
        const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
        const newTotal = event.actual_au_new + event.actual_uq_new
        acc[event.agency_name].mnp += mnpTotal
        acc[event.agency_name].hs += newTotal
        acc[event.agency_name].total += mnpTotal + newTotal
        acc[event.agency_name].count += 1
        return acc
      }, {})

      const agencyStats = Object.values(agencyData).sort((a: any, b: any) => b.total - a.total)

      // スタッフ別週次実績の集計
      const staffWeeklyData: Record<string, any> = {}

      staffPerformances.forEach((perf: any) => {
        if (!perf.staff_name) return

        const eventYear = perf.event?.year || new Date(perf.event?.created_at).getFullYear()
        const eventMonth = perf.event?.month || new Date(perf.event?.created_at).getMonth() + 1
        const eventWeek = perf.event?.week_number || 1
        const weekKey = `${eventYear}-W${String(eventWeek).padStart(2, '0')}`
        const yearMonth = `${eventYear}-${String(eventMonth).padStart(2, '0')}`

        // 期間フィルタリング
        if (startDate && endDate) {
          if (yearMonth < startDate || yearMonth > endDate) return
        }

        if (!staffWeeklyData[weekKey]) {
          staffWeeklyData[weekKey] = { week: `第${eventWeek}週`, sortKey: weekKey, yearMonth }
        }

        // MNPと新規を分けて集計
        const auMnp = (perf.au_mnp_sp1 || 0) + (perf.au_mnp_sp2 || 0) + (perf.au_mnp_sim || 0)
        const uqMnp = (perf.uq_mnp_sp1 || 0) + (perf.uq_mnp_sp2 || 0) + (perf.uq_mnp_sim || 0)
        const auNew = (perf.au_hs_sp1 || 0) + (perf.au_hs_sp2 || 0) + (perf.au_hs_sim || 0)
        const uqNew = (perf.uq_hs_sp1 || 0) + (perf.uq_hs_sp2 || 0) + (perf.uq_hs_sim || 0)
        const cellup = (perf.cell_up_sp1 || 0) + (perf.cell_up_sp2 || 0) + (perf.cell_up_sim || 0)

        const mnpTotal = auMnp + uqMnp
        const newTotal = auNew + uqNew + cellup

        // スタッフ名_MNP と スタッフ名_新規 で分けて保存
        const mnpKey = `${perf.staff_name}_MNP`
        const newKey = `${perf.staff_name}_新規`

        if (!staffWeeklyData[weekKey][mnpKey]) {
          staffWeeklyData[weekKey][mnpKey] = 0
        }
        if (!staffWeeklyData[weekKey][newKey]) {
          staffWeeklyData[weekKey][newKey] = 0
        }

        staffWeeklyData[weekKey][mnpKey] += mnpTotal
        staffWeeklyData[weekKey][newKey] += newTotal
      })

      const staffWeeklyStats = Object.values(staffWeeklyData)
        .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
        .slice(-8) // 最新8週分

      // 会場別月次推移データ（MNP + HS の合計）
      const venueMonthlyData: Record<string, Record<string, {total: number, mnp: number, hs: number}>> = {}
      events.forEach(event => {
        const month = `${event.year}-${String(event.month).padStart(2, '0')}`
        if (!venueMonthlyData[event.venue]) {
          venueMonthlyData[event.venue] = {}
        }
        if (!venueMonthlyData[event.venue][month]) {
          venueMonthlyData[event.venue][month] = {total: 0, mnp: 0, hs: 0}
        }
        const mnpTotal = event.actual_au_mnp + event.actual_uq_mnp
        const hsTotal = event.actual_hs_total
        venueMonthlyData[event.venue][month].mnp += mnpTotal
        venueMonthlyData[event.venue][month].hs += hsTotal
        venueMonthlyData[event.venue][month].total += mnpTotal + hsTotal
      })

      // データを折れ線グラフ用に整形
      const allMonths = [...new Set(events.map(e => `${e.year}-${String(e.month).padStart(2, '0')}`))]
        .sort()

      const venueMonthlyTrend = allMonths.map(month => {
        const dataPoint: any = { month }
        Object.keys(venueMonthlyData).forEach(venue => {
          const data = venueMonthlyData[venue][month] || {total: 0, mnp: 0, hs: 0}
          dataPoint[venue] = data.total
          dataPoint[`${venue}_mnp`] = data.mnp
          dataPoint[`${venue}_hs`] = data.hs
        })
        return dataPoint
      })

      // イベント別実績（週次・会場別）
      const eventWeeklyData: Record<number, any> = {}
      events.forEach((event: any) => {
        const weekNum = event.week_number || 1
        if (!eventWeeklyData[weekNum]) {
          eventWeeklyData[weekNum] = {
            week: `第${weekNum}週`,
            weekNumber: weekNum,
            venues: {}
          }
        }

        const venue = event.venue
        if (!eventWeeklyData[weekNum].venues[venue]) {
          eventWeeklyData[weekNum].venues[venue] = {
            venue,
            mnp: 0,
            hs: 0
          }
        }

        eventWeeklyData[weekNum].venues[venue].mnp += (event.actual_au_mnp || 0) + (event.actual_uq_mnp || 0)
        eventWeeklyData[weekNum].venues[venue].hs += (event.actual_au_new || 0) + (event.actual_uq_new || 0)
      })

      const eventWeeklyStats = Object.values(eventWeeklyData)
        .map((weekData: any) => {
          const venuesArray = Object.values(weekData.venues)
          const totalMnp = venuesArray.reduce((sum: number, v: any) => sum + v.mnp, 0)
          const totalHs = venuesArray.reduce((sum: number, v: any) => sum + v.hs, 0)

          return {
            week: weekData.week,
            weekNumber: weekData.weekNumber,
            venues: venuesArray,
            totalMnp,
            totalHs,
            total: totalMnp + totalHs
          }
        })
        .sort((a, b) => a.weekNumber - b.weekNumber)

      return {
        monthlyAchievementTrend,
        weeklyStats,
        performanceLevels,
        achievementStats,
        venueStats,
        agencyStats,
        staffWeeklyStats,
        venueMonthlyTrend,
        eventWeeklyStats
      }
    }

    const data = getCompareAnalysisData(filteredEvents)

    // 月次イベント達成率推移
    if (type === 'achievement') {
      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Award className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              月次イベント達成率推移
            </h3>
          </div>
          {data.monthlyAchievementTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.monthlyAchievementTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
                <YAxis stroke="#3dae6c" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, name: string) => {
                    if (name === '達成率') return [`${value}%`, name]
                    return [value, name]
                  }}
                />
                <Line type="monotone" dataKey="achievementRate" stroke="#4abf79" strokeWidth={3} name="達成率" animationBegin={0} animationDuration={1000} animationEasing="ease-in-out" dot={{ fill: '#4abf79', r: 4 }} />
                <Line type="monotone" dataKey="totalEvents" stroke="#7cd08e" strokeWidth={2} name="対象イベント数" animationBegin={0} animationDuration={1000} animationEasing="ease-in-out" dot={{ fill: '#7cd08e', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '350px' }}>
              <div className="text-center">
                <p style={{ color: '#22211A', opacity: 0.6 }}>
                  表示できる値がありません
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 週次実績
    if (type === 'weekly') {
      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Calendar className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              週次実績
            </h3>
          </div>
          {data.weeklyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.weeklyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
                <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, name: string) => {
                    if (name === 'MNP') return [`${value}件`, 'MNP']
                    if (name === '新規') return [`${value}件`, '新規']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="hs" stackId="a" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '350px' }}>
              <div className="text-center">
                <p style={{ color: '#22211A', opacity: 0.6 }}>
                  表示できる値がありません
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 実績レベル分析
    if (type === 'level') {
      const PerformanceTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const dataItem = payload[0]
          const filteredData = data.performanceLevels.filter(level => level.count > 0)
          const index = filteredData.findIndex(item => item.level === dataItem.payload.level)
          const color = COLORS[index % COLORS.length]
          return (
            <div style={{ backgroundColor: '#FAFAFA', border: '2px solid #d5cec3', borderRadius: '8px', fontWeight: 'bold', padding: '8px', textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)' }}>
              <p style={{ color: '#a58a69', margin: '0 0 4px 0', textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)' }}>実績レベル分析</p>
              <p style={{ color: color, margin: 0, textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)' }}>
                {`${dataItem.payload.level}: ${dataItem.value}件`}
              </p>
            </div>
          )
        }
        return null
      }

      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <TrendingUp className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              実績レベル分析
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={data.performanceLevels.filter(level => level.count > 0)}
                dataKey="count"
                nameKey="level"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                stroke="#FFFFFF"
                strokeWidth={2}
                paddingAngle={0}
                label={(props) => <CustomPieLabel {...props} />}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.performanceLevels.filter(level => level.count > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PerformanceTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    }

    // 目標達成状況
    if (type === 'achievementStatus') {
      const achievementData = [
        { name: '達成', value: data.achievementStats.achieved, color: '#4abf79' },
        { name: '未達成', value: data.achievementStats.notAchieved, color: '#7cd08e' },
        { name: '目標未設定', value: data.achievementStats.noTarget, color: '#a6e09e' }
      ].filter(item => item.value > 0)

      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Award className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              目標達成状況
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={achievementData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                stroke="#FFFFFF"
                strokeWidth={2}
                paddingAngle={0}
                label={(props) => <AchievementPieLabel {...props} fill={props.payload.color} />}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {achievementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    }

    // 会場別実績
    if (type === 'venue') {
      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <MapPin className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              会場別実績
            </h3>
          </div>
          {data.venueStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.venueStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, name: string) => {
                    if (name === 'MNP') return [`${value}件`, 'MNP']
                    if (name === '新規') return [`${value}件`, '新規']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="hs" stackId="a" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '350px' }}>
              <div className="text-center">
                <p style={{ color: '#22211A', opacity: 0.6 }}>
                  表示できる値がありません
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 代理店別実績
    if (type === 'agency') {
      // 選択された代理店、またはデフォルトで全代理店（上位10件）
      const displayAgencies = selectedAgencies && selectedAgencies.length > 0
        ? selectedAgencies
        : data.agencyStats.slice(0, 10).map((a: any) => a.agency)

      // 選択された代理店のデータのみをフィルター
      const filteredAgencyStats = data.agencyStats.filter((stat: any) =>
        displayAgencies.includes(stat.agency)
      )

      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Building2 className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              代理店別実績
            </h3>
          </div>
          {filteredAgencyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={filteredAgencyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, name: string) => {
                    if (name === 'MNP') return [`${value}件`, 'MNP']
                    if (name === '新規') return [`${value}件`, '新規']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="hs" stackId="a" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '350px' }}>
              <div className="text-center">
                <p style={{ color: '#22211A', opacity: 0.6 }}>
                  表示できる値がありません
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // スタッフ別週次獲得件数
    if (type === 'staff') {
      // 選択されたスタッフ、またはデフォルトで全スタッフ
      const displayStaff = selectedStaff && selectedStaff.length > 0
        ? selectedStaff
        : [...new Set(staffPerformances.map((p: any) => p.staff_name).filter(Boolean))].sort()

      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Users className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              スタッフ別週次獲得件数
            </h3>
          </div>
          {data.staffWeeklyStats && data.staffWeeklyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.staffWeeklyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
                <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '獲得件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {displayStaff.flatMap((staffName, index) => [
                  <Bar
                    key={`${staffName}_MNP`}
                    dataKey={`${staffName}_MNP`}
                    stackId={staffName}
                    fill={COLORS[index % COLORS.length]}
                    name={`${staffName} (MNP)`}
                    stroke="none"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />,
                  <Bar
                    key={`${staffName}_新規`}
                    dataKey={`${staffName}_新規`}
                    stackId={staffName}
                    fill={COLORS[(index + COLORS.length/2) % COLORS.length]}
                    name={`${staffName} (新規)`}
                    stroke="none"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                ])}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
              <div className="text-center">
                <p style={{ color: '#22211A', opacity: 0.6 }}>
                  表示できる値がありません
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // イベント別実績
    if (type === 'eventWeekly') {
      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Calendar className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              イベント別実績
            </h3>
          </div>
          {data.eventWeeklyStats && data.eventWeeklyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.eventWeeklyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
                <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload
                      return (
                        <div style={{ ...tooltipStyle, maxHeight: '400px', overflowY: 'auto', display: 'block' }}>
                          <p className="font-bold mb-2">{data.week}</p>
                          <p className="mb-1">合計: {data.total}件</p>
                          <p className="mb-2 text-sm">　MNP: {data.totalMnp}件 / 新規: {data.totalHs}件</p>
                          <div className="border-t pt-2 mt-2 pb-2" style={{ borderColor: '#FFB300' }}>
                            <p className="font-semibold mb-1 text-sm">会場別内訳:</p>
                            {data.venues.map((venue: any, idx: number) => (
                              <div key={idx} className="text-sm mb-1">
                                <p className="font-medium">{venue.venue}</p>
                                <p className="ml-2 text-xs">MNP: {venue.mnp}件 / 新規: {venue.hs}件</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar dataKey="totalMnp" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="totalHs" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
              <div className="text-center">
                <p style={{ color: '#22211A', opacity: 0.6 }}>
                  表示できるデータがありません
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 月次達成状況
    if (type === 'monthly') {
      // 月次達成状況の統計を計算
      const currentMonth = new Date(startDate + '-01').getMonth() + 1
      const currentYear = new Date(startDate + '-01').getFullYear()

      const currentMonthEvents = filteredEvents.filter((event: any) =>
        event.month === currentMonth && event.year === currentYear
      )

      const eventsWithTargets = currentMonthEvents.filter((event: any) => event.target_hs_total > 0)
      const achievedEvents = eventsWithTargets.filter((event: any) => event.actual_hs_total >= event.target_hs_total)
      const achievementRate = eventsWithTargets.length > 0 ? (achievedEvents.length / eventsWithTargets.length) * 100 : 0

      const totalTarget = currentMonthEvents.reduce((sum: number, event: any) => sum + (event.target_hs_total || 0), 0)
      const totalActual = currentMonthEvents.reduce((sum: number, event: any) => sum + (event.actual_hs_total || 0), 0)
      const totalMnp = currentMonthEvents.reduce((sum: number, event: any) => sum + ((event.actual_au_mnp || 0) + (event.actual_uq_mnp || 0)), 0)
      const totalNew = currentMonthEvents.reduce((sum: number, event: any) => sum + ((event.actual_au_new || 0) + (event.actual_uq_new || 0)), 0)
      const mnpRatio = totalActual > 0 ? (totalMnp / totalActual) * 100 : 0

      const achievementData = [
        { name: '達成', value: achievedEvents.length, fill: COLORS[0] },
        { name: '未達成', value: eventsWithTargets.length - achievedEvents.length, fill: COLORS[10] }
      ]

      const mnpNewData = [
        { name: 'MNP', value: totalMnp, fill: COLORS[0] },
        { name: '新規', value: totalNew, fill: COLORS[1] }
      ]

      return (
        <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-6">
            <h3 className="text-2xl font-bold flex items-center" style={{ color: '#22211A' }}>
              {currentYear}年{currentMonth}月の達成状況
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
              <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                {currentMonthEvents.length}
              </div>
              <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                対象<br />イベント数
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
              <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                {achievedEvents.length}
              </div>
              <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                達成<br />イベント数
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
              <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                {achievementRate.toFixed(1)}%
              </div>
              <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                イベント<br />達成率
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-xl border" style={{ borderColor: '#22211A20' }}>
              <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
                {mnpRatio.toFixed(1)}%
              </div>
              <div className="text-xs lg:text-sm" style={{ color: '#22211A' }}>
                当月<br />MNP比率
              </div>
              <div className="text-xs mt-1" style={{ color: '#22211A' }}>
                MNP: {totalMnp}件<br />新規: {totalNew}件
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
              <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#22211A' }}>イベント達成状況</h3>
              <div className="h-48">
                {eventsWithTargets.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={achievementData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={30}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {achievementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
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
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p style={{ color: '#22211A', opacity: 0.6 }}>データがありません</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[0] }}></div>
                    <span className="text-sm font-semibold" style={{ color: '#22211A' }}>達成</span>
                  </div>
                  <span className="text-xs" style={{ color: '#22211A' }}>({achievedEvents.length}件)</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[10] }}></div>
                    <span className="text-sm font-semibold" style={{ color: '#22211A' }}>未達成</span>
                  </div>
                  <span className="text-xs" style={{ color: '#22211A' }}>({eventsWithTargets.length - achievedEvents.length}件)</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
              <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#22211A' }}>MNP/新規比率</h3>
              <div className="h-48">
                {(totalMnp + totalNew) > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mnpNewData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={30}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {mnpNewData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
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
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p style={{ color: '#22211A', opacity: 0.6 }}>データがありません</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[0] }}></div>
                    <span className="text-sm font-semibold" style={{ color: '#22211A' }}>MNP</span>
                  </div>
                  <span className="text-xs" style={{ color: '#22211A' }}>({totalMnp}件)</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[1] }}></div>
                    <span className="text-sm font-semibold" style={{ color: '#22211A' }}>新規</span>
                  </div>
                  <span className="text-xs" style={{ color: '#22211A' }}>({totalNew}件)</span>
                </div>
              </div>
              <div className="text-center mt-2">
                <div className="text-lg font-bold" style={{ color: '#22211A' }}>
                  MNP比率: {mnpRatio.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 会場別月次実績推移
    if (type === 'venueMonthly') {
      // 選択された会場、またはデフォルトで全会場
      const displayVenues = propSelectedVenues && propSelectedVenues.length > 0
        ? propSelectedVenues
        : venues

      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <MapPin className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              会場別月次実績推移
            </h3>
          </div>
          {data.venueMonthlyTrend && data.venueMonthlyTrend.length > 0 ? (
            <>
              <div className="mb-2 text-sm" style={{ color: '#22211A' }}>
                対象期間: {data.venueMonthlyTrend[0]?.month || '未設定'} 〜 {data.venueMonthlyTrend[data.venueMonthlyTrend.length - 1]?.month || '未設定'}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.venueMonthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="#22211A"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#22211A"
                    fontSize={11}
                    label={{
                      value: '総実績（MNP + HS）',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#3dae6c', fontSize: 12 }
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string, props: any) => {
                      const venueName = name
                      const month = props.payload.month
                      const mnp = props.payload[`${venueName}_mnp`] || 0
                      const hs = props.payload[`${venueName}_hs`] || 0
                      return [
                        `${value}件 (MNP: ${mnp}件, 新規: ${hs}件)`,
                        venueName
                      ]
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  {venues.filter(venue =>
                    displayVenues.includes(venue) &&
                    data.venueMonthlyTrend.some(d => d[venue] && d[venue] > 0)
                  ).map((venue, index) => (
                    <Line
                      key={venue}
                      type="monotone"
                      dataKey={venue}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name={venue}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
              <div className="text-center">
                <p style={{ color: '#22211A', opacity: 0.6 }}>
                  表示できる値がありません
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // ランキング
    if (type === 'ranking') {
      const rankingData = filteredEvents
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
        .slice(0, 10) // 比較では10件まで表示

      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Trophy className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
              獲得実績ランキング（TOP10）
            </h3>
          </div>
          {rankingData.length > 0 ? (
            <div className="space-y-2">
              {rankingData.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{
                    borderColor: '#22211A20',
                    backgroundColor: index < 3 ? `rgba(255, 179, 0, ${0.08 - index * 0.01})` : 'rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs"
                         style={{
                           backgroundColor: index === 0 ? '#FFB300' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#22211A15',
                           color: index < 3 ? '#FFFFFF' : '#22211A'
                         }}>
                      {index < 3 ? (
                        index === 0 ? <Trophy className="w-3 h-3" /> :
                        index === 1 ? <Award className="w-3 h-3" /> :
                        <Medal className="w-3 h-3" />
                      ) : (
                        index + 1
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
                    <div className="text-lg font-bold" style={{ color: index < 3 ? '#FFB300' : '#22211A' }}>
                      {event.totalIds.toLocaleString()}
                    </div>
                    <div className="text-xs opacity-70" style={{ color: '#22211A' }}>
                      MNP：{event.auMnp + event.uqMnp} 新規：{event.auNew + event.uqNew}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#22211A', opacity: 0.6 }}>
              <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: '#22211A', opacity: 0.4 }} />
              <p className="text-sm">選択された期間の実績データが見つかりませんでした</p>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  // PDF生成関数
  const generatePDF = async () => {
    if (!previewImageUrl) return

    setIsGeneratingPdf(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // プレビュー画像をbase64デコード
      const img = new Image()
      img.src = previewImageUrl

      await new Promise((resolve) => {
        img.onload = resolve
      })

      const pageWidth = 210 // A4の幅（mm）
      const pageHeight = 297 // A4の高さ（mm）
      const margin = 10 // 余白（mm）
      const contentWidth = pageWidth - (margin * 2) // コンテンツ幅
      const contentHeight = pageHeight - (margin * 2) // コンテンツ高さ

      const imgWidth = contentWidth
      const imgHeight = (img.height * imgWidth) / img.width
      let heightLeft = imgHeight
      let position = margin

      // 最初のページを追加
      pdf.addImage(previewImageUrl, 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= contentHeight

      // 複数ページに分割
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft)
        pdf.addPage()
        pdf.addImage(previewImageUrl, 'PNG', margin, position, imgWidth, imgHeight)
        heightLeft -= contentHeight
      }

      // PDFをダウンロード
      const filterText = yearFilter !== 'all' ? `${yearFilter}年` : '全期間'
      const monthText = monthFilter !== 'all' ? `${monthFilter}月` : ''
      const fileName = `実績分析_${filterText}${monthText}_${format(new Date(), 'yyyyMMdd')}.pdf`
      pdf.save(fileName)

      setShowPdfPreview(false)
      setPreviewImageUrl('')

    } catch (error) {
      console.error('PDF生成エラー:', error)
      alert('PDF生成中にエラーが発生しました')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingAnimation />
      </div>
    )
  }

  return (
    <>
      {/* PDF出力ボタン */}
      {renderPdfButton && renderPdfButton(showPdfPreviewModal, isGeneratingPdf)}

      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-8 max-w-7xl pb-20 md:pb-6">
        {/* PDFプレビューモーダル */}
      {showPdfPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ border: '2px solid #22211A' }}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between" style={{ borderColor: '#22211A' }}>
              <h3 className="text-xl font-bold" style={{ color: '#22211A' }}>PDFプレビュー</h3>
              <button
                onClick={() => {
                  setShowPdfPreview(false)
                  setPreviewImageUrl('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <span className="text-2xl" style={{ color: '#22211A' }}>×</span>
              </button>
            </div>
            <div className="p-6">
              {previewImageUrl && (
                <img src={previewImageUrl} alt="PDF Preview" className="w-full border" style={{ borderColor: '#22211A' }} />
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-4" style={{ borderColor: '#22211A' }}>
              <button
                onClick={() => {
                  setShowPdfPreview(false)
                  setPreviewImageUrl('')
                }}
                className="px-6 py-3 rounded-xl border hover:opacity-90 transition-all font-bold"
                style={{ borderColor: '#22211A', color: '#22211A' }}
              >
                キャンセル
              </button>
              <button
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="inline-flex items-center px-6 py-3 rounded-xl border hover:opacity-90 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#FFB300', color: '#FFFFFF', borderColor: '#FFB300' }}
              >
                <Download className="w-5 h-5 mr-2" />
                {isGeneratingPdf ? 'ダウンロード中...' : 'PDFダウンロード'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 比較モーダル */}
      {compareModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-[95vw] max-w-[1800px] h-[90vh] overflow-y-auto" style={{ border: '2px solid #22211A' }}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between" style={{ borderColor: '#22211A' }}>
              <h3 className="text-xl font-bold" style={{ color: '#22211A' }}>期間比較</h3>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <span className="text-2xl" style={{ color: '#22211A' }}>×</span>
              </button>
            </div>
            <div className="p-6">
              {/* スタッフ選択UI（スタッフ比較の場合のみ） */}
              {compareType === 'staff' && (
                <div className="mb-6 border rounded-lg p-4" style={{ borderColor: '#22211A' }}>
                  <h4 className="font-bold mb-3" style={{ color: '#22211A' }}>スタッフ選択</h4>
                  <div className="relative">
                    <button
                      onClick={() => setIsCompareStaffSelectOpen(!isCompareStaffSelectOpen)}
                      className="w-full px-4 py-2 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#22211A', color: '#22211A' }}
                    >
                      <span style={{ color: '#22211A' }}>
                        {compareSelectedStaff.length === 0 ? 'スタッフを選択してください' :
                         compareSelectedStaff.length === allStaffNames.length ? '全てのスタッフ (全選択)' :
                         `${compareSelectedStaff.length}名選択中`}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isCompareStaffSelectOpen ? 'rotate-180' : ''}`} style={{ color: '#22211A' }} />
                    </button>

                    {isCompareStaffSelectOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#22211A' }}>
                        <div className="border-b p-2 flex gap-2" style={{ borderColor: '#22211A' }}>
                          <button
                            onClick={() => setCompareSelectedStaff([...allStaffNames])}
                            className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                            style={{ color: '#22211A', border: '1px solid #22211A' }}
                          >
                            全て選択
                          </button>
                          <button
                            onClick={() => setCompareSelectedStaff([])}
                            className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                            style={{ color: '#22211A', border: '1px solid #22211A' }}
                          >
                            全てのチェックを外す
                          </button>
                        </div>
                        {allStaffNames.map(staffName => (
                          <div key={staffName} className="p-2">
                            <label className="w-full px-3 py-2 text-sm flex items-center rounded hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: '#22211A' }}>
                              <input
                                type="checkbox"
                                checked={compareSelectedStaff.includes(staffName)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCompareSelectedStaff(prev => [...prev, staffName])
                                  } else {
                                    setCompareSelectedStaff(prev => prev.filter(s => s !== staffName))
                                  }
                                }}
                                className="mr-2"
                              />
                              {staffName}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 会場選択UI（会場別月次推移の場合のみ） */}
              {compareType === 'venueMonthly' && (
                <div className="mb-6 border rounded-lg p-4" style={{ borderColor: '#22211A' }}>
                  <h4 className="font-bold mb-3" style={{ color: '#22211A' }}>会場選択</h4>
                  <div className="relative">
                    <button
                      onClick={() => setIsCompareVenueSelectOpen(!isCompareVenueSelectOpen)}
                      className="w-full px-4 py-2 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#22211A', color: '#22211A' }}
                    >
                      <span style={{ color: '#22211A' }}>
                        {compareSelectedVenues.length === 0 ? '会場を選択してください' :
                         compareSelectedVenues.length === venues.length ? '全ての会場 (全選択)' :
                         `${compareSelectedVenues.length}会場選択中`}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isCompareVenueSelectOpen ? 'rotate-180' : ''}`} style={{ color: '#22211A' }} />
                    </button>

                    {isCompareVenueSelectOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#22211A' }}>
                        <div className="border-b p-2 flex gap-2" style={{ borderColor: '#22211A' }}>
                          <button
                            onClick={() => setCompareSelectedVenues([...venues])}
                            className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                            style={{ color: '#22211A', border: '1px solid #22211A' }}
                          >
                            全て選択
                          </button>
                          <button
                            onClick={() => setCompareSelectedVenues([])}
                            className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                            style={{ color: '#22211A', border: '1px solid #22211A' }}
                          >
                            全てのチェックを外す
                          </button>
                        </div>
                        {venues.map(venue => (
                          <div key={venue} className="p-2">
                            <label className="w-full px-3 py-2 text-sm flex items-center rounded hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: '#22211A' }}>
                              <input
                                type="checkbox"
                                checked={compareSelectedVenues.includes(venue)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCompareSelectedVenues(prev => [...prev, venue])
                                  } else {
                                    setCompareSelectedVenues(prev => prev.filter(v => v !== venue))
                                  }
                                }}
                                className="mr-2"
                              />
                              {venue}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* イベント別実績の比較（年・月選択） */}
              {compareType === 'eventWeekly' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左側のパネル */}
                  <div className="border rounded-lg p-4" style={{ borderColor: '#22211A' }}>
                    <h4 className="font-bold mb-3" style={{ color: '#22211A' }}>期間1</h4>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>年:</span>
                        <select
                          value={compareLeftEventYear}
                          onChange={(e) => setCompareLeftEventYear(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        >
                          <option value="">選択してください</option>
                          {years.map(year => (
                            <option key={year} value={year}>{year}年</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>月:</span>
                        <select
                          value={compareLeftEventMonth}
                          onChange={(e) => setCompareLeftEventMonth(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        >
                          <option value="">選択してください</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                            <option key={month} value={month}>{month}月</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div key={`left-${compareLeftEventYear}-${compareLeftEventMonth}`}>
                      <CompareEventWeeklyPanel
                        year={compareLeftEventYear}
                        month={compareLeftEventMonth}
                      />
                    </div>
                  </div>

                  {/* 右側のパネル */}
                  <div className="border rounded-lg p-4" style={{ borderColor: '#22211A' }}>
                    <h4 className="font-bold mb-3" style={{ color: '#22211A' }}>期間2</h4>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>年:</span>
                        <select
                          value={compareRightEventYear}
                          onChange={(e) => setCompareRightEventYear(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        >
                          <option value="">選択してください</option>
                          {years.map(year => (
                            <option key={year} value={year}>{year}年</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>月:</span>
                        <select
                          value={compareRightEventMonth}
                          onChange={(e) => setCompareRightEventMonth(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        >
                          <option value="">選択してください</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                            <option key={month} value={month}>{month}月</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div key={`right-${compareRightEventYear}-${compareRightEventMonth}`}>
                      <CompareEventWeeklyPanel
                        year={compareRightEventYear}
                        month={compareRightEventMonth}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* その他のパネルの比較 */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左側のパネル */}
                  <div className="border rounded-lg p-4" style={{ borderColor: '#22211A' }}>
                    <h4 className="font-bold mb-3" style={{ color: '#22211A' }}>期間1</h4>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>開始:</span>
                        <input
                          type="month"
                          value={compareLeftStart}
                          onChange={(e) => setCompareLeftStart(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>終了:</span>
                        <input
                          type="month"
                          value={compareLeftEnd}
                          onChange={(e) => setCompareLeftEnd(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        />
                      </div>
                    </div>
                    <ComparePanelWrapper
                      startDate={compareLeftStart}
                      endDate={compareLeftEnd}
                      type={compareType}
                      selectedStaff={compareSelectedStaff}
                      selectedVenues={compareSelectedVenues}
                    />
                  </div>

                  {/* 右側のパネル */}
                  <div className="border rounded-lg p-4" style={{ borderColor: '#22211A' }}>
                    <h4 className="font-bold mb-3" style={{ color: '#22211A' }}>期間2</h4>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>開始:</span>
                        <input
                          type="month"
                          value={compareRightStart}
                          onChange={(e) => setCompareRightStart(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#22211A' }}>終了:</span>
                        <input
                          type="month"
                          value={compareRightEnd}
                          onChange={(e) => setCompareRightEnd(e.target.value)}
                          className="border rounded px-2 py-1"
                          style={{ borderColor: '#22211A', color: '#22211A' }}
                        />
                      </div>
                    </div>
                    <ComparePanelWrapper
                      startDate={compareRightStart}
                      endDate={compareRightEnd}
                      type={compareType}
                      selectedStaff={compareSelectedStaff}
                      selectedVenues={compareSelectedVenues}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF出力対象のコンテンツ */}
      <div ref={contentRef} className="pdf-content">
        {/* サマリー情報 */}
        <div className="glass rounded-lg p-6 border mb-8" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center space-x-6 p-3 rounded-xl">
            <div className="text-sm">
              <span style={{ color: '#22211A' }}>対象イベント: </span>
              <span className="font-bold" style={{ color: '#22211A' }}>{filteredEvents.length}件</span>
            </div>
            <div className="text-sm">
              <span style={{ color: '#22211A' }}>総実績: </span>
              <span className="font-bold" style={{ color: '#22211A' }}>{filteredEvents.reduce((sum, e) => sum + e.actual_hs_total, 0)}件</span>
            </div>
            <div className="text-sm">
              <span style={{ color: '#22211A' }}>平均実績: </span>
              <span className="font-bold" style={{ color: '#22211A' }}>
                {filteredEvents.length > 0 ? Math.round(filteredEvents.reduce((sum, e) => sum + e.actual_hs_total, 0) / filteredEvents.length) : 0}件
              </span>
            </div>
          </div>
        </div>

      {/* 月次達成状況 */}
      {includeMonthlyStatus && (
        <div className="mb-12">
          <MonthlyAchievementStatus
            year={yearFilter}
            month={monthFilter}
            onCompare={() => openCompareModal('monthly')}
          />
        </div>
      )}

      {/* 月次獲得実績ランキング */}
      <div className="glass rounded-lg border p-4 mb-8" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
            <h2 className="text-xl font-bold" style={{ color: '#22211A' }}>
              月次獲得実績ランキング（TOP5）
            </h2>
            <button
              onClick={() => openCompareModal('ranking')}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
              style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
            >
              <GitCompare className="w-4 h-4 mr-1" />
              比較
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={rankingYear}
              onChange={(e) => setRankingYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              style={{ border: '1px solid #22211A', color: '#22211A' }}
            >
              <option value="all">全年</option>
              {[...new Set(events.map(e => e.year))].sort((a, b) => b - a).map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            <select
              value={rankingMonth}
              onChange={(e) => setRankingMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              style={{ border: '1px solid #22211A', color: '#22211A' }}
            >
              <option value="all">全月</option>
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
          </div>
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
            <p className="text-sm">選択された期間の実績データが見つかりませんでした</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 月次イベント達成率推移 */}
          <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                  <Award className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  月次イベント達成率推移
                </h3>
                <button
                  onClick={() => openCompareModal('achievement')}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                  style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  比較
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span style={{ color: '#22211A' }}>期間:</span>
                  <input
                    type="month"
                    value={achievementStartDate}
                    onChange={(e) => {
                      setAchievementStartDate(e.target.value)
                      setIsAchievementDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  <span style={{ color: '#22211A' }}>〜</span>
                  <input
                    type="month"
                    value={achievementEndDate}
                    onChange={(e) => {
                      setAchievementEndDate(e.target.value)
                      setIsAchievementDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  {(achievementStartDate || achievementEndDate) && (
                    <button
                      onClick={() => {
                        setAchievementStartDate('')
                        setAchievementEndDate('')
                        setIsAchievementDateManuallySet(false)
                      }}
                      className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                      style={{ color: '#22211A' }}
                    >
                      クリア
                    </button>
                  )}
                </div>
              </div>
            </div>
            {analysisData.monthlyAchievementTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analysisData.monthlyAchievementTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
                  <YAxis stroke="#3dae6c" fontSize={12} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string) => {
                      if (name === '達成率') return [`${value}%`, name]
                      return [value, name]
                    }}
                  />
                  <Line type="monotone" dataKey="achievementRate" stroke="#4abf79" strokeWidth={3} name="達成率" animationBegin={0} animationDuration={1000} animationEasing="ease-in-out" dot={{ fill: '#4abf79', r: 4 }} />
                  <Line type="monotone" dataKey="totalEvents" stroke="#7cd08e" strokeWidth={2} name="対象イベント数" animationBegin={0} animationDuration={1000} animationEasing="ease-in-out" dot={{ fill: '#7cd08e', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: '350px' }}>
                <div className="text-center">
                  <p style={{ color: '#22211A', opacity: 0.6 }}>
                    表示できる値がありません
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 週次実績 */}
          <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                  <Calendar className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  週次実績
                </h3>
                <button
                  onClick={() => openCompareModal('weekly')}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                  style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  比較
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span style={{ color: '#22211A' }}>期間:</span>
                  <input
                    type="month"
                    value={weeklyStartDate}
                    onChange={(e) => {
                      setWeeklyStartDate(e.target.value)
                      setIsWeeklyDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  <span style={{ color: '#22211A' }}>〜</span>
                  <input
                    type="month"
                    value={weeklyEndDate}
                    onChange={(e) => {
                      setWeeklyEndDate(e.target.value)
                      setIsWeeklyDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  {(weeklyStartDate || weeklyEndDate) && (
                    <button
                      onClick={() => {
                        setWeeklyStartDate('')
                        setWeeklyEndDate('')
                        setIsWeeklyDateManuallySet(false)
                      }}
                      className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                      style={{ color: '#22211A' }}
                  >
                    クリア
                  </button>
                )}
                </div>
              </div>
            </div>
            {analysisData.weeklyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analysisData.weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
                  <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string) => {
                      if (name === 'MNP') return [`${value}件`, 'MNP']
                      if (name === '新規') return [`${value}件`, '新規']
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                  <Bar dataKey="hs" stackId="a" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: '350px' }}>
                <div className="text-center">
                  <p style={{ color: '#22211A', opacity: 0.6 }}>
                    表示できる値がありません
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 実績レベル分析 */}
          <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                  <TrendingUp className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  実績レベル分析
                </h3>
                <button
                  onClick={() => openCompareModal('level')}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                  style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  比較
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span style={{ color: '#22211A' }}>期間:</span>
                  <input
                    type="month"
                    value={levelStartDate}
                    onChange={(e) => {
                      setLevelStartDate(e.target.value)
                      setIsLevelDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  <span style={{ color: '#22211A' }}>〜</span>
                  <input
                    type="month"
                    value={levelEndDate}
                    onChange={(e) => {
                      setLevelEndDate(e.target.value)
                      setIsLevelDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  {(levelStartDate || levelEndDate) && (
                    <button
                      onClick={() => {
                        setLevelStartDate('')
                        setLevelEndDate('')
                        setIsLevelDateManuallySet(false)
                      }}
                      className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                      style={{ color: '#22211A' }}
                    >
                      クリア
                    </button>
                  )}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={analysisData.performanceLevels.filter(level => level.count > 0)}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  paddingAngle={0}
                  label={(props) => <CustomPieLabel {...props} />}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {analysisData.performanceLevels.filter(level => level.count > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PerformanceTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 目標達成状況 */}
          <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                  <Award className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  目標達成状況
                </h3>
                <button
                  onClick={() => openCompareModal('achievementStatus')}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                  style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  比較
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span style={{ color: '#22211A' }}>期間:</span>
                  <input
                    type="month"
                    value={achievementStatusStartDate}
                    onChange={(e) => {
                      setAchievementStatusStartDate(e.target.value)
                      setIsAchievementStatusDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  <span style={{ color: '#22211A' }}>〜</span>
                  <input
                    type="month"
                    value={achievementStatusEndDate}
                    onChange={(e) => {
                      setAchievementStatusEndDate(e.target.value)
                      setIsAchievementStatusDateManuallySet(true)
                    }}
                    className="px-2 py-1 border rounded"
                    style={{ borderColor: '#22211A', fontSize: '12px' }}
                  />
                  {(achievementStatusStartDate || achievementStatusEndDate) && (
                    <button
                      onClick={() => {
                        setAchievementStatusStartDate('')
                        setAchievementStatusEndDate('')
                        setIsAchievementStatusDateManuallySet(false)
                      }}
                      className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                      style={{ color: '#22211A' }}
                    >
                      クリア
                    </button>
                  )}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={[
                    { name: '達成', value: analysisData.achievementStats.achieved, color: '#4abf79' },
                    { name: '未達成', value: analysisData.achievementStats.notAchieved, color: '#7cd08e' },
                    { name: '目標未設定', value: analysisData.achievementStats.noTarget, color: '#a6e09e' },
                  ].filter(item => item.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  paddingAngle={0}
                  label={(props) => <AchievementPieLabel {...props} fill={props.payload.color} />}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {[
                    { name: '達成', value: analysisData.achievementStats.achieved, color: '#4abf79' },
                    { name: '未達成', value: analysisData.achievementStats.notAchieved, color: '#7cd08e' },
                    { name: '目標未設定', value: analysisData.achievementStats.noTarget, color: '#a6e09e' },
                  ].filter(item => item.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 代理店別実績と会場別実績 */}
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 代理店別実績 */}
            <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                      <Building2 className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                      代理店別実績
                    </h3>
                    <button
                      onClick={() => openCompareModal('agency')}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                      style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                    >
                      <GitCompare className="w-4 h-4 mr-1" />
                      比較
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span style={{ color: '#22211A' }}>期間:</span>
                      <input
                        type="month"
                        value={agencyStartDate}
                        onChange={(e) => {
                          setAgencyStartDate(e.target.value)
                          setIsAgencyDateManuallySet(true)
                        }}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#22211A', fontSize: '12px' }}
                      />
                      <span style={{ color: '#22211A' }}>〜</span>
                      <input
                        type="month"
                        value={agencyEndDate}
                        onChange={(e) => {
                          setAgencyEndDate(e.target.value)
                          setIsAgencyDateManuallySet(true)
                        }}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#22211A', fontSize: '12px' }}
                      />
                      {(agencyStartDate || agencyEndDate) && (
                        <button
                          onClick={() => {
                            setAgencyStartDate('')
                            setAgencyEndDate('')
                            setIsAgencyDateManuallySet(false)
                          }}
                          className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                          style={{ color: '#22211A' }}
                        >
                          クリア
                        </button>
                      )}
                    </div>

                    {/* 代理店選択 */}
                    <div className="relative agency-select-container">
                      <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>表示代理店を選択</label>
                      <button
                        onClick={() => setIsAgencySelectOpen(!isAgencySelectOpen)}
                        className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#22211A' }}
                      >
                        <span style={{ color: '#22211A' }}>
                          {selectedAgencies.length === 0 ? '代理店を選択してください' :
                           `${selectedAgencies.length}社選択中`}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isAgencySelectOpen ? 'rotate-180' : ''}`} style={{ color: '#22211A' }} />
                      </button>

                      {isAgencySelectOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#22211A' }}>
                          {/* 全選択/全解除 */}
                          <div className="border-b p-2 flex gap-2" style={{ borderColor: '#22211A' }}>
                            <button
                              onClick={() => setSelectedAgencies(analysisData.agencyStats.map((a: any) => a.agency))}
                              className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                              style={{ color: '#22211A', border: '1px solid #22211A' }}
                            >
                              全て選択
                            </button>
                            <button
                              onClick={() => setSelectedAgencies([])}
                              className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                              style={{ color: '#22211A', border: '1px solid #22211A' }}
                            >
                              全てのチェックを外す
                            </button>
                          </div>

                          {/* 個別代理店選択 */}
                          {analysisData.agencyStats.map((agencyStat: any) => (
                            <div key={agencyStat.agency} className="p-2">
                              <label className="w-full px-3 py-2 text-sm flex items-center rounded hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: '#22211A' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedAgencies.includes(agencyStat.agency)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAgencies(prev => [...prev, agencyStat.agency])
                                    } else {
                                      setSelectedAgencies(prev => prev.filter(a => a !== agencyStat.agency))
                                    }
                                  }}
                                  className="mr-2"
                                />
                                {agencyStat.agency}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              {(() => {
                // 選択された代理店のみ表示
                const displayAgencies = selectedAgencies.length > 0
                  ? selectedAgencies
                  : []

                // 選択された代理店のデータのみをフィルター
                const filteredAgencyStats = analysisData.agencyStats.filter((stat: any) =>
                  displayAgencies.includes(stat.agency)
                )

                return filteredAgencyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={filteredAgencyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any, name: string) => {
                        if (name === 'MNP') return [`${value}件`, 'MNP']
                        if (name === '新規') return [`${value}件`, '新規']
                        return [value, name]
                      }}
                    />
                    <Legend />
                    <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="hs" stackId="a" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center" style={{ height: '350px' }}>
                  <div className="text-center">
                    <p style={{ color: '#22211A', opacity: 0.6 }}>
                      表示できる値がありません
                    </p>
                  </div>
                </div>
              )})()}
            </div>

            {/* 会場別実績 */}
            <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                      <MapPin className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                      会場別実績
                    </h3>
                    <button
                      onClick={() => openCompareModal('venue')}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                      style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                    >
                      <GitCompare className="w-4 h-4 mr-1" />
                      比較
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span style={{ color: '#22211A' }}>期間:</span>
                      <input
                        type="month"
                        value={venueStartDate}
                        onChange={(e) => {
                          setVenueStartDate(e.target.value)
                          setIsVenueDateManuallySet(true)
                        }}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#22211A', fontSize: '12px' }}
                      />
                      <span style={{ color: '#22211A' }}>〜</span>
                      <input
                        type="month"
                        value={venueEndDate}
                        onChange={(e) => {
                          setVenueEndDate(e.target.value)
                          setIsVenueDateManuallySet(true)
                        }}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#22211A', fontSize: '12px' }}
                      />
                      {(venueStartDate || venueEndDate) && (
                        <button
                          onClick={() => {
                            setVenueStartDate('')
                            setVenueEndDate('')
                            setIsVenueDateManuallySet(false)
                          }}
                          className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                          style={{ color: '#22211A' }}
                        >
                          クリア
                        </button>
                      )}
                    </div>

                    {/* 会場選択 */}
                    <div className="relative venue-venue-select-container">
                      <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>表示会場を選択</label>
                      <button
                        onClick={() => setIsVenueVenueSelectOpen(!isVenueVenueSelectOpen)}
                        className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#22211A' }}
                      >
                        <span style={{ color: '#22211A' }}>
                          {selectedVenuesVenue.length === 0 ? '会場を選択してください' :
                           `${selectedVenuesVenue.length}会場選択中`}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isVenueVenueSelectOpen ? 'rotate-180' : ''}`} style={{ color: '#22211A' }} />
                      </button>

                      {isVenueVenueSelectOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#22211A' }}>
                          {/* 全選択/全解除 */}
                          <div className="border-b p-2 flex gap-2" style={{ borderColor: '#22211A' }}>
                            <button
                              onClick={() => setSelectedVenuesVenue(analysisData.venueStats.map((v: any) => v.venue))}
                              className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                              style={{ color: '#22211A', border: '1px solid #22211A' }}
                            >
                              全て選択
                            </button>
                            <button
                              onClick={() => setSelectedVenuesVenue([])}
                              className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                              style={{ color: '#22211A', border: '1px solid #22211A' }}
                            >
                              全てのチェックを外す
                            </button>
                          </div>

                          {/* 個別会場選択 */}
                          {analysisData.venueStats.map((venueStat: any) => (
                            <div key={venueStat.venue} className="p-2">
                              <label className="w-full px-3 py-2 text-sm flex items-center rounded hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: '#22211A' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedVenuesVenue.includes(venueStat.venue)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedVenuesVenue(prev => [...prev, venueStat.venue])
                                    } else {
                                      setSelectedVenuesVenue(prev => prev.filter(v => v !== venueStat.venue))
                                    }
                                  }}
                                  className="mr-2"
                                />
                                {venueStat.venue}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              {(() => {
                // 選択された会場のみ表示
                const displayVenues = selectedVenuesVenue.length > 0
                  ? selectedVenuesVenue
                  : []

                // 選択された会場のデータのみをフィルター
                const filteredVenueStats = analysisData.venueStats.filter((stat: any) =>
                  displayVenues.includes(stat.venue)
                )

                return filteredVenueStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={filteredVenueStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any, name: string) => {
                        if (name === 'MNP') return [`${value}件`, 'MNP']
                        if (name === '新規') return [`${value}件`, '新規']
                        return [value, name]
                      }}
                    />
                    <Legend />
                    <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="hs" stackId="a" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center" style={{ height: '350px' }}>
                  <div className="text-center">
                    <p style={{ color: '#22211A', opacity: 0.6 }}>
                      表示できる値がありません
                    </p>
                  </div>
                </div>
              )})()}
            </div>
          </div>

          {/* イベント別実績 */}
          <div className="lg:col-span-2 glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                  <Calendar className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  イベント別実績
                </h3>
                <button
                  onClick={() => openCompareModal('eventWeekly')}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                  style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  比較
                </button>
              </div>
              <div className="space-y-3">
                {/* 年月選択 */}
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>年</label>
                    <select
                      value={eventYear}
                      onChange={(e) => setEventYear(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#22211A' }}
                    >
                      <option value="">選択してください</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}年</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>月</label>
                    <select
                      value={eventMonth}
                      onChange={(e) => setEventMonth(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#22211A' }}
                    >
                      <option value="">選択してください</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                        <option key={month} value={month}>{month}月</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 代理店選択 */}
                <div className="relative event-agency-select-container">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>代理店を選択</label>
                  <button
                    onClick={() => setIsEventAgencySelectOpen(!isEventAgencySelectOpen)}
                    className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#22211A' }}
                  >
                    <span style={{ color: '#22211A' }}>
                      {selectedEventAgencies.length === 0 ? '代理店を選択してください' :
                       `${selectedEventAgencies.length}社選択中`}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isEventAgencySelectOpen ? 'rotate-180' : ''}`} style={{ color: '#22211A' }} />
                  </button>

                  {isEventAgencySelectOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#22211A' }}>
                      {/* 全選択/全解除 */}
                      <div className="border-b p-2 flex gap-2" style={{ borderColor: '#22211A' }}>
                        <button
                          onClick={() => setSelectedEventAgencies([...agencies])}
                          className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#22211A', border: '1px solid #22211A' }}
                        >
                          全て選択
                        </button>
                        <button
                          onClick={() => setSelectedEventAgencies([])}
                          className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#22211A', border: '1px solid #22211A' }}
                        >
                          全てのチェックを外す
                        </button>
                      </div>

                      {/* 個別代理店選択 */}
                      {agencies.map(agency => (
                        <div key={agency} className="p-2">
                          <label className="w-full px-3 py-2 text-sm flex items-center rounded hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: '#22211A' }}>
                            <input
                              type="checkbox"
                              checked={selectedEventAgencies.includes(agency)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEventAgencies(prev => [...prev, agency])
                                } else {
                                  setSelectedEventAgencies(prev => prev.filter(a => a !== agency))
                                }
                              }}
                              className="mr-2"
                            />
                            {agency}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* グラフ表示 */}
            {analysisData.eventWeeklyStats && analysisData.eventWeeklyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analysisData.eventWeeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="0" stroke="#3dae6c" fontSize={12} />
                  <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload
                        return (
                          <div style={{ ...tooltipStyle, maxHeight: '400px', overflowY: 'auto', display: 'block' }}>
                            <p className="font-bold mb-2">{data.week}</p>
                            <p className="mb-1">合計: {data.total}件</p>
                            <p className="mb-2 text-sm">　MNP: {data.totalMnp}件 / 新規: {data.totalHs}件</p>
                            <div className="border-t pt-2 mt-2 pb-2" style={{ borderColor: '#FFB300' }}>
                              <p className="font-semibold mb-1 text-sm">会場別内訳:</p>
                              {data.venues.map((venue: any, idx: number) => (
                                <div key={idx} className="text-sm mb-1">
                                  <p className="font-medium">{venue.venue}</p>
                                  <p className="ml-2 text-xs">MNP: {venue.mnp}件 / 新規: {venue.hs}件</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalMnp" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                  <Bar dataKey="totalHs" fill="#ffe680" name="新規" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: '400px' }}>
                <div className="text-center">
                  <p style={{ color: '#22211A', opacity: 0.6 }}>
                    {!eventYear || !eventMonth ? '年月を選択してください' : '表示できるデータがありません'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* スタッフ別週次獲得件数 */}
          <div className="lg:col-span-2 glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            {(() => {
              // スタッフ名のリストを取得
              const allStaffNames = [...new Set(staffPerformances.map((p: any) => p.staff_name).filter(Boolean))].sort()

              return (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                      <Users className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                      スタッフ別週次獲得件数
                    </h3>
                    <button
                      onClick={() => openCompareModal('staff')}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                      style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                    >
                      <GitCompare className="w-4 h-4 mr-1" />
                      比較
                    </button>
                  </div>

                  {/* 期間選択 */}
                <div className="space-y-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span style={{ color: '#22211A' }}>対象:</span>
                    <select
                      value={staffWeeklyYear}
                      onChange={(e) => setStaffWeeklyYear(e.target.value)}
                      className="px-2 py-1 border rounded"
                      style={{ borderColor: '#22211A', fontSize: '12px' }}
                    >
                      <option value="">年を選択</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}年</option>
                      ))}
                    </select>
                    <select
                      value={staffWeeklyMonth}
                      onChange={(e) => setStaffWeeklyMonth(e.target.value)}
                      className="px-2 py-1 border rounded"
                      style={{ borderColor: '#22211A', fontSize: '12px' }}
                    >
                      <option value="">月を選択</option>
                      {availableMonths.map(month => (
                        <option key={month} value={month}>{month}月</option>
                      ))}
                    </select>
                    {(staffWeeklyYear || staffWeeklyMonth) && (
                      <button
                        onClick={() => {
                          setStaffWeeklyYear('')
                          setStaffWeeklyMonth('')
                        }}
                        className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                        style={{ color: '#22211A' }}
                      >
                        クリア
                      </button>
                    )}
                  </div>
                </div>

                {/* スタッフ選択 */}
                <div className="relative staff-select-container">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>表示スタッフを選択</label>
                  <button
                    onClick={() => setIsStaffSelectOpen(!isStaffSelectOpen)}
                    className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#22211A' }}
                  >
                    <span style={{ color: '#22211A' }}>
                      {selectedStaff.length === 0 ? 'スタッフを選択してください' :
                       selectedStaff.length === allStaffNames.length ? '全てのスタッフ (全選択)' :
                       `${selectedStaff.length}名選択中`}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isStaffSelectOpen ? 'rotate-180' : ''}`} style={{ color: '#22211A' }} />
                  </button>

                  {isStaffSelectOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#22211A' }}>
                      {/* 全選択/全解除 */}
                      <div className="border-b p-2 flex gap-2" style={{ borderColor: '#22211A' }}>
                        <button
                          onClick={() => setSelectedStaff([...allStaffNames])}
                          className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#22211A', border: '1px solid #22211A' }}
                        >
                          全て選択
                        </button>
                        <button
                          onClick={() => setSelectedStaff([])}
                          className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#22211A', border: '1px solid #22211A' }}
                        >
                          全てのチェックを外す
                        </button>
                      </div>

                      {/* 個別スタッフ選択 */}
                      {allStaffNames.map(staffName => (
                        <div key={staffName} className="p-2">
                          <label className="w-full px-3 py-2 text-sm flex items-center rounded hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: '#22211A' }}>
                            <input
                              type="checkbox"
                              checked={selectedStaff.includes(staffName)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStaff(prev => [...prev, staffName])
                                } else {
                                  setSelectedStaff(prev => prev.filter(s => s !== staffName))
                                }
                              }}
                              className="mr-2"
                            />
                            {staffName}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* グラフ表示 */}
                {analysisData.staffWeeklyStats && analysisData.staffWeeklyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analysisData.staffWeeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="#3dae6c" fontSize={12} />
                      <YAxis stroke="#3dae6c" fontSize={12} label={{ value: '獲得件数', angle: -90, position: 'insideLeft', style: { fill: '#3dae6c' } }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      {selectedStaff.flatMap((staffName, index) => [
                        <Bar
                          key={`${staffName}_MNP`}
                          dataKey={`${staffName}_MNP`}
                          stackId={staffName}
                          fill={COLORS[index % COLORS.length]}
                          name={`${staffName} (MNP)`}
                          stroke="none"
                          animationBegin={0}
                          animationDuration={800}
                          animationEasing="ease-out"
                        />,
                        <Bar
                          key={`${staffName}_新規`}
                          dataKey={`${staffName}_新規`}
                          stackId={staffName}
                          fill={COLORS[(index + COLORS.length/2) % COLORS.length]}
                          name={`${staffName} (新規)`}
                          stroke="none"
                          animationBegin={0}
                          animationDuration={800}
                          animationEasing="ease-out"
                        />
                      ])}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center" style={{ height: '400px' }}>
                    <div className="text-center">
                      <p style={{ color: '#22211A', opacity: 0.6 }}>
                        表示できる値がありません
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
            })()}
          </div>

          {/* 会場別月次実績推移 */}
          {analysisData.venueMonthlyTrend && analysisData.venueMonthlyTrend.length > 0 && (
            <div className="lg:col-span-2 glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
                  <MapPin className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  会場別月次実績推移
                </h3>
                <button
                  onClick={() => openCompareModal('venueMonthly')}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                  style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
                >
                  <GitCompare className="w-4 h-4 mr-1" />
                  比較
                </button>
              </div>

              {/* フィルターコントロール */}
              <div className="mb-4 space-y-3">
                {/* 期間選択 */}
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>開始月</label>
                    <input
                      type="month"
                      value={chartStartDate}
                      onChange={(e) => setChartStartDate(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>終了月</label>
                    <input
                      type="month"
                      value={chartEndDate}
                      onChange={(e) => setChartEndDate(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                </div>

                {/* 会場選択 */}
                <div className="relative venue-select-container">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>表示会場を選択</label>
                  <button
                    onClick={() => setIsVenueSelectOpen(!isVenueSelectOpen)}
                    className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#22211A' }}
                  >
                    <span style={{ color: '#22211A' }}>
                      {selectedVenues.length === 0 ? '会場を選択してください' :
                       selectedVenues.length === venues.length ? '全ての会場 (全選択)' :
                       `${selectedVenues.length}会場選択中`}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isVenueSelectOpen ? 'rotate-180' : ''}`} style={{ color: '#22211A' }} />
                  </button>

                  {isVenueSelectOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#22211A' }}>
                      {/* 全選択/全解除 */}
                      <div className="border-b p-2 flex gap-2" style={{ borderColor: '#22211A' }}>
                        <button
                          onClick={() => setSelectedVenues([...venues])}
                          className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#22211A', border: '1px solid #22211A' }}
                        >
                          全て選択
                        </button>
                        <button
                          onClick={() => setSelectedVenues([])}
                          className="flex-1 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#22211A', border: '1px solid #22211A' }}
                        >
                          全てのチェックを外す
                        </button>
                      </div>

                      {/* 個別会場選択 */}
                      {venues.map(venue => (
                        <div key={venue} className="p-2">
                          <label className="w-full px-3 py-2 text-sm flex items-center rounded hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: '#22211A' }}>
                            <input
                              type="checkbox"
                              checked={selectedVenues.includes(venue)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedVenues(prev => [...prev, venue])
                                } else {
                                  setSelectedVenues(prev => prev.filter(v => v !== venue))
                                }
                              }}
                              className="mr-2"
                            />
                            {venue}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-2 text-sm" style={{ color: '#22211A' }}>
                対象期間: {analysisData.venueMonthlyTrend[0]?.month || '未設定'} 〜 {analysisData.venueMonthlyTrend[analysisData.venueMonthlyTrend.length - 1]?.month || '未設定'}
                {(chartStartDate || chartEndDate) && (
                  <span className="ml-2 text-blue-600">
                    (フィルター: {chartStartDate || '開始なし'} 〜 {chartEndDate || '終了なし'})
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analysisData.venueMonthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="#22211A"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#22211A"
                    fontSize={11}
                    label={{
                      value: '総実績（MNP + HS）',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#3dae6c', fontSize: 12 }
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string, props: any) => {
                      // 会場名を取得
                      const venueName = name
                      const data = props.payload
                      const mnp = data[`${venueName}_mnp`] || 0
                      const hs = data[`${venueName}_hs`] || 0
                      return [
                        `合計: ${value}件 (MNP: ${mnp}件, 新規: ${hs}件)`,
                        venueName
                      ]
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  {venues.filter(venue =>
                    selectedVenues.includes(venue) &&
                    analysisData.venueMonthlyTrend.some(d => d[venue] && d[venue] > 0)
                  ).map((venue, index) => (
                    <Line
                      key={venue}
                      type="monotone"
                      dataKey={venue}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name={venue}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm" style={{ color: '#22211A' }}>
                  <strong>表示会場数:</strong> {venues.filter(venue =>
                    selectedVenues.includes(venue) &&
                    analysisData.venueMonthlyTrend.some(d => d[venue] && d[venue] > 0)
                  ).length}会場 / 総会場数: {venues.length}会場
                  <br />
                  <strong>選択会場:</strong> {selectedVenues.length > 0 ? selectedVenues.join(', ') : 'なし'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}