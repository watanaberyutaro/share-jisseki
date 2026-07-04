'use client'

import { useState, useEffect, useMemo } from 'react'
import { Download, Filter as FilterIcon, ChevronDown, ChevronUp, ChevronsUpDown, X } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'
import { LoadingAnimation } from '@/components/loading-animation'
import { getStaffCategory } from '@/lib/staff-filter'

interface StaffRow {
  year: number
  month: number
  week_number: number
  start_date: string
  end_date: string
  venue: string
  agency_name: string
  agency_tier: string
  staff_name: string
  id_score: number
  au_mnp_sp1: number; au_mnp_sp2: number; au_mnp_sim: number
  uq_mnp_sp1: number; uq_mnp_sp2: number; uq_mnp_sim: number
  au_hs_sp1: number; au_hs_sp2: number; au_hs_sim: number
  uq_hs_sp1: number; uq_hs_sp2: number; uq_hs_sim: number
  cell_up_sp1: number; cell_up_sp2: number; cell_up_sim: number
  credit_card: number; gold_card: number; ji_bank_account: number
  warranty: number; ott: number; electricity: number; gas: number; network_count: number
}

const CSV_HEADERS = [
  '年', '月', '週', '開始日', '終了日', '会場', '代理店名', '商流',
  'スタッフ名', '区分',
  'ID点数',
  'au MNP SP1', 'au MNP SP2', 'au MNP SIM', 'au MNP合計',
  'UQ MNP SP1', 'UQ MNP SP2', 'UQ MNP SIM', 'UQ MNP合計',
  'MNP合計',
  'au 新規 SP1', 'au 新規 SP2', 'au 新規 SIM', 'au 新規合計',
  'UQ 新規 SP1', 'UQ 新規 SP2', 'UQ 新規 SIM', 'UQ 新規合計',
  '新規合計',
  'セルアップ SP1', 'セルアップ SP2', 'セルアップ SIM', 'セルアップ合計',
  'クレカ', 'ゴールドカード', 'JI銀行口座', '保証', 'OTT', '電気', 'ガス', 'ネットワーク',
]

function rowToCsvValues(r: StaffRow): (string | number)[] {
  const cat = getStaffCategory(r.staff_name)
  const catLabel = cat === 'internal' ? '自社' : cat === 'external' ? '他社' : '店舗'
  const auMnp = r.au_mnp_sp1 + r.au_mnp_sp2 + r.au_mnp_sim
  const uqMnp = r.uq_mnp_sp1 + r.uq_mnp_sp2 + r.uq_mnp_sim
  const auHs = r.au_hs_sp1 + r.au_hs_sp2 + r.au_hs_sim
  const uqHs = r.uq_hs_sp1 + r.uq_hs_sp2 + r.uq_hs_sim
  const cellup = r.cell_up_sp1 + r.cell_up_sp2 + r.cell_up_sim
  return [
    r.year, r.month, r.week_number ?? '', r.start_date, r.end_date ?? '',
    r.venue, r.agency_name, r.agency_tier ?? '',
    r.staff_name, catLabel,
    r.id_score ?? 0,
    r.au_mnp_sp1, r.au_mnp_sp2, r.au_mnp_sim, auMnp,
    r.uq_mnp_sp1, r.uq_mnp_sp2, r.uq_mnp_sim, uqMnp,
    auMnp + uqMnp,
    r.au_hs_sp1, r.au_hs_sp2, r.au_hs_sim, auHs,
    r.uq_hs_sp1, r.uq_hs_sp2, r.uq_hs_sim, uqHs,
    auHs + uqHs + cellup,
    r.cell_up_sp1, r.cell_up_sp2, r.cell_up_sim, cellup,
    r.credit_card, r.gold_card, r.ji_bank_account,
    r.warranty, r.ott, r.electricity, r.gas, r.network_count,
  ]
}

export default function ExportPage() {
  const [allData, setAllData] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'internal' | 'external' | 'store'>('all')
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false)
  const [sortKey, setSortKey] = useState<'staff_name' | 'week_number' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetch('/api/staff-export', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setAllData(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const availableYears = useMemo(() =>
    [...new Set(allData.map(r => Number(r.year)).filter(Boolean))].sort((a, b) => b - a), [allData])

  const matchYear = (r: StaffRow) => yearFilter === 'all' || Number(r.year) === yearFilter
  const matchMonth = (r: StaffRow) => monthFilter === 'all' || Number(r.month) === monthFilter
  const matchWeek = (r: StaffRow) => weekFilter === 'all' || Number(r.week_number) === weekFilter
  const matchCategory = (r: StaffRow) => categoryFilter === 'all' || getStaffCategory(r.staff_name) === categoryFilter

  const availableMonths = useMemo(() => {
    const src = allData.filter(matchYear)
    return [...new Set(src.map(r => Number(r.month)).filter(Boolean))].sort((a, b) => a - b)
  }, [allData, yearFilter])

  const availableWeeks = useMemo(() => {
    const src = allData.filter(r => matchYear(r) && matchMonth(r))
    return [...new Set(src.map(r => Number(r.week_number)).filter(Boolean))].sort((a, b) => a - b)
  }, [allData, yearFilter, monthFilter])

  const availableStaffNames = useMemo(() => {
    const src = allData.filter(r => matchYear(r) && matchMonth(r) && matchWeek(r) && matchCategory(r))
    return [...new Set(src.map(r => r.staff_name))].sort()
  }, [allData, yearFilter, monthFilter, weekFilter, categoryFilter])

  const filtered = useMemo(() => allData.filter(r => {
    if (!matchYear(r)) return false
    if (!matchMonth(r)) return false
    if (!matchWeek(r)) return false
    if (!matchCategory(r)) return false
    if (selectedStaff.length > 0 && !selectedStaff.includes(r.staff_name)) return false
    return true
  }), [allData, yearFilter, monthFilter, weekFilter, categoryFilter, selectedStaff])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = sortKey === 'staff_name' ? (a.staff_name ?? '') : (a.week_number ?? 0)
      const bv = sortKey === 'staff_name' ? (b.staff_name ?? '') : (b.week_number ?? 0)
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const handleSort = (key: 'staff_name' | 'week_number') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // フィルター変更でスタッフ選択リセット
  const handleYearChange = (v: number | 'all') => { setYearFilter(v); setMonthFilter('all'); setWeekFilter('all'); setSelectedStaff([]) }
  const handleMonthChange = (v: number | 'all') => { setMonthFilter(v); setWeekFilter('all'); setSelectedStaff([]) }
  const handleWeekChange = (v: number | 'all') => { setWeekFilter(v); setSelectedStaff([]) }
  const handleCategoryChange = (v: typeof categoryFilter) => { setCategoryFilter(v); setSelectedStaff([]) }

  const toggleStaff = (name: string) => {
    setSelectedStaff(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const handleDownload = () => {
    const rows = [CSV_HEADERS, ...filtered.map(rowToCsvValues)]
    const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toLocaleDateString('ja-JP').replace(/\//g, '')
    a.download = `スタッフ獲得データ_${dateStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ k }: { k: 'staff_name' | 'week_number' }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1" style={{ color: '#FFB300' }} />
      : <ChevronDown className="w-3 h-3 inline ml-1" style={{ color: '#FFB300' }} />
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgba(220, 237, 200, 0.75)' }}>
      <MagneticDots />
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: '#22211A' }}>
            スタッフ獲得データ エクスポート
          </h1>
          <p className="text-sm" style={{ color: '#22211A', opacity: 0.6 }}>
            2026年6月2日以降・ID係数登録済みのスタッフ実績をCSVでダウンロードできます
          </p>
        </div>

        {loading ? <LoadingAnimation /> : (
          <div className="glass rounded-lg border p-4 md:p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)' }}>

            {/* フィルター */}
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <FilterIcon className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
                <span className="font-semibold" style={{ color: '#22211A' }}>絞り込み</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

                {/* 年 */}
                <select value={yearFilter} onChange={e => handleYearChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none"
                  style={{ border: '1px solid #22211A', color: '#22211A' }}>
                  <option value="all">全年</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>

                {/* 月 */}
                <select value={monthFilter} onChange={e => handleMonthChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none"
                  style={{ border: '1px solid #22211A', color: '#22211A' }}>
                  <option value="all">全月</option>
                  {availableMonths.map(m => <option key={m} value={m}>{m}月</option>)}
                </select>

                {/* 週 */}
                <select value={weekFilter} onChange={e => handleWeekChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none"
                  style={{ border: '1px solid #22211A', color: '#22211A' }}>
                  <option value="all">全週</option>
                  {availableWeeks.map(w => <option key={w} value={w}>{w}週</option>)}
                </select>

                {/* 区分 */}
                <select value={categoryFilter} onChange={e => handleCategoryChange(e.target.value as typeof categoryFilter)}
                  className="px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none"
                  style={{ border: '1px solid #22211A', color: '#22211A' }}>
                  <option value="all">全区分</option>
                  <option value="internal">自社</option>
                  <option value="external">他社</option>
                  <option value="store">店舗</option>
                </select>

                {/* スタッフ複数選択 */}
                <div className="relative col-span-2 md:col-span-1">
                  {/* 外クリックで閉じるオーバーレイ */}
                  {staffDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setStaffDropdownOpen(false)} />
                  )}
                  <button onClick={() => setStaffDropdownOpen(p => !p)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm"
                    style={{ border: '1px solid #22211A', color: '#22211A' }}>
                    <span className="truncate">
                      {selectedStaff.length === 0 ? '全スタッフ' : `${selectedStaff.length}名選択中`}
                    </span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0 ml-1" />
                  </button>
                  {staffDropdownOpen && (
                    <div
                      className="absolute z-50 w-64 max-h-60 overflow-y-auto rounded-lg shadow-lg mt-1 bg-white border"
                      style={{ borderColor: '#22211A' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-2 border-b flex justify-between items-center" style={{ borderColor: '#22211A22' }}>
                        <span className="text-xs font-semibold" style={{ color: '#22211A' }}>スタッフ選択</span>
                        {selectedStaff.length > 0 && (
                          <button onClick={() => setSelectedStaff([])} className="text-xs flex items-center gap-1" style={{ color: '#22211A', opacity: 0.6 }}>
                            <X className="w-3 h-3" />クリア
                          </button>
                        )}
                      </div>
                      {availableStaffNames.map(name => (
                        <label key={name} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm" style={{ color: '#22211A' }}>
                          <input type="checkbox" checked={selectedStaff.includes(name)} onChange={() => toggleStaff(name)}
                            className="rounded" style={{ accentColor: '#FFB300' }} />
                          {name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* サマリー + ダウンロードボタン */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
                <span className="font-bold text-base" style={{ color: '#22211A', opacity: 1 }}>{filtered.length}</span> 行が対象
                （スタッフ {[...new Set(filtered.map(r => r.staff_name))].length} 名、
                イベント {[...new Set(filtered.map(r => r.start_date))].length} 件）
              </p>
              <button onClick={handleDownload} disabled={filtered.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-40"
                style={{ backgroundColor: '#FFB300', color: '#22211A' }}>
                <Download className="w-4 h-4" />
                CSVダウンロード ({filtered.length}行)
              </button>
            </div>

            {/* プレビューテーブル（全カラム・横スクロール） */}
            {sorted.length > 0 ? (
              <div className="border-t pt-4" style={{ borderColor: '#22211A44' }}>
                <p className="text-xs mb-2" style={{ color: '#22211A', opacity: 0.5 }}>
                  プレビュー（{sorted.length}行） ※ヘッダークリックでソート
                </p>
                <div className="overflow-x-auto">
                  <table className="text-xs" style={{ minWidth: '2400px' }}>
                    <thead>
                      <tr className="bg-muted">
                        {/* ソート可能列 */}
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap cursor-pointer select-none"
                          style={{ color: '#22211A' }} onClick={() => handleSort('staff_name')}>
                          スタッフ名<SortIcon k="staff_name" />
                        </th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>区分</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>年</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>月</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap cursor-pointer select-none"
                          style={{ color: '#22211A' }} onClick={() => handleSort('week_number')}>
                          週<SortIcon k="week_number" />
                        </th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>開始日</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>終了日</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>会場</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>代理店名</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>商流</th>
                        {/* ID点数 */}
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#4abf79', backgroundColor: 'rgba(74,191,121,0.10)' }}>ID点数</th>
                        {/* au MNP */}
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>au MNP SP1</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>au MNP SP2</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>au MNP SIM</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A', backgroundColor: 'rgba(34,33,26,0.06)' }}>au MNP合計</th>
                        {/* UQ MNP */}
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>UQ MNP SP1</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>UQ MNP SP2</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>UQ MNP SIM</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A', backgroundColor: 'rgba(34,33,26,0.06)' }}>UQ MNP合計</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#FFB300', backgroundColor: 'rgba(255,179,0,0.08)' }}>MNP合計</th>
                        {/* au 新規 */}
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>au 新規 SP1</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>au 新規 SP2</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>au 新規 SIM</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A', backgroundColor: 'rgba(34,33,26,0.06)' }}>au 新規合計</th>
                        {/* UQ 新規 */}
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>UQ 新規 SP1</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>UQ 新規 SP2</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>UQ 新規 SIM</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A', backgroundColor: 'rgba(34,33,26,0.06)' }}>UQ 新規合計</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#FFB300', backgroundColor: 'rgba(255,179,0,0.08)' }}>新規合計</th>
                        {/* セルアップ */}
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>CU SP1</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>CU SP2</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>CU SIM</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A', backgroundColor: 'rgba(34,33,26,0.06)' }}>CU合計</th>
                        {/* その他 */}
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>クレカ</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>ゴールド</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>JI銀行</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>保証</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>OTT</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>電気</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>ガス</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap" style={{ color: '#22211A' }}>NW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((r, i) => {
                        const cat = getStaffCategory(r.staff_name)
                        const catLabel = cat === 'internal' ? '自社' : cat === 'external' ? '他社' : '店舗'
                        const catColor = cat === 'internal' ? '#4abf79' : cat === 'external' ? '#FFB300' : '#6495ED'
                        const auMnp = r.au_mnp_sp1 + r.au_mnp_sp2 + r.au_mnp_sim
                        const uqMnp = r.uq_mnp_sp1 + r.uq_mnp_sp2 + r.uq_mnp_sim
                        const auHs = r.au_hs_sp1 + r.au_hs_sp2 + r.au_hs_sim
                        const uqHs = r.uq_hs_sp1 + r.uq_hs_sp2 + r.uq_hs_sim
                        const cu = r.cell_up_sp1 + r.cell_up_sp2 + r.cell_up_sim
                        const td = (v: number | string, bold = false, bg?: string) => (
                          <td className={`px-3 py-1.5 text-right whitespace-nowrap${bold ? ' font-semibold' : ''}`}
                            style={{ color: '#22211A', backgroundColor: bg }}>
                            {v}
                          </td>
                        )
                        return (
                          <tr key={i} className="border-t hover:bg-muted/30" style={{ borderColor: '#22211A11' }}>
                            <td className="px-3 py-1.5 whitespace-nowrap font-medium" style={{ color: '#22211A' }}>{r.staff_name}</td>
                            <td className="px-3 py-1.5">
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `${catColor}22`, color: catColor }}>{catLabel}</span>
                            </td>
                            {td(r.year)}
                            {td(r.month)}
                            {td(r.week_number ?? '-')}
                            <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: '#22211A' }}>{r.start_date}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: '#22211A' }}>{r.end_date ?? '-'}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: '#22211A' }}>{r.venue}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: '#22211A' }}>{r.agency_name}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: '#22211A' }}>{r.agency_tier ?? '-'}</td>
                            <td className="px-3 py-1.5 text-right whitespace-nowrap font-semibold" style={{ color: '#4abf79', backgroundColor: 'rgba(74,191,121,0.06)' }}>
                              {(r.id_score ?? 0) > 0 ? (r.id_score ?? 0).toFixed(1) : '-'}
                            </td>
                            {td(r.au_mnp_sp1)} {td(r.au_mnp_sp2)} {td(r.au_mnp_sim)}
                            {td(auMnp, true, 'rgba(34,33,26,0.04)')}
                            {td(r.uq_mnp_sp1)} {td(r.uq_mnp_sp2)} {td(r.uq_mnp_sim)}
                            {td(uqMnp, true, 'rgba(34,33,26,0.04)')}
                            {td(auMnp + uqMnp, true, 'rgba(255,179,0,0.08)')}
                            {td(r.au_hs_sp1)} {td(r.au_hs_sp2)} {td(r.au_hs_sim)}
                            {td(auHs, true, 'rgba(34,33,26,0.04)')}
                            {td(r.uq_hs_sp1)} {td(r.uq_hs_sp2)} {td(r.uq_hs_sim)}
                            {td(uqHs, true, 'rgba(34,33,26,0.04)')}
                            {td(auHs + uqHs + cu, true, 'rgba(255,179,0,0.08)')}
                            {td(r.cell_up_sp1)} {td(r.cell_up_sp2)} {td(r.cell_up_sim)}
                            {td(cu, false, 'rgba(34,33,26,0.04)')}
                            {td(r.credit_card)} {td(r.gold_card)} {td(r.ji_bank_account)}
                            {td(r.warranty)} {td(r.ott)} {td(r.electricity)} {td(r.gas)} {td(r.network_count)}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center" style={{ color: '#22211A', opacity: 0.4 }}>
                <p>条件に一致するデータがありません</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
