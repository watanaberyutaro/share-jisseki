'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, Award, Calculator, Filter as FilterIcon } from 'lucide-react'
import { calculateMnpIdScore } from '@/lib/mnp-id-calculator'
import {
  StaffFilterConfig,
  DEFAULT_STAFF_FILTER,
  filterStaffPerformances,
  getFilterDisplayName
} from '@/lib/staff-filter'

interface StaffPerformance {
  staff_name: string
  au_mnp: number
  uq_mnp: number
  daily_performances?: DailyPerformance[]
}

interface DailyPerformance {
  id: string
  mnp_id_contracts?: any[]
}

interface IdScoreSummaryProps {
  staffPerformances: StaffPerformance[]
  eventStartDate: string
  eventEndDate: string
}

export function IdScoreSummary({
  staffPerformances,
  eventStartDate,
  eventEndDate
}: IdScoreSummaryProps) {
  // 2026-06-02以降のイベントかチェック
  const isIdCalculationEnabled = new Date(eventStartDate) >= new Date('2026-06-02')

  // スタッフ区分フィルター
  const [staffFilter, setStaffFilter] = useState<StaffFilterConfig>(DEFAULT_STAFF_FILTER)

  // フィルタリングされたスタッフパフォーマンス
  const filteredStaffPerformances = useMemo(() => {
    return filterStaffPerformances(staffPerformances, staffFilter)
  }, [staffPerformances, staffFilter])

  // クローザー別ID点数を計算
  const staffIdScores = useMemo(() => {
    if (!isIdCalculationEnabled) return []

    return filteredStaffPerformances.map(staff => {
      let auMnpCount = 0
      let uqMnpCount = 0
      let totalIdScore = 0
      let totalExcludedCount = 0
      let totalCount = 0

      // 日別実績からMNP ID契約を集計
      staff.daily_performances?.forEach(daily => {
        if (daily.mnp_id_contracts && daily.mnp_id_contracts.length > 0) {
          console.log(`[IdScoreSummary] スタッフ「${staff.staff_name}」の契約データ:`, daily.mnp_id_contracts)
        }
        daily.mnp_id_contracts?.forEach((contract: any) => {
          console.log('[IdScoreSummary] 契約データの構造:', contract)
          // contractはすでにフォーム形式（キャメルケース）なので、そのまま使用
          const { totalIdScore: score } = calculateMnpIdScore(contract)

          totalIdScore += score
          totalCount += contract.count
          totalExcludedCount += contract.excludedCount

          if (contract.carrier === 'au') {
            auMnpCount += contract.count
          } else {
            uqMnpCount += contract.count
          }
        })
      })

      const effectiveCount = totalCount - totalExcludedCount
      const avgIdScore = effectiveCount > 0 ? totalIdScore / effectiveCount : 0

      return {
        staffName: staff.staff_name,
        auMnpCount,
        uqMnpCount,
        totalMnpCount: auMnpCount + uqMnpCount,
        excludedCount: totalExcludedCount,
        effectiveCount,
        totalIdScore,
        avgIdScore
      }
    }).filter(staff => staff.totalIdScore > 0) // ID点数がある人のみ
  }, [filteredStaffPerformances, isIdCalculationEnabled])

  // イベント全体のサマリーを計算
  const eventSummary = useMemo(() => {
    const totalMnpCount = staffIdScores.reduce((sum, s) => sum + s.totalMnpCount, 0)
    const totalExcludedCount = staffIdScores.reduce((sum, s) => sum + s.excludedCount, 0)
    const totalEffectiveCount = staffIdScores.reduce((sum, s) => sum + s.effectiveCount, 0)
    const totalIdScore = staffIdScores.reduce((sum, s) => sum + s.totalIdScore, 0)
    const eventDays = Math.ceil((new Date(eventEndDate).getTime() - new Date(eventStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    const dailyAvgIdScore = eventDays > 0 ? totalIdScore / eventDays : 0

    return {
      totalMnpCount,
      totalExcludedCount,
      totalEffectiveCount,
      totalIdScore,
      eventDays,
      dailyAvgIdScore
    }
  }, [staffIdScores, eventStartDate, eventEndDate])

  if (!isIdCalculationEnabled) {
    return null
  }

  return (
    <div className="glass rounded-lg border p-6"
      style={{
        borderColor: '#22211A',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)'
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5" style={{ color: '#4abf79' }} />
        <h3 className="text-lg font-bold" style={{ color: '#22211A' }}>
          MNP新規ID点数サマリー
        </h3>
      </div>

      {/* スタッフ区分フィルター */}
      <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: '#22211A20', backgroundColor: '#fafafa' }}>
        <div className="flex items-center gap-2 mb-2">
          <FilterIcon className="w-4 h-4" style={{ color: '#4abf79' }} />
          <span className="text-sm font-bold" style={{ color: '#22211A' }}>区分: {getFilterDisplayName(staffFilter)}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStaffFilter({ includeInternal: true, includeExternal: true, includeStore: true })}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore
                ? 'text-white'
                : ''
            }`}
            style={{
              borderColor: staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore ? '#4abf79' : '#22211A40',
              backgroundColor: staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore ? '#4abf79' : 'transparent',
              color: staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore ? '#FFFFFF' : '#22211A'
            }}
          >
            全体
          </button>
          <button
            onClick={() => setStaffFilter({ includeInternal: true, includeExternal: false, includeStore: false })}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              staffFilter.includeInternal && !staffFilter.includeExternal && !staffFilter.includeStore
                ? 'text-white'
                : ''
            }`}
            style={{
              borderColor: staffFilter.includeInternal && !staffFilter.includeExternal && !staffFilter.includeStore ? '#4abf79' : '#22211A40',
              backgroundColor: staffFilter.includeInternal && !staffFilter.includeExternal && !staffFilter.includeStore ? '#4abf79' : 'transparent',
              color: staffFilter.includeInternal && !staffFilter.includeExternal && !staffFilter.includeStore ? '#FFFFFF' : '#22211A'
            }}
          >
            自社のみ
          </button>
          <button
            onClick={() => setStaffFilter({ includeInternal: false, includeExternal: true, includeStore: false })}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              !staffFilter.includeInternal && staffFilter.includeExternal && !staffFilter.includeStore
                ? 'text-white'
                : ''
            }`}
            style={{
              borderColor: !staffFilter.includeInternal && staffFilter.includeExternal && !staffFilter.includeStore ? '#4abf79' : '#22211A40',
              backgroundColor: !staffFilter.includeInternal && staffFilter.includeExternal && !staffFilter.includeStore ? '#4abf79' : 'transparent',
              color: !staffFilter.includeInternal && !staffFilter.includeExternal && !staffFilter.includeStore ? '#FFFFFF' : '#22211A'
            }}
          >
            他社のみ
          </button>
          <button
            onClick={() => setStaffFilter({ includeInternal: false, includeExternal: false, includeStore: true })}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              !staffFilter.includeInternal && !staffFilter.includeExternal && staffFilter.includeStore
                ? 'text-white'
                : ''
            }`}
            style={{
              borderColor: !staffFilter.includeInternal && !staffFilter.includeExternal && staffFilter.includeStore ? '#4abf79' : '#22211A40',
              backgroundColor: !staffFilter.includeInternal && !staffFilter.includeExternal && staffFilter.includeStore ? '#4abf79' : 'transparent',
              color: !staffFilter.includeInternal && !staffFilter.includeExternal && staffFilter.includeStore ? '#FFFFFF' : '#22211A'
            }}
          >
            店舗のみ
          </button>
        </div>
      </div>

      {staffIdScores.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-sm opacity-60" style={{ color: '#22211A' }}>
            選択された区分のMNP ID契約データがありません
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 237, 200, 0.5)' }}>
            <div className="text-sm opacity-70" style={{ color: '#22211A' }}>合計ID点数</div>
            <div className="text-2xl font-bold mt-1" style={{ color: '#4abf79' }}>
              {eventSummary.totalIdScore.toFixed(1)}点
            </div>
          </div>

          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 237, 200, 0.5)' }}>
            <div className="text-sm opacity-70" style={{ color: '#22211A' }}>日平均ID点数</div>
            <div className="text-2xl font-bold mt-1" style={{ color: '#FFB300' }}>
              {eventSummary.dailyAvgIdScore.toFixed(1)}点
            </div>
          </div>

          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 237, 200, 0.5)' }}>
            <div className="text-sm opacity-70" style={{ color: '#22211A' }}>合計件数</div>
            <div className="text-2xl font-bold mt-1" style={{ color: '#22211A' }}>
              {eventSummary.totalEffectiveCount}件
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
