'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, MapPin, Users, TrendingUp, CheckCircle, XCircle, Search, Filter, Building2, Eye, LayoutGrid, List, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { LoadingAnimation } from '@/components/loading-animation'

interface EventSummary {
  id: string
  venue: string
  agency_name: string
  start_date: string
  end_date: string
  year: number
  month: number
  week_number: number
  include_cellup_in_hs_total: boolean
  period_display: string
  event_days: number
  target_hs_total: number
  actual_hs_total: number
  actual_au_mnp: number
  actual_uq_mnp: number
  actual_au_new: number
  actual_uq_new: number
  actual_cellup: number
  created_at: string
}

const STORAGE_KEY = 'performanceListFilters'

export function PerformanceListV2() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all')
  const [agencyFilter, setAgencyFilter] = useState<string | 'all'>('all')
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'achieved' | 'not_achieved'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'actual_hs_total' | 'venue'>('date')
  const [viewMode, setViewMode] = useState<'panel' | 'list'>('panel')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // 初期化: URLパラメータ > localStorage の優先順位で復元
  useEffect(() => {
    const urlYear = searchParams?.get('year')
    const urlMonth = searchParams?.get('month')
    const urlWeek = searchParams?.get('week')
    const urlAgency = searchParams?.get('agency')
    const urlAchievement = searchParams?.get('achievement')
    const urlSort = searchParams?.get('sort')
    const urlSearch = searchParams?.get('search')
    const urlView = searchParams?.get('view')

    // URLパラメータがある場合は優先
    if (urlYear || urlMonth || urlWeek || urlAgency || urlAchievement || urlSort || urlSearch || urlView) {
      if (urlYear) setYearFilter(urlYear === 'all' ? 'all' : Number(urlYear))
      if (urlMonth) setMonthFilter(urlMonth === 'all' ? 'all' : Number(urlMonth))
      if (urlWeek) setWeekFilter(urlWeek === 'all' ? 'all' : Number(urlWeek))
      if (urlAgency) setAgencyFilter(urlAgency)
      if (urlAchievement) setAchievementFilter(urlAchievement as any)
      if (urlSort) setSortBy(urlSort as any)
      if (urlSearch) setSearchTerm(urlSearch)
      if (urlView) setViewMode(urlView as any)
    } else {
      // URLパラメータがない場合はlocalStorageから復元
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const filters = JSON.parse(saved)
          setSearchTerm(filters.searchTerm || '')
          setYearFilter(filters.yearFilter || 'all')
          setMonthFilter(filters.monthFilter || 'all')
          setWeekFilter(filters.weekFilter || 'all')
          setAgencyFilter(filters.agencyFilter || 'all')
          setAchievementFilter(filters.achievementFilter || 'all')
          setSortBy(filters.sortBy || 'date')
          setViewMode(filters.viewMode || 'panel')
        }
      } catch (error) {
        console.error('Failed to load filters from localStorage:', error)
      }
    }
  }, [])

  // フィルター変更時にlocalStorageとURLを更新
  useEffect(() => {
    const filters = {
      searchTerm,
      yearFilter,
      monthFilter,
      weekFilter,
      agencyFilter,
      achievementFilter,
      sortBy,
      viewMode
    }

    // localStorageに保存
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error)
    }

    // URLパラメータを更新
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (yearFilter !== 'all') params.set('year', String(yearFilter))
    if (monthFilter !== 'all') params.set('month', String(monthFilter))
    if (weekFilter !== 'all') params.set('week', String(weekFilter))
    if (agencyFilter !== 'all') params.set('agency', agencyFilter)
    if (achievementFilter !== 'all') params.set('achievement', achievementFilter)
    if (sortBy !== 'date') params.set('sort', sortBy)
    if (viewMode !== 'panel') params.set('view', viewMode)

    const queryString = params.toString()
    const newUrl = queryString ? `/view?${queryString}` : '/view'
    router.replace(newUrl, { scroll: false })
  }, [searchTerm, yearFilter, monthFilter, weekFilter, agencyFilter, achievementFilter, sortBy, viewMode])

  // リセット関数
  const handleReset = () => {
    setSearchTerm('')
    setYearFilter('all')
    setMonthFilter('all')
    setWeekFilter('all')
    setAgencyFilter('all')
    setAchievementFilter('all')
    setSortBy('date')
    setViewMode('panel')
    setCurrentPage(1)
  }

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const response = await fetch('/api/performances/enhanced-v2')

        if (response.ok && !cancelled) {
          const data = await response.json()
          setEvents(data || [])
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch data:', error)
          setEvents([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])


  // フィルターが変更されたときに、ページを1にリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, yearFilter, monthFilter, weekFilter, agencyFilter, achievementFilter, sortBy])

  // 年の選択肢を生成
  const availableYears = [...new Set(events.map(e => e.year))].sort((a, b) => b - a)

  // 代理店の選択肢を生成
  const availableAgencies = [...new Set(events.map(e => e.agency_name))].sort()

  // 現在のURLパラメータを取得してリンクに使用
  const getCurrentQueryString = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (yearFilter !== 'all') params.set('year', String(yearFilter))
    if (monthFilter !== 'all') params.set('month', String(monthFilter))
    if (weekFilter !== 'all') params.set('week', String(weekFilter))
    if (agencyFilter !== 'all') params.set('agency', agencyFilter)
    if (achievementFilter !== 'all') params.set('achievement', achievementFilter)
    if (sortBy !== 'date') params.set('sort', sortBy)
    if (viewMode !== 'panel') params.set('view', viewMode)
    return params.toString()
  }

  const filteredAndSortedEvents = events
    .filter(event => {
      // テキスト検索
      const matchesSearch =
        event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.agency_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.period_display.toLowerCase().includes(searchTerm.toLowerCase())

      // 年月週代理店フィルター
      const matchesYear = yearFilter === 'all' || event.year === yearFilter
      const matchesMonth = monthFilter === 'all' || event.month === monthFilter
      const matchesWeek = weekFilter === 'all' || event.week_number === weekFilter
      const matchesAgency = agencyFilter === 'all' || event.agency_name === agencyFilter

      // 達成フィルター
      const isAchieved = event.target_hs_total > 0 && event.actual_hs_total >= event.target_hs_total
      const matchesAchievement =
        achievementFilter === 'all' ||
        (achievementFilter === 'achieved' && isAchieved) ||
        (achievementFilter === 'not_achieved' && event.target_hs_total > 0 && !isAchieved)

      return matchesSearch && matchesYear && matchesMonth && matchesWeek && matchesAgency && matchesAchievement
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'actual_hs_total':
          return b.actual_hs_total - a.actual_hs_total
        case 'venue':
          return a.venue.localeCompare(b.venue)
        default:
          return 0
      }
    })

  // ページネーション計算
  const totalPages = Math.ceil(filteredAndSortedEvents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageEvents = filteredAndSortedEvents.slice(startIndex, endIndex)

  // ページ変更ハンドラー
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      // ページトップへスクロール
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading) {
    return <LoadingAnimation />
  }

  return (
    <div className="space-y-3 md:space-y-6 pb-20 md:pb-0">
      {/* Search and Filter Controls */}
      <div className="glass rounded-lg p-3 md:p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <div className="flex flex-col space-y-3 md:space-y-4">
          {/* 総イベント数表示 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1 md:mb-2">
            <h2 className="text-base md:text-lg font-bold" style={{ color: '#22211A' }}>
              イベント実績検索・絞り込み
            </h2>

            <div className="flex items-center gap-2 text-xs md:text-sm">
              <div className="px-2 md:px-4 py-1 md:py-2 rounded-full" style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#FFB300' }}>
                <span className="font-medium">総: {events.length}件</span>
              </div>
              <div className="px-2 md:px-4 py-1 md:py-2 rounded-full" style={{ backgroundColor: 'rgba(74, 191, 121, 0.1)', color: '#4abf79' }}>
                <span className="font-medium">表示: {filteredAndSortedEvents.length}件</span>
              </div>
            </div>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 md:w-5 h-4 md:h-5" style={{ color: '#22211A' }} />
            <input
              type="text"
              placeholder="会場、代理店、期間で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm md:text-base" style={{ border: '1px solid #22211A', color: '#22211A' }}
            />
          </div>

          {/* フィルターと表示切り替え */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* フィルター部分 */}
            <div className="w-full md:flex-1">
              <div className="flex items-center gap-2 mb-2 md:hidden">
                <Filter className="w-4 h-4" style={{ color: '#22211A' }} />
                <span className="text-xs font-medium" style={{ color: '#22211A' }}>絞り込み</span>
              </div>
              <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2">
                <div className="hidden md:flex items-center mr-2">
                  <Filter className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  <span className="text-sm font-medium" style={{ color: '#22211A' }}>絞り込み:</span>
                </div>

                {/* 年 */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-2 md:px-3 py-1.5 md:py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs md:text-sm appearance-none bg-no-repeat bg-right pr-6 md:pr-8" style={{ border: '1px solid #22211A', color: '#22211A', backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjMjIyMTFBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+")', backgroundPosition: 'right 8px center', backgroundSize: '10px 6px' }}
                >
                  <option value="all">全年</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>

                {/* 月 */}
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-2 md:px-3 py-1.5 md:py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs md:text-sm appearance-none bg-no-repeat bg-right pr-6 md:pr-8" style={{ border: '1px solid #22211A', color: '#22211A', backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjMjIyMTFBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+")', backgroundPosition: 'right 8px center', backgroundSize: '10px 6px' }}
                >
                  <option value="all">全月</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>

                {/* 週 */}
                <select
                  value={weekFilter}
                  onChange={(e) => setWeekFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-2 md:px-3 py-1.5 md:py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs md:text-sm appearance-none bg-no-repeat bg-right pr-6 md:pr-8" style={{ border: '1px solid #22211A', color: '#22211A', backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjMjIyMTFBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+")', backgroundPosition: 'right 8px center', backgroundSize: '10px 6px' }}
                >
                  <option value="all">全週</option>
                  {[...Array(5)].map((_, i) => (
                    <option key={i} value={i + 1}>第{i + 1}週</option>
                  ))}
                </select>

                {/* 代理店 */}
                <select
                  value={agencyFilter}
                  onChange={(e) => setAgencyFilter(e.target.value)}
                  className="px-2 md:px-3 py-1.5 md:py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs md:text-sm appearance-none bg-no-repeat bg-right pr-6 md:pr-8" style={{ border: '1px solid #22211A', color: '#22211A', backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjMjIyMTFBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+")', backgroundPosition: 'right 8px center', backgroundSize: '10px 6px' }}
                >
                  <option value="all">全代理店</option>
                  {availableAgencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>

                {/* 達成状態 */}
                <select
                  value={achievementFilter}
                  onChange={(e) => setAchievementFilter(e.target.value as typeof achievementFilter)}
                  className="px-2 md:px-3 py-1.5 md:py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs md:text-sm appearance-none bg-no-repeat bg-right pr-6 md:pr-8" style={{ border: '1px solid #22211A', color: '#22211A', backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjMjIyMTFBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+")', backgroundPosition: 'right 8px center', backgroundSize: '10px 6px' }}
                >
                  <option value="all">全て</option>
                  <option value="achieved">達成</option>
                  <option value="not_achieved">未達成</option>
                </select>

                {/* ソート */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-2 md:px-3 py-1.5 md:py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs md:text-sm appearance-none bg-no-repeat bg-right pr-6 md:pr-8" style={{ border: '1px solid #22211A', color: '#22211A', backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjMjIyMTFBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+")', backgroundPosition: 'right 8px center', backgroundSize: '10px 6px' }}
                >
                  <option value="date">日付順</option>
                  <option value="actual_hs_total">実績順</option>
                  <option value="venue">会場順</option>
                </select>

                {/* リセットボタン */}
                <button
                  onClick={handleReset}
                  className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg border transition-all hover:opacity-80 flex items-center gap-1 text-xs md:text-sm"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                  title="検索条件をリセット"
                >
                  <RotateCcw className="w-3 md:w-4 h-3 md:h-4" />
                  <span className="hidden md:inline">リセット</span>
                </button>
              </div>
            </div>

            {/* 表示切り替えボタン */}
            <div className="flex items-center justify-center md:justify-start bg-muted border rounded-lg p-1" style={{ borderColor: '#22211A' }}>
              <button
                onClick={() => setViewMode('panel')}
                className="p-1.5 md:p-2 rounded-md transition-all"
                style={{
                  backgroundColor: viewMode === 'panel' ? '#22211A' : 'transparent',
                  color: viewMode === 'panel' ? '#FFFFFF' : '#22211A'
                }}
                title="パネル表示"
              >
                <LayoutGrid className="w-4 md:w-5 h-4 md:h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 md:p-2 rounded-md transition-all"
                style={{
                  backgroundColor: viewMode === 'list' ? '#22211A' : 'transparent',
                  color: viewMode === 'list' ? '#FFFFFF' : '#22211A'
                }}
                title="リスト表示"
              >
                <List className="w-4 md:w-5 h-4 md:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events Display */}
      {viewMode === 'panel' ? (
        // Panel View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentPageEvents.map((event, index) => (
          <div
            key={event.id}
            className="group glass rounded-lg border p-6"
            style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 20px 35px rgba(0, 0, 0, 0.15), 0 8px 15px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 mr-2 shrink-0" style={{ color: '#22211A' }} />
                  <h3 className="text-lg font-bold group-hover:opacity-80 transition-colors truncate" style={{ color: '#22211A' }}>
                    {event.period_display}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm" style={{ color: '#22211A' }}>
                  <div className="flex items-center min-w-0">
                    <MapPin className="w-4 h-4 mr-1 shrink-0" style={{ color: '#22211A' }} />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center min-w-0">
                    <Building2 className="w-4 h-4 mr-1 shrink-0" style={{ color: '#22211A' }} />
                    <span className="truncate">{event.agency_name}</span>
                  </div>
                  <div className="flex items-center sm:col-span-2">
                    <Calendar className="w-4 h-4 mr-1 shrink-0" style={{ color: '#22211A' }} />
                    <span>{format(new Date(event.start_date), 'M/d', { locale: ja })} 〜 {format(new Date(event.end_date), 'M/d', { locale: ja })} ({event.event_days}日間)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center shrink-0">
                {event.target_hs_total > 0 && event.actual_hs_total >= event.target_hs_total ? (
                  <CheckCircle className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#4abf79' }} />
                ) : (
                  <XCircle className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#ef4444' }} />
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
              <div className="text-center p-3 rounded-xl bg-muted">
                <div className="text-2xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {event.actual_hs_total}
                </div>
                <div className="text-xs mb-1" style={{ color: '#22211A' }}>実績HS総販</div>
                <div className="text-xs px-2 py-0.5 rounded inline-block mb-1" style={{ backgroundColor: event.include_cellup_in_hs_total ? '#4abf79' : '#9E9E9E', color: '#FFFFFF' }}>
                  {event.include_cellup_in_hs_total ? 'セルアップ含む' : 'セルアップ含まない'}
                </div>
                {event.target_hs_total > 0 && (
                  <div className="text-xs mt-1" style={{ color: '#22211A' }}>
                    目標: {event.target_hs_total}
                  </div>
                )}
              </div>
              <div className="text-center p-3 rounded-xl bg-muted">
                <div className="text-2xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {event.actual_au_mnp + event.actual_uq_mnp}
                </div>
                <div className="text-xs" style={{ color: '#22211A' }}>MNP合計</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted">
                <div className="text-2xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {event.actual_au_new + event.actual_uq_new}
                </div>
                <div className="text-xs" style={{ color: '#22211A' }}>新規合計</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted">
                <div className="text-2xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {event.actual_cellup || 0}
                </div>
                <div className="text-xs" style={{ color: '#22211A' }}>セルアップ</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted">
                <div className="text-2xl font-bold mb-1" style={{ color: '#22211A' }}>
                  {event.target_hs_total > 0 ? Math.round((event.actual_hs_total / event.target_hs_total) * 100) : 0}%
                </div>
                <div className="text-xs" style={{ color: '#22211A' }}>達成率</div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: '#22211A' }}>au MNP</span>
                <span className="font-medium" style={{ color: '#22211A' }}>{event.actual_au_mnp}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: '#22211A' }}>UQ MNP</span>
                <span className="font-medium" style={{ color: '#22211A' }}>{event.actual_uq_mnp}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: '#22211A' }}>au 新規</span>
                <span className="font-medium" style={{ color: '#22211A' }}>{event.actual_au_new}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: '#22211A' }}>UQ 新規</span>
                <span className="font-medium" style={{ color: '#22211A' }}>{event.actual_uq_new}件</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: '#22211A' }}>セルアップ</span>
                <span className="font-medium" style={{ color: '#22211A' }}>{event.actual_cellup || 0}件</span>
              </div>
            </div>

            {/* Progress Indicator */}
            {event.target_hs_total > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#22211A' }}>目標達成進捗</span>
                  <span className="text-sm font-medium" style={{ color: '#22211A' }}>
                    {event.actual_hs_total} / {event.target_hs_total}
                  </span>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div
                    className="h-2 bg-muted rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.round((event.actual_hs_total / event.target_hs_total) * 100), 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href={`/view/${event.id}${getCurrentQueryString() ? `?${getCurrentQueryString()}` : ''}`}
                className="group flex items-center justify-center w-full px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 border font-bold"
                style={{ backgroundColor: '#FFB300', color: '#FFFFFF', borderColor: '#FFB300' }}
              >
                <Eye className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" style={{ color: '#FFFFFF' }} />
                詳細を見る
              </Link>
            </div>
          </div>
        ))}
        </div>
      ) : (
        // List View
        <div className="space-y-2">
          {currentPageEvents.map((event, index) => (
            <div
              key={event.id}
              className="glass rounded-lg border p-3"
              style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 20px 35px rgba(0, 0, 0, 0.15), 0 8px 15px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                {/* Left side - Event info */}
                <div className="flex-1 min-w-0 w-full md:w-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm md:text-base font-bold truncate" style={{ color: '#22211A' }}>
                      {event.period_display}
                    </h3>
                    {event.target_hs_total > 0 && event.actual_hs_total >= event.target_hs_total ? (
                      <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#4abf79' }} />
                    ) : event.target_hs_total > 0 ? (
                      <XCircle className="w-5 h-5 shrink-0" style={{ color: '#ef4444' }} />
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs" style={{ color: '#22211A' }}>
                    <div className="flex items-center min-w-0">
                      <MapPin className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center min-w-0">
                      <Building2 className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{event.agency_name}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 shrink-0" />
                      <span className="whitespace-nowrap">{format(new Date(event.start_date), 'M/d', { locale: ja })} 〜 {format(new Date(event.end_date), 'M/d', { locale: ja })}</span>
                    </div>
                  </div>
                </div>

                {/* Right side - Stats and button */}
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex gap-2 md:gap-3">
                    <div className="text-center">
                      <div className="text-xs md:text-sm font-bold" style={{ color: '#22211A' }}>{event.actual_hs_total}</div>
                      <div className="text-xs" style={{ color: '#22211A' }}>HS</div>
                      <div className="text-xs px-1 py-0.5 rounded mt-1" style={{ backgroundColor: event.include_cellup_in_hs_total ? '#4abf79' : '#9E9E9E', color: '#FFFFFF', fontSize: '0.6rem' }}>
                        {event.include_cellup_in_hs_total ? 'セルアップ含' : 'セルアップ無'}
                      </div>
                    </div>

                    {event.target_hs_total > 0 && (
                      <div className="text-center">
                        <div className="text-xs md:text-sm font-bold" style={{ color: '#22211A' }}>
                          {Math.round((event.actual_hs_total / event.target_hs_total) * 100)}%
                        </div>
                        <div className="text-xs" style={{ color: '#22211A' }}>達成</div>
                      </div>
                    )}

                    <div className="text-center">
                      <div className="text-xs md:text-sm font-bold" style={{ color: '#22211A' }}>
                        {event.actual_au_mnp + event.actual_uq_mnp}
                      </div>
                      <div className="text-xs" style={{ color: '#22211A' }}>MNP</div>
                    </div>

                    <div className="text-center">
                      <div className="text-xs md:text-sm font-bold" style={{ color: '#22211A' }}>
                        {event.actual_au_new + event.actual_uq_new}
                      </div>
                      <div className="text-xs" style={{ color: '#22211A' }}>新規</div>
                    </div>
                  </div>

                  <Link
                    href={`/view/${event.id}${getCurrentQueryString() ? `?${getCurrentQueryString()}` : ''}`}
                    className="px-2 md:px-3 py-1.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1 border font-bold shrink-0"
                    style={{ backgroundColor: '#FFB300', color: '#FFFFFF', borderColor: '#FFB300' }}
                  >
                    <Eye className="w-4 md:w-5 h-4 md:h-5" style={{ color: '#FFFFFF' }} />
                    <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>詳細</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredAndSortedEvents.length > 0 && totalPages > 1 && (
        <div className="glass rounded-lg border p-4" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* ページ情報 */}
            <div className="text-sm" style={{ color: '#22211A' }}>
              <span className="font-medium">
                {startIndex + 1} 〜 {Math.min(endIndex, filteredAndSortedEvents.length)} 件
              </span>
              <span className="mx-2">/</span>
              <span>全 {filteredAndSortedEvents.length} 件</span>
            </div>

            {/* ページネーションボタン */}
            <div className="flex items-center gap-2">
              {/* 前へボタン */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
                style={{
                  borderColor: '#22211A',
                  backgroundColor: currentPage === 1 ? 'transparent' : '#FFB300',
                  color: currentPage === 1 ? '#22211A' : '#FFFFFF'
                }}
                title="前のページ"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* ページ番号 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // 最初のページ、最後のページ、現在のページの前後2ページを表示
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)

                  // 省略記号を表示する条件
                  const showEllipsisBefore = page === currentPage - 3 && currentPage > 4
                  const showEllipsisAfter = page === currentPage + 3 && currentPage < totalPages - 3

                  if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                    return null
                  }

                  if (showEllipsisBefore || showEllipsisAfter) {
                    return (
                      <span key={`ellipsis-${page}`} className="px-2" style={{ color: '#22211A' }}>
                        ...
                      </span>
                    )
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className="min-w-[40px] h-10 rounded-lg border transition-all font-medium hover:opacity-80"
                      style={{
                        borderColor: '#22211A',
                        backgroundColor: currentPage === page ? '#FFB300' : 'transparent',
                        color: currentPage === page ? '#FFFFFF' : '#22211A'
                      }}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>

              {/* 次へボタン */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
                style={{
                  borderColor: '#22211A',
                  backgroundColor: currentPage === totalPages ? 'transparent' : '#FFB300',
                  color: currentPage === totalPages ? '#22211A' : '#FFFFFF'
                }}
                title="次のページ"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* ページ移動 */}
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#22211A' }}>ページ:</span>
              <select
                value={currentPage}
                onChange={(e) => goToPage(Number(e.target.value))}
                className="px-3 py-2 bg-muted rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-no-repeat bg-right pr-8"
                style={{
                  borderColor: '#22211A',
                  color: '#22211A',
                  backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjMjIyMTFBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+")',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '10px 6px'
                }}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <option key={page} value={page}>
                    {page} / {totalPages}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {filteredAndSortedEvents.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.5 }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: '#22211A' }}>
            {events.length === 0 ? '実績データがありません' : '検索条件に一致するイベントがありません'}
          </h3>
          <p style={{ color: '#22211A' }}>
            {events.length === 0
              ? '実績を入力すると、ここに表示されます'
              : '検索条件を変更してお試しください'
            }
          </p>
        </div>
      )}
    </div>
  )
}