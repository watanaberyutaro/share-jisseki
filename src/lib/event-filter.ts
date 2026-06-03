/**
 * 商流・イベントタイプフィルタリングユーティリティ
 *
 * 代理店階層（一次/二次）とイベント種別（外販/店頭）でフィルタリング
 */

/**
 * 商流（代理店階層）フィルター設定
 */
export interface AgencyTierFilter {
  showAll: boolean
  showPrimary: boolean    // 一次
  showSecondary: boolean  // 二次
}

/**
 * イベントタイプフィルター設定
 */
export interface EventTypeFilter {
  showAll: boolean
  showGaihan: boolean     // 外販
  showTento: boolean      // 店頭
}

/**
 * デフォルトの商流フィルター（全て表示）
 */
export const DEFAULT_AGENCY_TIER_FILTER: AgencyTierFilter = {
  showAll: true,
  showPrimary: false,
  showSecondary: false,
}

/**
 * デフォルトのイベントタイプフィルター（全て表示）
 */
export const DEFAULT_EVENT_TYPE_FILTER: EventTypeFilter = {
  showAll: true,
  showGaihan: false,
  showTento: false,
}

/**
 * 商流フィルターを適用
 */
export function applyAgencyTierFilter<T extends { agency_tier?: string | null }>(
  events: T[],
  filter: AgencyTierFilter
): T[] {
  if (filter.showAll) return events

  return events.filter(event => {
    const tier = event.agency_tier
    if (!tier) return false // agency_tierがnullの場合は除外

    if (filter.showPrimary && tier === '一次') return true
    if (filter.showSecondary && tier === '二次') return true
    return false
  })
}

/**
 * イベントタイプフィルターを適用
 */
export function applyEventTypeFilter<T extends { event_type?: string | null }>(
  events: T[],
  filter: EventTypeFilter
): T[] {
  if (filter.showAll) return events

  return events.filter(event => {
    const type = event.event_type
    if (!type) return false // event_typeがnullの場合は除外

    if (filter.showGaihan && type === '外販') return true
    if (filter.showTento && type === '店頭') return true
    return false
  })
}

/**
 * 商流フィルターの表示名を取得
 */
export function getAgencyTierFilterDisplayName(filter: AgencyTierFilter): string {
  if (filter.showAll) return 'すべて'

  const selected: string[] = []
  if (filter.showPrimary) selected.push('一次')
  if (filter.showSecondary) selected.push('二次')

  if (selected.length === 0) return 'なし'
  return selected.join('・')
}

/**
 * イベントタイプフィルターの表示名を取得
 */
export function getEventTypeFilterDisplayName(filter: EventTypeFilter): string {
  if (filter.showAll) return 'すべて'

  const selected: string[] = []
  if (filter.showGaihan) selected.push('外販')
  if (filter.showTento) selected.push('店頭')

  if (selected.length === 0) return 'なし'
  return selected.join('・')
}
