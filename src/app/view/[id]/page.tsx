'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Building2, Users, Camera, Download, ExternalLink, ChevronDown, ChevronRight, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { LoadingAnimation } from '@/components/loading-animation'
import { MagneticDots } from '@/components/MagneticDots'

interface EventDetail {
  id: string
  venue: string
  agency_name: string
  start_date: string
  end_date: string
  year: number
  month: number
  week_number: number
  include_cellup_in_hs_total: boolean
  target_hs_total: number
  actual_hs_total: number
  actual_au_mnp: number
  actual_uq_mnp: number
  actual_au_new: number
  actual_uq_new: number
  actual_cellup: number
  staff_performances: StaffPerformance[]
  photos: Photo[]
  created_at: string
  operation_details?: string
  preparation_details?: string
  promotion_method?: string
  success_case_1?: string
  success_case_2?: string
  challenges_and_solutions?: string
}

interface DailyPerformance {
  id: string
  staff_name: string
  day_number: number
  event_date: string
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
  credit_card: number
  gold_card: number
  ji_bank_account: number
  warranty: number
  ott: number
  electricity: number
  gas: number
}

interface StaffPerformance {
  staff_name: string
  au_mnp: number
  uq_mnp: number
  au_new: number
  uq_new: number
  cellup: number
  credit_card: number
  gold_card: number
  ji_bank_account: number
  warranty: number
  ott: number
  electricity: number
  gas: number
  daily_performances?: DailyPerformance[]
}

interface Photo {
  id: string
  file_name: string
  file_url: string
  description: string
  created_at: string
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [expandedStaff, setExpandedStaff] = useState<Set<number>>(new Set())
  const [staffViewMode, setStaffViewMode] = useState<'summary' | 'daily'>('summary')
  const [expandedDailyStaff, setExpandedDailyStaff] = useState<Set<number>>(new Set())
  const [expandedDailyDays, setExpandedDailyDays] = useState<Set<string>>(new Set())

  const eventId = params?.id as string
  const isRefresh = searchParams?.get('refresh') === 'true'

  useEffect(() => {
    if (eventId) {
      fetchEventDetail()
    }
  }, [eventId, isRefresh])

  const fetchEventDetail = async () => {
    try {
      // キャッシュバスティングのためにタイムスタンプを追加
      const response = await fetch(`/api/events/${eventId}/detail?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEvent(data)
      } else {
        console.error('Failed to fetch event detail')
      }
    } catch (error) {
      console.error('Error fetching event detail:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate event days
  const calculateEventDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // Toggle staff expansion
  const toggleStaffExpansion = (index: number) => {
    const newExpanded = new Set(expandedStaff)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedStaff(newExpanded)
  }

  // Toggle daily staff expansion
  const toggleDailyStaffExpansion = (index: number) => {
    const newExpanded = new Set(expandedDailyStaff)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedDailyStaff(newExpanded)
  }

  // Toggle daily day expansion
  const toggleDailyDayExpansion = (key: string) => {
    const newExpanded = new Set(expandedDailyDays)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedDailyDays(newExpanded)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
        <MagneticDots />
        <LoadingAnimation />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8" style={{ paddingTop: '80px' }}>
        <MagneticDots />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#22211A' }}>イベントが見つかりません</h1>
          <button
            onClick={() => router.push('/view')}
            className="inline-flex items-center px-4 py-2 rounded-lg hover:opacity-90 transition-colors border" style={{ backgroundColor: '#22211A', color: '#FFFFFF', borderColor: '#22211A' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  const eventDays = calculateEventDays(event.start_date, event.end_date)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 md:pb-6" style={{ paddingTop: '80px' }}>
      <MagneticDots />
      <div className="fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/view')}
          className="inline-flex items-center hover:opacity-80 transition-colors mb-4" style={{ color: '#22211A' }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" style={{ color: '#22211A' }} />
          実績一覧に戻る
        </button>

        <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-4" style={{ color: '#22211A' }}>
                {format(new Date(event.start_date), 'yyyy年M月d日', { locale: ja })} 〜 {format(new Date(event.end_date), 'M月d日', { locale: ja })}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ color: '#22211A' }}>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" style={{ color: '#22211A' }} />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center">
                  <Building2 className="w-4 h-4 mr-2" style={{ color: '#22211A' }} />
                  <span>{event.agency_name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" style={{ color: '#22211A' }} />
                  <span>{eventDays}日間</span>
                </div>
              </div>
            </div>
            <div>
              <button
                onClick={() => router.push(`/edit/${event.id}`)}
                className="inline-flex items-center px-4 py-2 rounded-lg hover:opacity-90 transition-colors border font-bold"
                style={{ backgroundColor: '#FFB300', color: '#FFFFFF', borderColor: '#FFB300' }}
              >
                <Edit className="w-4 h-4 mr-2" />
                編集
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Stats */}
          <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#22211A' }}>実績サマリー</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-xl">
                <div className="text-3xl font-bold mb-2" style={{ color: '#22211A' }}>
                  {event.actual_hs_total}
                </div>
                <div className="text-sm mb-2" style={{ color: '#22211A' }}>実績HS総販</div>
                <div className="text-xs px-2 py-1 rounded inline-block mb-2" style={{ backgroundColor: event.include_cellup_in_hs_total ? '#4abf79' : '#9E9E9E', color: '#FFFFFF' }}>
                  {event.include_cellup_in_hs_total ? 'セルアップ含む' : 'セルアップ含まない'}
                </div>
                {event.target_hs_total > 0 && (
                  <div className="text-xs mt-1" style={{ color: '#22211A' }}>
                    目標: {event.target_hs_total}
                  </div>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <div className="text-3xl font-bold mb-2" style={{ color: '#22211A' }}>
                  {event.actual_au_mnp + event.actual_uq_mnp}
                </div>
                <div className="text-sm" style={{ color: '#22211A' }}>MNP合計</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <div className="text-3xl font-bold mb-2" style={{ color: '#22211A' }}>
                  {event.actual_au_new + event.actual_uq_new}
                </div>
                <div className="text-sm" style={{ color: '#22211A' }}>新規合計</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <div className="text-3xl font-bold mb-2" style={{ color: '#22211A' }}>
                  {event.actual_cellup || 0}
                </div>
                <div className="text-sm" style={{ color: '#22211A' }}>セルアップ</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <div className="text-3xl font-bold mb-2" style={{ color: '#22211A' }}>
                  {event.target_hs_total > 0 ? Math.round((event.actual_hs_total / event.target_hs_total) * 100) : 0}%
                </div>
                <div className="text-sm" style={{ color: '#22211A' }}>達成率</div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span style={{ color: '#22211A' }}>au MNP</span>
                <span className="font-semibold text-lg" style={{ color: '#22211A' }}>{event.actual_au_mnp}件</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span style={{ color: '#22211A' }}>UQ MNP</span>
                <span className="font-semibold text-lg" style={{ color: '#22211A' }}>{event.actual_uq_mnp}件</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span style={{ color: '#22211A' }}>au 新規</span>
                <span className="font-semibold text-lg" style={{ color: '#22211A' }}>{event.actual_au_new}件</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span style={{ color: '#22211A' }}>UQ 新規</span>
                <span className="font-semibold text-lg" style={{ color: '#22211A' }}>{event.actual_uq_new}件</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span style={{ color: '#22211A' }}>セルアップ</span>
                <span className="font-semibold text-lg" style={{ color: '#22211A' }}>{event.actual_cellup || 0}件</span>
              </div>
            </div>

            {/* Progress Bar */}
            {event.target_hs_total > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#22211A' }}>目標達成進捗</span>
                  <span className="text-sm font-medium" style={{ color: '#22211A' }}>
                    {event.actual_hs_total} / {event.target_hs_total}
                  </span>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: '#22211A',
                      width: `${Math.min(Math.round((event.actual_hs_total / event.target_hs_total) * 100), 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Staff Performances */}
          {event.staff_performances && event.staff_performances.length > 0 && (
            <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center" style={{ color: '#22211A' }}>
                  <Users className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                  スタッフ実績
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStaffViewMode('summary')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      staffViewMode === 'summary'
                        ? 'text-white'
                        : 'border'
                    }`}
                    style={staffViewMode === 'summary'
                      ? { backgroundColor: '#22211A' }
                      : { borderColor: '#22211A', color: '#22211A', backgroundColor: 'transparent' }
                    }
                  >
                    スタッフ別集計
                  </button>
                  <button
                    onClick={() => setStaffViewMode('daily')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      staffViewMode === 'daily'
                        ? 'text-white'
                        : 'border'
                    }`}
                    style={staffViewMode === 'daily'
                      ? { backgroundColor: '#22211A' }
                      : { borderColor: '#22211A', color: '#22211A', backgroundColor: 'transparent' }
                    }
                  >
                    日毎詳細
                  </button>
                </div>
              </div>

              {staffViewMode === 'summary' ? (
                <div className="space-y-4">
                  {event.staff_performances.map((staff, index) => (
                    <div key={index} className="bg-background/50 rounded-lg border" style={{ borderColor: '#22211A' }}>
                      <button
                        onClick={() => toggleStaffExpansion(index)}
                        className="w-full p-4 flex items-center justify-between hover:bg-background/70 transition-colors rounded-lg"
                      >
                        <h3 className="font-semibold" style={{ color: '#22211A' }}>{staff.staff_name}</h3>
                        {expandedStaff.has(index) ? (
                          <ChevronDown className="w-5 h-5" style={{ color: '#22211A' }} />
                        ) : (
                          <ChevronRight className="w-5 h-5" style={{ color: '#22211A' }} />
                        )}
                      </button>

                      {expandedStaff.has(index) && (
                        <div className="px-4 pb-4 space-y-4">
                          {/* 新規実績 */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>新規実績</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span style={{ color: '#22211A' }}>au MNP: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.au_mnp || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>UQ MNP: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.uq_mnp || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>au 新規: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.au_new || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>UQ 新規: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.uq_new || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>セルアップ: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.cellup || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* LTV実績 */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>LTV実績</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span style={{ color: '#22211A' }}>クレジットカード: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.credit_card || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>ゴールドカード: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.gold_card || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>じぶん銀行: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.ji_bank_account || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>保証: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.warranty || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>OTT: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.ott || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>電気: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.electricity || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>ガス: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>{staff.gas || 0}</span>
                              </div>
                              <div>
                                <span style={{ color: '#22211A' }}>LTV合計: </span>
                                <span className="font-medium" style={{ color: '#22211A' }}>
                                  {(staff.credit_card || 0) + (staff.gold_card || 0) + (staff.ji_bank_account || 0) +
                                   (staff.warranty || 0) + (staff.ott || 0) + (staff.electricity || 0) + (staff.gas || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {event.staff_performances.map((staff, staffIndex) => {
                    const hasDailyData = staff.daily_performances && Array.isArray(staff.daily_performances) && staff.daily_performances.length > 0

                    if (!hasDailyData) {
                      return null
                    }

                    // 日付でソートされた日別データ
                    const sortedDailyPerformances = [...staff.daily_performances].sort((a, b) => {
                      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
                    })

                    return (
                      <div key={staffIndex} className="bg-background/50 rounded-lg border" style={{ borderColor: '#22211A' }}>
                        {/* スタッフ名 */}
                        <button
                          onClick={() => toggleDailyStaffExpansion(staffIndex)}
                          className="w-full p-4 flex items-center justify-between hover:bg-background/70 transition-colors rounded-lg"
                        >
                          <h3 className="font-semibold" style={{ color: '#22211A' }}>{staff.staff_name}</h3>
                          {expandedDailyStaff.has(staffIndex) ? (
                            <ChevronDown className="w-5 h-5" style={{ color: '#22211A' }} />
                          ) : (
                            <ChevronRight className="w-5 h-5" style={{ color: '#22211A' }} />
                          )}
                        </button>

                        {expandedDailyStaff.has(staffIndex) && (
                          <div className="px-4 pb-4 space-y-4">
                            {/* 合計実績 */}
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <h4 className="text-sm font-bold mb-3" style={{ color: '#22211A' }}>期間合計</h4>

                              {/* 新規実績合計 */}
                              <div className="mb-3">
                                <p className="text-xs font-semibold mb-2" style={{ color: '#22211A' }}>新規実績</p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>au MNP: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.au_mnp || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>UQ MNP: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.uq_mnp || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>au 新規: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.au_new || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>UQ 新規: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.uq_new || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>セルアップ: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.cellup || 0}</span>
                                  </div>
                                </div>
                              </div>

                              {/* LTV実績合計 */}
                              <div>
                                <p className="text-xs font-semibold mb-2" style={{ color: '#22211A' }}>LTV実績</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>クレカ: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.credit_card || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>金カード: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.gold_card || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>じぶん銀: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.ji_bank_account || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>保証: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.warranty || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>OTT: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.ott || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>電気: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.electricity || 0}</span>
                                  </div>
                                  <div className="bg-background/80 p-2 rounded">
                                    <span className="text-xs" style={{ color: '#22211A' }}>ガス: </span>
                                    <span className="font-medium" style={{ color: '#22211A' }}>{staff.gas || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 日毎詳細 */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-bold" style={{ color: '#22211A' }}>日毎詳細</h4>
                              {sortedDailyPerformances.map((daily, dayIndex) => {
                                const dayKey = `${staffIndex}-${dayIndex}`
                                const auMnp = (Number(daily.au_mnp_sp1) || 0) + (Number(daily.au_mnp_sp2) || 0) + (Number(daily.au_mnp_sim) || 0)
                                const uqMnp = (Number(daily.uq_mnp_sp1) || 0) + (Number(daily.uq_mnp_sp2) || 0) + (Number(daily.uq_mnp_sim) || 0)
                                const auNew = (Number(daily.au_hs_sp1) || 0) + (Number(daily.au_hs_sp2) || 0) + (Number(daily.au_hs_sim) || 0)
                                const uqNew = (Number(daily.uq_hs_sp1) || 0) + (Number(daily.uq_hs_sp2) || 0) + (Number(daily.uq_hs_sim) || 0)
                                const cellup = (Number(daily.cell_up_sp1) || 0) + (Number(daily.cell_up_sp2) || 0) + (Number(daily.cell_up_sim) || 0)

                                return (
                                  <div key={dayKey} className="border rounded-lg" style={{ borderColor: '#22211A' }}>
                                    <button
                                      onClick={() => toggleDailyDayExpansion(dayKey)}
                                      className="w-full p-3 flex items-center justify-between hover:bg-background/70 transition-colors rounded-lg"
                                    >
                                      <span className="text-sm font-medium" style={{ color: '#22211A' }}>
                                        {dayIndex + 1}日目 - {format(new Date(daily.event_date), 'M月d日（E）', { locale: ja })}
                                      </span>
                                      {expandedDailyDays.has(dayKey) ? (
                                        <ChevronDown className="w-4 h-4" style={{ color: '#22211A' }} />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" style={{ color: '#22211A' }} />
                                      )}
                                    </button>

                                    {expandedDailyDays.has(dayKey) && (
                                      <div className="px-3 pb-3 space-y-3">
                                        {/* 新規実績 */}
                                        <div>
                                          <p className="text-xs font-semibold mb-2" style={{ color: '#22211A' }}>新規実績</p>
                                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>au MNP: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{auMnp}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>UQ MNP: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{uqMnp}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>au 新規: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{auNew}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>UQ 新規: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{uqNew}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>セルアップ: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{cellup}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* LTV実績 */}
                                        <div>
                                          <p className="text-xs font-semibold mb-2" style={{ color: '#22211A' }}>LTV実績</p>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>クレカ: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{daily.credit_card || 0}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>金カード: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{daily.gold_card || 0}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>じぶん銀: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{daily.ji_bank_account || 0}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>保証: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{daily.warranty || 0}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>OTT: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{daily.ott || 0}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>電気: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{daily.electricity || 0}</span>
                                            </div>
                                            <div className="bg-background/80 p-2 rounded">
                                              <span className="text-xs" style={{ color: '#22211A' }}>ガス: </span>
                                              <span className="font-medium" style={{ color: '#22211A' }}>{daily.gas || 0}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Event Details Section */}
          <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#22211A' }}>イベント詳細</h2>
            <div className="space-y-6">
              {event.operation_details && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>運用詳細</h3>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="whitespace-pre-wrap" style={{ color: '#22211A' }}>{event.operation_details}</p>
                  </div>
                </div>
              )}

              {event.preparation_details && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>準備詳細</h3>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="whitespace-pre-wrap" style={{ color: '#22211A' }}>{event.preparation_details}</p>
                  </div>
                </div>
              )}

              {event.promotion_method && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>宣伝方法</h3>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="whitespace-pre-wrap" style={{ color: '#22211A' }}>{event.promotion_method}</p>
                  </div>
                </div>
              )}

              {event.success_case_1 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>成功事例 1</h3>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="whitespace-pre-wrap" style={{ color: '#22211A' }}>{event.success_case_1}</p>
                  </div>
                </div>
              )}

              {event.success_case_2 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>成功事例 2</h3>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="whitespace-pre-wrap" style={{ color: '#22211A' }}>{event.success_case_2}</p>
                  </div>
                </div>
              )}

              {event.challenges_and_solutions && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#22211A' }}>課題と解決策</h3>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <p className="whitespace-pre-wrap" style={{ color: '#22211A' }}>{event.challenges_and_solutions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Photos */}
        <div className="space-y-8">
          <div className="glass rounded-lg p-6 border" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: '#22211A' }}>
              <Camera className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              イベント写真 ({event.photos?.length || 0})
            </h2>
            
            {event.photos && event.photos.length > 0 ? (
              <div className="space-y-4">
                {event.photos.map((photo) => (
                  <div
                    key={`${photo.id}-${photo.file_url}`}
                    className="group cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="aspect-video bg-muted/30 rounded-lg overflow-hidden mb-2">
                      <img
                        key={photo.file_url}
                        src={photo.file_url}
                        alt={photo.description || 'イベント写真'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // エラー時に画像を再読み込み（よりアグレッシブなリロード）
                          const target = e.target as HTMLImageElement
                          const originalSrc = photo.file_url
                          target.src = ''
                          setTimeout(() => {
                            target.src = originalSrc + (originalSrc.includes('?') ? '&' : '?') + `retry=${Date.now()}`
                          }, 100)
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs" style={{ color: '#22211A' }}>
                        {format(new Date(photo.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.5 }} />
                <p style={{ color: '#22211A' }}>写真が登録されていません</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto bg-background rounded-2xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: '#22211A' }}>写真</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={selectedPhoto.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:opacity-80 transition-colors" style={{ backgroundColor: '#22211A20', color: '#22211A' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" style={{ color: '#22211A' }} />
                  </a>
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors" style={{ color: '#22211A' }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <img
                key={selectedPhoto.file_url}
                src={selectedPhoto.file_url}
                alt={selectedPhoto.description || 'イベント写真'}
                className="w-full h-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  // エラー時に画像を再読み込み（よりアグレッシブなリロード）
                  const target = e.target as HTMLImageElement
                  const originalSrc = selectedPhoto.file_url
                  target.src = ''
                  setTimeout(() => {
                    target.src = originalSrc + (originalSrc.includes('?') ? '&' : '?') + `retry=${Date.now()}`
                  }, 100)
                }}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}