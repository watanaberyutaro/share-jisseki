'use client'

import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Calendar, Award, Filter, Search, MapPin, Building2, ChevronDown, Download, GitCompare } from 'lucide-react'
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
  '#3dae6c', '#FFB300', '#DCEDC8', '#9E9E9E', '#FAFAFA', '#FFFBF3', '#858680', '#97724A',
  '#ffbb00', '#f8d549', '#f4e3a4', '#b7e59e',
  '#795939', '#a58a69', '#d5cec3', '#e8e2ce', '#b4a89d', '#2c9b5e'
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

  // 会場別実績用の状態
  const [venueStartDate, setVenueStartDate] = useState<string>('')
  const [venueEndDate, setVenueEndDate] = useState<string>('')
  const [isVenueDateManuallySet, setIsVenueDateManuallySet] = useState(false)

  // スタッフ別週次獲得件数用の状態
  const [staffWeeklyStartDate, setStaffWeeklyStartDate] = useState<string>('')
  const [staffWeeklyEndDate, setStaffWeeklyEndDate] = useState<string>('')
  const [isStaffWeeklyDateManuallySet, setIsStaffWeeklyDateManuallySet] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [isStaffSelectOpen, setIsStaffSelectOpen] = useState(false)

  // PDF生成用のref
  const contentRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('')

  // 比較モーダル用のstate
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareType, setCompareType] = useState<'achievement' | 'weekly' | 'level' | 'achievementStatus' | 'venue' | 'agency' | 'staff' | 'venueMonthly' | 'monthly'>('achievement')
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

  // 初期設定：全ての会場を選択状態にする（初回のみ）
  const [hasInitializedVenues, setHasInitializedVenues] = useState(false)
  useEffect(() => {
    const venues = [...new Set(events.map(e => e.venue))].sort()
    if (venues.length > 0 && !hasInitializedVenues) {
      setSelectedVenues(venues)
      setHasInitializedVenues(true)
    }
  }, [events, hasInitializedVenues])

  // 初期設定：全てのスタッフを選択状態にする（初回のみ）
  const [hasInitializedStaff, setHasInitializedStaff] = useState(false)
  useEffect(() => {
    const staffNames = [...new Set(staffPerformances.map((p: any) => p.staff_name).filter(Boolean))].sort()
    if (staffNames.length > 0 && !hasInitializedStaff) {
      setSelectedStaff(staffNames)
      setHasInitializedStaff(true)
    }
  }, [staffPerformances, hasInitializedStaff])

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
      if (!isStaffWeeklyDateManuallySet) {
        setStaffWeeklyStartDate(bulkStartDate)
        setStaffWeeklyEndDate(bulkEndDate)
      }
    }
  }, [appliedBulkStartDate, appliedBulkEndDate, isAchievementDateManuallySet, isWeeklyDateManuallySet, isLevelDateManuallySet, isAchievementStatusDateManuallySet, isAgencyDateManuallySet, isVenueDateManuallySet, isStaffWeeklyDateManuallySet])

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
      if (!isStaffWeeklyDateManuallySet) {
        setStaffWeeklyStartDate(dateStr)
        setStaffWeeklyEndDate(dateStr)
      }
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
      if (!isStaffWeeklyDateManuallySet) {
        setStaffWeeklyStartDate(`${yearStr}-01`)
        setStaffWeeklyEndDate(`${yearStr}-12`)
      }
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
      if (!isStaffWeeklyDateManuallySet) {
        setStaffWeeklyStartDate('')
        setStaffWeeklyEndDate('')
      }
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
      if (!isStaffWeeklyDateManuallySet) {
        setStaffWeeklyStartDate('')
        setStaffWeeklyEndDate('')
      }
    }
  }, [yearFilter, monthFilter, isAchievementDateManuallySet, isWeeklyDateManuallySet, isLevelDateManuallySet, isAchievementStatusDateManuallySet, isAgencyDateManuallySet, isVenueDateManuallySet, isStaffWeeklyDateManuallySet])

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
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVenueSelectOpen, isStaffSelectOpen])

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
        venueMonthlyTrend: []
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

    // 週次統計（MNPとHSの内訳付き）
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
      const hsTotal = event.actual_hs_total

      acc[sortKey].mnp += mnpTotal
      acc[sortKey].hs += hsTotal
      acc[sortKey].total += mnpTotal + hsTotal
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
      const hsTotal = event.actual_hs_total
      acc[event.venue].mnp += mnpTotal
      acc[event.venue].hs += hsTotal
      acc[event.venue].total += mnpTotal + hsTotal
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
      const hsTotal = event.actual_hs_total
      acc[event.agency_name].mnp += mnpTotal
      acc[event.agency_name].hs += hsTotal
      acc[event.agency_name].total += mnpTotal + hsTotal
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
      const hsTotal = event.actual_hs_total
      venueMonthlyData[event.venue][month].mnp += mnpTotal
      venueMonthlyData[event.venue][month].hs += hsTotal
      venueMonthlyData[event.venue][month].total += mnpTotal + hsTotal
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

      if (!staffWeeklyData[weekKey][perf.staff_name]) {
        staffWeeklyData[weekKey][perf.staff_name] = 0
      }

      // MNP + HS の合計
      const mnpTotal = (perf.au_mnp_total || 0) + (perf.uq_mnp_total || 0)
      const hsTotal = perf.hs_total || 0
      staffWeeklyData[weekKey][perf.staff_name] += mnpTotal + hsTotal
    })

    let staffWeeklyStats = Object.values(staffWeeklyData)
      .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))

    // スタッフ別週次獲得件数の期間フィルタリング
    if (staffWeeklyStartDate && staffWeeklyEndDate) {
      staffWeeklyStats = staffWeeklyStats.filter(item => item.yearMonth >= staffWeeklyStartDate && item.yearMonth <= staffWeeklyEndDate)
    } else if (staffWeeklyStartDate) {
      staffWeeklyStats = staffWeeklyStats.filter(item => item.yearMonth >= staffWeeklyStartDate)
    } else if (staffWeeklyEndDate) {
      staffWeeklyStats = staffWeeklyStats.filter(item => item.yearMonth <= staffWeeklyEndDate)
    } else {
      // フィルタなしの場合は最新8週分のみ表示
      staffWeeklyStats = staffWeeklyStats.slice(-8)
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
      staffWeeklyStats
    }
  }

  const analysisData = getAnalysisData()
  const years = [...new Set(events.map(e => e.year))].sort()
  const venues = [...new Set(events.map(e => e.venue))].sort()
  const agencies = [...new Set(events.map(e => e.agency_name))].sort()
  const allStaffNames = [...new Set(staffPerformances.map((p: any) => p.staff_name).filter(Boolean))].sort()

  // ツールチップの共通スタイル
  const tooltipStyle = {
    backgroundColor: '#FAFAFA',
    border: '2px solid #d5cec3',
    borderRadius: '8px',
    color: '#a58a69',
    fontWeight: 'bold',
    padding: '8px',
    textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)'
  }

  // 円グラフ用のカスタムツールチップスタイル
  const pieTooltipStyle = {
    backgroundColor: '#FAFAFA',
    border: '2px solid #d5cec3',
    borderRadius: '8px',
    fontWeight: 'bold',
    padding: '8px',
    textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.6)'
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
  const openCompareModal = (type: 'achievement' | 'weekly' | 'level' | 'achievementStatus' | 'venue' | 'agency' | 'staff' | 'venueMonthly' | 'monthly') => {
    setCompareType(type)
    setCompareLeftStart('')
    setCompareLeftEnd('')
    setCompareRightStart('')
    setCompareRightEnd('')
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

      // 週次実績(MNPとHSの内訳付き)
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
        const hsTotal = event.actual_hs_total

        acc[sortKey].mnp += mnpTotal
        acc[sortKey].hs += hsTotal
        acc[sortKey].total += mnpTotal + hsTotal

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
        const hsTotal = event.actual_hs_total
        acc[event.venue].mnp += mnpTotal
        acc[event.venue].hs += hsTotal
        acc[event.venue].total += mnpTotal + hsTotal
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
        const hsTotal = event.actual_hs_total
        acc[event.agency_name].mnp += mnpTotal
        acc[event.agency_name].hs += hsTotal
        acc[event.agency_name].total += mnpTotal + hsTotal
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

        if (!staffWeeklyData[weekKey][perf.staff_name]) {
          staffWeeklyData[weekKey][perf.staff_name] = 0
        }

        // MNP + HS の合計
        const mnpTotal = (perf.au_mnp_total || 0) + (perf.uq_mnp_total || 0)
        const hsTotal = perf.hs_total || 0
        staffWeeklyData[weekKey][perf.staff_name] += mnpTotal + hsTotal
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

      return {
        monthlyAchievementTrend,
        weeklyStats,
        performanceLevels,
        achievementStats,
        venueStats,
        agencyStats,
        staffWeeklyStats,
        venueMonthlyTrend
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
                <XAxis dataKey="period" stroke="#22211A" fontSize={12} />
                <YAxis stroke="#22211A" fontSize={12} domain={[0, 100]} unit="%" />
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
                <XAxis dataKey="period" stroke="#22211A" fontSize={12} />
                <YAxis stroke="#22211A" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, name: string) => {
                    if (name === 'MNP') return [`${value}件`, 'MNP']
                    if (name === 'HS') return [`${value}件`, 'HS']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="hs" stackId="a" fill="#ffe680" name="HS" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
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
                <XAxis dataKey="venue" stroke="#22211A" fontSize={12} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#22211A" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, name: string) => {
                    if (name === 'MNP') return [`${value}件`, 'MNP']
                    if (name === 'HS') return [`${value}件`, 'HS']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="hs" stackId="a" fill="#ffe680" name="HS" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
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
      return (
        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center mb-3" style={{ color: '#22211A' }}>
              <Building2 className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              代理店別実績
            </h3>
          </div>
          {data.agencyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.agencyStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="agency" stroke="#22211A" fontSize={12} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#22211A" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: any, name: string) => {
                    if (name === 'MNP') return [`${value}件`, 'MNP']
                    if (name === 'HS') return [`${value}件`, 'HS']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="hs" stackId="a" fill="#ffe680" name="HS" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
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
                <XAxis dataKey="week" stroke="#22211A" fontSize={12} />
                <YAxis stroke="#22211A" fontSize={12} label={{ value: '獲得件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {displayStaff.map((staffName, index) => (
                  <Bar
                    key={staffName}
                    dataKey={staffName}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                    name={staffName}
                    stroke="none"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                ))}
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
                      style: { fill: '#22211A', fontSize: 12 }
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
                        `${value}件 (MNP: ${mnp}件, HS: ${hs}件)`,
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

              {/* その他のパネルの比較 */}
              {(
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
                  <XAxis dataKey="period" stroke="#22211A" fontSize={12} />
                  <YAxis stroke="#22211A" fontSize={12} domain={[0, 100]} unit="%" />
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
                  <XAxis dataKey="period" stroke="#22211A" fontSize={12} />
                  <YAxis stroke="#22211A" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string) => {
                      if (name === 'MNP') return [`${value}件`, 'MNP']
                      if (name === 'HS') return [`${value}件`, 'HS']
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                  <Bar dataKey="hs" stackId="a" fill="#ffe680" name="HS" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
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
                  </div>
                </div>
              {analysisData.agencyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analysisData.agencyStats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="agency" stroke="#22211A" fontSize={12} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#22211A" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any, name: string) => {
                        if (name === 'MNP') return [`${value}件`, 'MNP']
                        if (name === 'HS') return [`${value}件`, 'HS']
                        return [value, name]
                      }}
                    />
                    <Legend />
                    <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="hs" stackId="a" fill="#ffe680" name="HS" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
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
                  </div>
                </div>
              {analysisData.venueStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analysisData.venueStats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="venue" stroke="#22211A" fontSize={12} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#22211A" fontSize={12} label={{ value: '合計件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any, name: string) => {
                        if (name === 'MNP') return [`${value}件`, 'MNP']
                        if (name === 'HS') return [`${value}件`, 'HS']
                        return [value, name]
                      }}
                    />
                    <Legend />
                    <Bar dataKey="mnp" stackId="a" fill="#FFB300" name="MNP" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="hs" stackId="a" fill="#ffe680" name="HS" stroke="none" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
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
          </div>

          {/* スタッフ別週次獲得件数 */}
          <div className="lg:col-span-2 glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
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
                    <span style={{ color: '#22211A' }}>期間:</span>
                    <input
                      type="month"
                      value={staffWeeklyStartDate}
                      onChange={(e) => {
                        setStaffWeeklyStartDate(e.target.value)
                        setIsStaffWeeklyDateManuallySet(true)
                      }}
                      className="px-2 py-1 border rounded"
                      style={{ borderColor: '#22211A', fontSize: '12px' }}
                    />
                    <span style={{ color: '#22211A' }}>〜</span>
                    <input
                      type="month"
                      value={staffWeeklyEndDate}
                      onChange={(e) => {
                        setStaffWeeklyEndDate(e.target.value)
                        setIsStaffWeeklyDateManuallySet(true)
                      }}
                      className="px-2 py-1 border rounded"
                      style={{ borderColor: '#22211A', fontSize: '12px' }}
                    />
                    {(staffWeeklyStartDate || staffWeeklyEndDate) && (
                      <button
                        onClick={() => {
                          setStaffWeeklyStartDate('')
                          setStaffWeeklyEndDate('')
                          setIsStaffWeeklyDateManuallySet(false)
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
              </div>
            {analysisData.staffWeeklyStats && analysisData.staffWeeklyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analysisData.staffWeeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="#22211A" fontSize={12} />
                  <YAxis stroke="#22211A" fontSize={12} label={{ value: '獲得件数', angle: -90, position: 'insideLeft', style: { fill: '#22211A' } }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {selectedStaff.map((staffName, index) => (
                    <Bar
                      key={staffName}
                      dataKey={staffName}
                      stackId="a"
                      fill={COLORS[index % COLORS.length]}
                      name={staffName}
                      stroke="none"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  ))}
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
                      style: { fill: '#22211A', fontSize: 12 }
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
                        `合計: ${value}件 (MNP: ${mnp}件, HS: ${hs}件)`,
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