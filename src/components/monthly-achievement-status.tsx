'use client'

import { useState, useEffect } from 'react'
import { Target, ChevronLeft, ChevronRight, Calendar, Search, GitCompare } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface MonthlyAchievementStatusProps {
  year?: number | 'all'
  month?: number | 'all'
  onCompare?: () => void
}

export function MonthlyAchievementStatus({ year, month, onCompare }: MonthlyAchievementStatusProps = {}) {
  // If year and month are provided and valid, use them; otherwise use current date
  const getInitialDate = () => {
    if (year && year !== 'all' && month && month !== 'all') {
      return new Date(year, month - 1)
    }
    return new Date()
  }

  const [selectedDate, setSelectedDate] = useState(getInitialDate())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempYear, setTempYear] = useState(selectedDate.getFullYear())
  const [tempMonth, setTempMonth] = useState(selectedDate.getMonth() + 1)
  const [isControlledByProps, setIsControlledByProps] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState({
    totalEvents: 0,
    achievedEvents: 0,
    achievementRate: 0,
    totalTarget: 0,
    totalActual: 0,
    totalMnp: 0,
    totalNew: 0,
    mnpRatio: 0,
    totalTargetIds: 0,
    totalActualIds: 0
  })

  // 色パレット定義（ダッシュボードと統一）
  const COLORS = [
    '#4abf79', '#7cd08e', '#a6e09e',
    '#ffd942', '#ffe680', '#ffedb3', '#fff5e0',
    '#3dae6c', '#FFB300', '#DCEDC8', '#9E9E9E', '#FAFAFA', '#FFFBF3', '#858680', '#97724A',
    '#ffbb00', '#f8d549', '#f4e3a4', '#b7e59e',
    '#795939', '#a58a69', '#d5cec3', '#e8e2ce', '#b4a89d', '#2c9b5e'
  ]

  // 月を変更する関数
  const changeMonth = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  // 日付選択を適用する関数
  const applyDateSelection = () => {
    const newDate = new Date(tempYear, tempMonth - 1)
    setSelectedDate(newDate)
    setShowDatePicker(false)
  }

  // 日付選択をキャンセルする関数
  const cancelDateSelection = () => {
    setTempYear(selectedDate.getFullYear())
    setTempMonth(selectedDate.getMonth() + 1)
    setShowDatePicker(false)
  }

  // Update selectedDate when props change
  useEffect(() => {
    if (year && year !== 'all' && month && month !== 'all') {
      setSelectedDate(new Date(year, month - 1))
      setTempYear(year)
      setTempMonth(month)
      setIsControlledByProps(true)
    } else {
      setIsControlledByProps(false)
    }
  }, [year, month])

  useEffect(() => {
    const fetchMonthlyStats = async () => {
      try {
        const response = await fetch('/api/performances/enhanced-v2')
        if (response.ok) {
          const data = await response.json()
          const currentMonth = selectedDate.getMonth() + 1
          const currentYear = selectedDate.getFullYear()

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
            mnpRatio,
            totalTargetIds: 0,
            totalActualIds: 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch monthly stats:', error)
      }
    }

    fetchMonthlyStats()
  }, [selectedDate.getMonth(), selectedDate.getFullYear()])

  return (
    <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="flex items-center mb-2 sm:mb-0">
          <Target className="w-6 h-6 mr-3" style={{ color: '#22211A' }} />
          <h2 className="text-2xl font-bold flex items-center" style={{ color: '#22211A' }}>
            {!isControlledByProps ? (
              <>
                <button
                  onClick={() => changeMonth('prev')}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                  aria-label="前月"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                >
                  {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
                  <Calendar className="w-4 h-4 ml-1" />
                </button>
                <span className="mx-2">の達成状況</span>
                <button
                  onClick={() => changeMonth('next')}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors ml-2"
                  aria-label="次月"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            ) : (
              <span>
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月の達成状況
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#FFB300' }}>
            <span className="text-sm font-medium">総イベント数: {monthlyStats.totalEvents}件</span>
          </div>
          {onCompare && (
            <button
              onClick={onCompare}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
              style={{ backgroundColor: '#F1AD26', color: '#FFFFFF', borderColor: '#F1AD26' }}
            >
              <GitCompare className="w-4 h-4 mr-1" />
              比較
            </button>
          )}
        </div>
      </div>

      {/* 日付選択モーダル */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDatePicker(false)}>
          <div
            className="bg-white rounded-xl p-6 shadow-xl"
            style={{ minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#22211A' }}>
              <Calendar className="w-5 h-5 mr-2" />
              年月を選択
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>年</label>
                <select
                  value={tempYear}
                  onChange={(e) => setTempYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: '#22211A' }}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>月</label>
                <select
                  value={tempMonth}
                  onChange={(e) => setTempMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: '#22211A' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={cancelDateSelection}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#22211A', color: '#22211A' }}
              >
                キャンセル
              </button>
              <button
                onClick={applyDateSelection}
                className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity flex items-center"
                style={{ backgroundColor: '#FFB300' }}
              >
                <Search className="w-4 h-4 mr-1" />
                検索
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#22211A20' }}>
          <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: '#22211A' }}>イベント達成状況</h3>
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
  )
}