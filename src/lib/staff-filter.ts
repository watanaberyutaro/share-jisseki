/**
 * スタッフ区分フィルタリングユーティリティ
 *
 * スタッフ名から自社/他社クローザー/店舗を判定し、
 * フィルタリング機能を提供します
 */

export type StaffCategory = 'internal' | 'external' | 'store'

/**
 * スタッフ名からカテゴリを判定
 */
export function getStaffCategory(staffName: string): StaffCategory {
  const name = staffName || ''

  if (name.includes('他社')) {
    return 'external'
  }

  if (name.includes('店舗')) {
    return 'store'
  }

  return 'internal'
}

/**
 * スタッフ区分フィルター設定
 */
export interface StaffFilterConfig {
  includeInternal: boolean  // 自社スタッフを含める
  includeExternal: boolean  // 他社クローザーを含める
  includeStore: boolean     // 店舗を含める
}

/**
 * デフォルトのフィルター設定（全て含める）
 */
export const DEFAULT_STAFF_FILTER: StaffFilterConfig = {
  includeInternal: true,
  includeExternal: true,
  includeStore: true,
}

/**
 * 自社のみのフィルター設定
 */
export const INTERNAL_ONLY_FILTER: StaffFilterConfig = {
  includeInternal: true,
  includeExternal: false,
  includeStore: false,
}

/**
 * スタッフ名がフィルター設定に合致するかチェック
 */
export function shouldIncludeStaff(
  staffName: string,
  filter: StaffFilterConfig
): boolean {
  const category = getStaffCategory(staffName)

  switch (category) {
    case 'internal':
      return filter.includeInternal
    case 'external':
      return filter.includeExternal
    case 'store':
      return filter.includeStore
    default:
      return true
  }
}

/**
 * スタッフパフォーマンスデータをフィルタリング
 */
export function filterStaffPerformances<T extends { staff_name: string }>(
  performances: T[],
  filter: StaffFilterConfig
): T[] {
  return performances.filter(perf =>
    shouldIncludeStaff(perf.staff_name, filter)
  )
}

/**
 * 日別スタッフパフォーマンスから集計を計算（フィルター適用）
 */
export function aggregateFilteredPerformances(
  staffPerformances: any[],
  filter: StaffFilterConfig
): {
  au_mnp: number
  uq_mnp: number
  au_new: number
  uq_new: number
  cellup: number
  hs_total: number
  credit_card: number
  gold_card: number
  ji_bank_account: number
  warranty: number
  ott: number
  electricity: number
  gas: number
  network_count: number
} {
  const filtered = filterStaffPerformances(staffPerformances, filter)

  return filtered.reduce((acc, perf) => {
    acc.au_mnp += (perf.au_mnp_sp1 || 0) + (perf.au_mnp_sp2 || 0) + (perf.au_mnp_sim || 0)
    acc.uq_mnp += (perf.uq_mnp_sp1 || 0) + (perf.uq_mnp_sp2 || 0) + (perf.uq_mnp_sim || 0)
    acc.au_new += (perf.au_hs_sp1 || 0) + (perf.au_hs_sp2 || 0) + (perf.au_hs_sim || 0)
    acc.uq_new += (perf.uq_hs_sp1 || 0) + (perf.uq_hs_sp2 || 0) + (perf.uq_hs_sim || 0)
    acc.cellup += (perf.cell_up_sp1 || 0) + (perf.cell_up_sp2 || 0) + (perf.cell_up_sim || 0)
    acc.hs_total = acc.au_mnp + acc.uq_mnp + acc.au_new + acc.uq_new + acc.cellup
    acc.credit_card += perf.credit_card || 0
    acc.gold_card += perf.gold_card || 0
    acc.ji_bank_account += perf.ji_bank_account || 0
    acc.warranty += perf.warranty || 0
    acc.ott += perf.ott || 0
    acc.electricity += perf.electricity || 0
    acc.gas += perf.gas || 0
    acc.network_count += perf.network_count || 0
    return acc
  }, {
    au_mnp: 0,
    uq_mnp: 0,
    au_new: 0,
    uq_new: 0,
    cellup: 0,
    hs_total: 0,
    credit_card: 0,
    gold_card: 0,
    ji_bank_account: 0,
    warranty: 0,
    ott: 0,
    electricity: 0,
    gas: 0,
    network_count: 0,
  })
}

/**
 * フィルター設定の表示名を取得
 */
export function getFilterDisplayName(filter: StaffFilterConfig): string {
  const included: string[] = []

  if (filter.includeInternal) included.push('自社')
  if (filter.includeExternal) included.push('他社')
  if (filter.includeStore) included.push('店舗')

  if (included.length === 3) return 'すべて'
  if (included.length === 0) return 'なし'

  return included.join('・')
}
