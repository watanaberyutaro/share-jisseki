'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, Target, StickyNote, Save, Edit3, Trophy, Award, Medal, BarChart, User } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart as RechartsBarChart, Bar } from 'recharts'
import { MagneticDots } from '@/components/MagneticDots'

export default function Dashboard() {
  const [currentTime] = useState(new Date())

  useEffect(() => {
    // 分析ページ専用のスタイルを動的に追加
    const style = document.createElement('style')
    style.id = 'dashboard-custom-styles'
    style.textContent = `
      @media (max-width: 768px) {
        .dashboard-page {
          font-size: 0.8rem !important;
        }
        .dashboard-page > div {
          padding-left: 0.75rem !important;
          padding-right: 0.75rem !important;
        }
        .dashboard-page h1 {
          font-size: 1.6rem !important;
        }
        .dashboard-page h2 {
          font-size: 1.28rem !important;
        }
        .dashboard-page h3 {
          font-size: 1.12rem !important;
        }
        .dashboard-page .text-xs {
          font-size: 0.6rem !important;
        }
        .dashboard-page .text-sm {
          font-size: 0.7rem !important;
        }
        .dashboard-page .text-base {
          font-size: 0.8rem !important;
        }
        .dashboard-page .text-lg {
          font-size: 0.9rem !important;
        }
        .dashboard-page .text-xl {
          font-size: 1rem !important;
        }
        .dashboard-page .text-2xl {
          font-size: 1.2rem !important;
        }
        .dashboard-page .text-3xl {
          font-size: 1.5rem !important;
        }
        .dashboard-page .dashboard-title {
          font-size: 0.65rem !important;
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
  const [monthlyStats, setMonthlyStats] = useState({
    totalEvents: 0,
    achievedEvents: 0,
    achievementRate: 0,
    totalTarget: 0,
    totalActual: 0,
    totalMnp: 0,
    totalNew: 0,
    mnpRatio: 0
  })
  const [yearlyData, setYearlyData] = useState<any[]>([])
  const [eventRanking, setEventRanking] = useState<any[]>([])
  const [weeklyIdData, setWeeklyIdData] = useState<any[]>([])
  const [memo, setMemo] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savedMemo, setSavedMemo] = useState('')
  const [isLoading, setIsLoading] = useState(true)

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


  useEffect(() => {
    const fetchMonthlyStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/performances/enhanced-v2')
        if (response.ok) {
          const data = await response.json()
          const currentMonth = currentTime.getMonth() + 1
          const currentYear = currentTime.getFullYear()

          const currentMonthEvents = data.filter((event: any) =>
            event.month === currentMonth && event.year === currentYear
          )

          const eventsWithTargets = currentMonthEvents.filter((event: any) => event.target_hs_total > 0)
          const achievedEvents = eventsWithTargets.filter((event: any) =>
            event.actual_hs_total >= event.target_hs_total
          )

          const totalTarget = eventsWithTargets.reduce((sum: number, event: any) => sum + event.target_hs_total, 0)
          const totalActual = eventsWithTargets.reduce((sum: number, event: any) => sum + event.actual_hs_total, 0)
          const totalMnp = currentMonthEvents.reduce((sum: number, event: any) => sum + (event.actual_au_mnp || 0) + (event.actual_uq_mnp || 0), 0)
          const totalNew = currentMonthEvents.reduce((sum: number, event: any) => sum + (event.actual_au_new || 0) + (event.actual_uq_new || 0), 0)
          const totalHs = totalMnp + totalNew
          const mnpRatio = totalHs > 0 ? Math.round((totalMnp / totalHs) * 100) : 0

          setMonthlyStats({
            totalEvents: eventsWithTargets.length,
            achievedEvents: achievedEvents.length,
            achievementRate: eventsWithTargets.length > 0 ? Math.round((achievedEvents.length / eventsWithTargets.length) * 100) : 0,
            totalTarget,
            totalActual,
            totalMnp,
            totalNew,
            mnpRatio
          })

          // 年ごとの月次データを計算
          const yearlyMonthlyData: any = {}
          data.forEach((event: any) => {
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

          // 達成率を計算してソート
          const processedData = Object.values(yearlyMonthlyData).map((data: any) => ({
            ...data,
            achievementRate: data.totalEvents > 0 ? Math.round((data.achievedEvents / data.totalEvents) * 100) : 0,
            monthLabel: `${data.year}年${data.month}月`
          })).sort((a: any, b: any) => {
            if (a.year !== b.year) return a.year - b.year
            return a.month - b.month
          })

          setYearlyData(processedData)

          // イベント別HS総販ランキングを計算（当月のみ）
          const eventRankingData = currentMonthEvents.map((event: any) => {
            return {
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
            }
          })
          .filter((event: any) => event.totalIds > 0)
          .sort((a: any, b: any) => b.totalIds - a.totalIds)
          .slice(0, 5) // トップ5まで表示

          setEventRanking(eventRankingData)

          // 当月の週毎HS総販データを計算
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

          const weeklyArray = Object.values(weeklyData).sort((a: any, b: any) => a.weekNumber - b.weekNumber)
          setWeeklyIdData(weeklyArray)
        }
      } catch (error) {
        console.error('Failed to fetch monthly stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMonthlyStats()
  }, [currentTime.getMonth(), currentTime.getFullYear()])

  // 色パレット定義（分析ページと統一・メモ化）
  const COLORS = useMemo(() => [
    '#4abf79', '#7cd08e', '#a6e09e',
    '#ffd942', '#ffe680', '#ffedb3', '#fff5e0',
    '#3dae6c', '#FFB300', '#DCEDC8', '#9E9E9E', '#FAFAFA', '#FFFBF3', '#858680', '#97724A',
    '#ffbb00', '#f8d549', '#f4e3a4', '#b7e59e',
    '#795939', '#a58a69', '#d5cec3', '#e8e2ce', '#b4a89d', '#2c9b5e'
  ], [])

  return (
    <div className="min-h-screen relative dashboard-mobile dashboard-page" style={{ paddingTop: '5rem' }}>
      {/* 磁石効果のあるドット背景（データ読み込み後に表示） */}
      {!isLoading && <MagneticDots />}

      {/* Monthly Achievement Stats and Memo Panel */}
      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-2 md:py-6 pb-20 md:pb-6">
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
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
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
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
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

        {/* 当月の週毎ID数グラフと月次イベント達成率推移のグリッド */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* 当月の週毎ID数グラフ */}
          <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center mb-6">
              <BarChart className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
              <h2 className="text-lg font-bold" style={{ color: '#22211A' }}>
                {currentTime.getFullYear()}年{currentTime.getMonth() + 1}月 週毎ID獲得数
              </h2>
            </div>

            {weeklyIdData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
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
                      formatter={(value: any, name: string) => [value.toLocaleString(), name === 'mnp' ? 'MNP' : name === 'new' ? '新規' : '合計ID数']}
                      labelFormatter={(label) => `${label}`}
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
                    <Bar
                      dataKey="mnp"
                      stackId="a"
                      fill={COLORS[0]}
                      name="MNP"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                    <Bar
                      dataKey="new"
                      stackId="a"
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
                <span style={{ color: '#22211A' }}>総ID数: {weeklyIdData.reduce((sum, week) => sum + week.totalIds, 0).toLocaleString()}</span>
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

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
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
                    formatter={(value: any, name: string) => [`${value}%`, '達成率']}
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
              当月ID総合獲得ランキング（TOP5）
            </h2>
          </div>

          {eventRanking.length > 0 ? (
            <div className="space-y-2">
              {eventRanking.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/view/${event.id}`}
                  className="block transition-all duration-200 hover:scale-[1.01]"
                >
                  <div
                    className="flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:border-[#FFB300] cursor-pointer"
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
                        M:{event.auMnp + event.uqMnp} N:{event.auNew + event.uqNew}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
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
                スタッフ当月ID獲得ランキング（TOP5）
              </h2>
            </div>

            {/* TODO: スタッフランキングデータの実装 */}
            <div className="text-center py-8" style={{ color: '#22211A', opacity: 0.6 }}>
              <User className="w-8 h-8 mx-auto mb-2" style={{ color: '#22211A', opacity: 0.4 }} />
              <p className="text-sm">スタッフランキング機能は準備中です</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}