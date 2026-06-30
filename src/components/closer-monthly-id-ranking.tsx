'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, Filter as FilterIcon } from 'lucide-react'
import { LoadingAnimation } from '@/components/loading-animation'
import {
  StaffFilterConfig,
  DEFAULT_STAFF_FILTER,
  shouldIncludeStaff,
  getStaffCategory
} from '@/lib/staff-filter'
import { getSharedList } from '@/lib/supabase/shared-lists'

interface CloserIdScore {
  staffName: string
  totalIdScore: number
  eventCount: number
  mnpCount: number
  newCount: number
  effectiveCount: number
  avgIdScore: number
}

interface CloserMonthlyIdRankingProps {
  availableYears: number[]
}

export function CloserMonthlyIdRanking({ availableYears }: CloserMonthlyIdRankingProps) {
  const [closerScores, setCloserScores] = useState<CloserIdScore[]>([])
  const [loading, setLoading] = useState(true)
  const [allStaffNames, setAllStaffNames] = useState<string[]>([])
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [agencyTierFilter, setAgencyTierFilter] = useState<'all' | '一次' | '二次'>('all')
  const [staffFilter, setStaffFilter] = useState<StaffFilterConfig>(DEFAULT_STAFF_FILTER)
  const [staffNameFilter, setStaffNameFilter] = useState<string>('all')

  useEffect(() => {
    getSharedList('staff_names').then(names => setAllStaffNames(names))
  }, [])

  useEffect(() => {
    fetchCloserScores()
  }, [yearFilter, monthFilter, agencyTierFilter])

  const fetchCloserScores = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (yearFilter !== 'all') params.set('year', String(yearFilter))
      if (monthFilter !== 'all') params.set('month', String(monthFilter))
      if (agencyTierFilter !== 'all') params.set('agencyTier', agencyTierFilter)

      const response = await fetch(`/api/closer-monthly-id-scores?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCloserScores(data)
      }
    } catch (error) {
      console.error('Failed to fetch closer scores:', error)
      setCloserScores([])
    } finally {
      setLoading(false)
    }
  }


  // スタッフ区分とスタッフ名でフィルタリング
  const filteredCloserScores = useMemo(() => {
    let filtered = closerScores

    // スタッフ区分フィルター（スタッフ名から自社/他社/店舗を判定）
    filtered = filtered.filter(closer => shouldIncludeStaff(closer.staffName, staffFilter))

    // スタッフ名フィルター
    if (staffNameFilter !== 'all') {
      filtered = filtered.filter(closer => closer.staffName === staffNameFilter)
    }

    return filtered
  }, [closerScores, staffFilter, staffNameFilter])


  if (loading) {
    return <LoadingAnimation />
  }

  return (
    <div className="glass rounded-lg border p-4 md:p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
      {/* ヘッダー */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center mb-2">
          <Users className="w-6 h-6 mr-3" style={{ color: '#FFB300' }} />
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: '#22211A' }}>
            クローザー別月次ID係数
          </h2>
        </div>
        <p className="text-sm md:text-base" style={{ color: '#22211A', opacity: 0.7 }}>
          2026年6月2日以降のイベントにおけるHS新規ID計算による係数合計
        </p>
      </div>

      {/* フィルター */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center mb-3">
          <FilterIcon className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
          <span className="text-sm md:text-base font-semibold" style={{ color: '#22211A' }}>絞り込み</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* 年フィルター */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            style={{ border: '1px solid #22211A', color: '#22211A' }}
          >
            <option value="all">全年</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>

          {/* 月フィルター */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            style={{ border: '1px solid #22211A', color: '#22211A' }}
          >
            <option value="all">全月</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>{i + 1}月</option>
            ))}
          </select>

          {/* 商流フィルター（一次/二次） */}
          <select
            value={agencyTierFilter}
            onChange={(e) => setAgencyTierFilter(e.target.value as typeof agencyTierFilter)}
            className="px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            style={{ border: '1px solid #22211A', color: '#22211A' }}
          >
            <option value="all">全商流</option>
            <option value="一次">一次</option>
            <option value="二次">二次</option>
          </select>

          {/* スタッフ区分フィルター（自社/他社/店舗） */}
          <select
            value={
              staffFilter.includeInternal && staffFilter.includeExternal && staffFilter.includeStore
                ? 'all'
                : staffFilter.includeInternal
                ? 'internal'
                : staffFilter.includeExternal
                ? 'external'
                : 'store'
            }
            onChange={(e) => {
              const value = e.target.value
              if (value === 'all') {
                setStaffFilter({ includeInternal: true, includeExternal: true, includeStore: true })
              } else if (value === 'internal') {
                setStaffFilter({ includeInternal: true, includeExternal: false, includeStore: false })
              } else if (value === 'external') {
                setStaffFilter({ includeInternal: false, includeExternal: true, includeStore: false })
              } else {
                setStaffFilter({ includeInternal: false, includeExternal: false, includeStore: true })
              }
            }}
            className="px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            style={{ border: '1px solid #22211A', color: '#22211A' }}
          >
            <option value="all">全区分</option>
            <option value="internal">自社のみ</option>
            <option value="external">他社のみ</option>
            <option value="store">店舗のみ</option>
          </select>

          {/* スタッフ名フィルター */}
          <select
            value={staffNameFilter}
            onChange={(e) => setStaffNameFilter(e.target.value)}
            className="px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm col-span-2 md:col-span-1"
            style={{ border: '1px solid #22211A', color: '#22211A' }}
          >
            <option value="all">全スタッフ</option>
            {allStaffNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* テーブル */}
      {filteredCloserScores.length > 0 ? (
        <div className="border-t border-border pt-4 md:pt-6"
          style={{ borderColor: '#22211A' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#22211A' }}>クローザー名</th>
                  <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#22211A' }}>区分</th>
                  <th className="px-4 py-3 text-right text-xs md:text-sm font-semibold" style={{ color: '#22211A' }}>ID係数合計</th>
                  <th className="px-4 py-3 text-right text-xs md:text-sm font-semibold" style={{ color: '#22211A' }}>イベント数</th>
                  <th className="px-4 py-3 text-right text-xs md:text-sm font-semibold" style={{ color: '#22211A' }}>平均ID係数</th>
                  <th className="px-4 py-3 text-right text-xs md:text-sm font-semibold" style={{ color: '#22211A' }}>MNP件数</th>
                  <th className="px-4 py-3 text-right text-xs md:text-sm font-semibold" style={{ color: '#22211A' }}>新規件数</th>
                </tr>
              </thead>
              <tbody>
                {filteredCloserScores.map((closer, index) => (
                  <tr
                    key={closer.staffName}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm md:text-base font-semibold" style={{ color: '#22211A' }}>
                      {closer.staffName}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const cat = getStaffCategory(closer.staffName)
                        const label = cat === 'internal' ? '自社' : cat === 'external' ? '他社' : '店舗'
                        const bg = cat === 'internal' ? 'rgba(74, 191, 121, 0.2)' : cat === 'external' ? 'rgba(255, 179, 0, 0.2)' : 'rgba(100, 149, 237, 0.2)'
                        const color = cat === 'internal' ? '#4abf79' : cat === 'external' ? '#FFB300' : '#6495ED'
                        return (
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: bg, color }}>
                            {label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base md:text-lg font-bold" style={{ color: '#FFB300' }}>
                        {closer.totalIdScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm md:text-base" style={{ color: '#22211A' }}>
                      {closer.eventCount}
                    </td>
                    <td className="px-4 py-3 text-right text-sm md:text-base font-semibold" style={{ color: '#22211A' }}>
                      {closer.avgIdScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm md:text-base" style={{ color: '#22211A' }}>
                      {closer.mnpCount}
                    </td>
                    <td className="px-4 py-3 text-right text-sm md:text-base" style={{ color: '#22211A' }}>
                      {closer.newCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* サマリー */}
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border" style={{ borderColor: '#22211A' }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-xs md:text-sm mb-1" style={{ color: '#22211A', opacity: 0.7 }}>総クローザー数</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#22211A' }}>
                {filteredCloserScores.length}人
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm mb-1" style={{ color: '#22211A', opacity: 0.7 }}>総ID係数</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#FFB300' }}>
                {filteredCloserScores.reduce((sum, c) => sum + c.totalIdScore, 0).toFixed(1)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm mb-1" style={{ color: '#22211A', opacity: 0.7 }}>総MNP件数</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#4abf79' }}>
                {filteredCloserScores.reduce((sum, c) => sum + c.mnpCount, 0)}件
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm mb-1" style={{ color: '#22211A', opacity: 0.7 }}>総新規件数</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#4abf79' }}>
                {filteredCloserScores.reduce((sum, c) => sum + c.newCount, 0)}件
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm mb-1" style={{ color: '#22211A', opacity: 0.7 }}>平均ID係数</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#22211A' }}>
                {(filteredCloserScores.reduce((sum, c) => sum + c.totalIdScore, 0) / filteredCloserScores.length).toFixed(1)}
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-border pt-12 text-center" style={{ borderColor: '#22211A' }}>
          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.3 }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#22211A' }}>
            データがありません
          </h3>
          <p className="text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
            選択した条件に該当するデータが見つかりませんでした
          </p>
        </div>
      )}
    </div>
  )
}
