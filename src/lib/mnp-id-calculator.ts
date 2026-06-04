/**
 * MNP新規ID点数計算機能
 *
 * 適用開始日: 2026年6月2日以降の実績のみ
 * 対象: MNP新規のみ（通常新規、法人SP、その他プランは対象外）
 */

// プラン区分の定義
export const PLAN_TYPES = {
  MANEKATSU_2: 'MANEKATSU_2',           // マネ活2 / 使い放題MAX+マネ活2
  VALUE_LINK: 'VALUE_LINK',             // バリューリンク / 使い放題MAX+
  KOMIKOMI: 'KOMIKOMI',                 // コミコミ / コミコミバリュー
  U12_U18_SENIOR_MINI: 'U12_U18_SENIOR_MINI', // U12 / U18 / シニア / スマホミニ
  TOKUTOKU: 'TOKUTOKU',                 // トクトク / トクトク2
} as const

export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES]

// 端末区分の定義
export const DEVICE_TYPES = {
  DEVICE: 'DEVICE',       // 端末あり
  SIM_ONLY: 'SIM_ONLY',   // SIM
} as const

export type DeviceType = typeof DEVICE_TYPES[keyof typeof DEVICE_TYPES]

// キャリア区分の定義
export const CARRIERS = {
  AU: 'au',
  UQ: 'uq',
} as const

export type Carrier = typeof CARRIERS[keyof typeof CARRIERS]

// プラン基準点の定義
export const PLAN_BASE_POINTS: Record<PlanType, number> = {
  MANEKATSU_2: 3,
  VALUE_LINK: 2,
  KOMIKOMI: 2,
  U12_U18_SENIOR_MINI: 1.5,
  TOKUTOKU: 0.5,
}

// 端末係数の定義
export const DEVICE_COEFFICIENTS: Record<DeviceType, number> = {
  DEVICE: 2,
  SIM_ONLY: 1,
}

// MNP係数（固定値）
export const MNP_COEFFICIENT = 3

// 特定機種加点
export const SPECIAL_DEVICE_BONUS = 2

// プラン区分のラベル（UI表示用）
export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  MANEKATSU_2: 'マネ活2 / 使い放題MAX+マネ活2',
  VALUE_LINK: 'バリューリンク / 使い放題MAX+',
  KOMIKOMI: 'コミコミ / コミコミバリュー',
  U12_U18_SENIOR_MINI: 'U12 / U18 / シニア / スマホミニ',
  TOKUTOKU: 'トクトク / トクトク2',
}

// 端末区分のラベル（UI表示用）
export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  DEVICE: '端末あり',
  SIM_ONLY: 'SIM',
}

// キャリアのラベル（UI表示用）
export const CARRIER_LABELS: Record<Carrier, string> = {
  au: 'au',
  uq: 'UQ',
}

// MNP ID契約の型定義
export interface MnpIdContract {
  id?: string
  carrier: Carrier
  planType: PlanType
  deviceType: DeviceType
  specialDevice: boolean
  count: number
  excludedCount: number
  idScorePerContract?: number
  totalIdScore?: number
}

// ID点数計算結果の型定義
export interface IdScoreCalculationResult {
  effectiveCount: number        // 有効件数 = count - excludedCount
  idScorePerContract: number    // 1件あたりID点数
  totalIdScore: number          // 合計ID点数
}

/**
 * 1件あたりのID点数を計算
 *
 * 計算式:
 * id_score_per_contract = 1 + (plan_base_point × device_coefficient × 3) + special_device_bonus
 *
 * @param planType - プラン区分
 * @param deviceType - 端末区分
 * @param specialDevice - 特定機種フラグ
 * @returns 1件あたりのID点数
 */
export function calculateIdScorePerContract(
  planType: PlanType,
  deviceType: DeviceType,
  specialDevice: boolean
): number {
  const planBasePoint = PLAN_BASE_POINTS[planType]
  const deviceCoefficient = DEVICE_COEFFICIENTS[deviceType]
  const specialDeviceBonus = specialDevice ? SPECIAL_DEVICE_BONUS : 0

  const score = 1 + (planBasePoint * deviceCoefficient * MNP_COEFFICIENT) + specialDeviceBonus

  return score
}

/**
 * MNP ID契約の合計ID点数を計算
 *
 * @param contract - MNP ID契約情報
 * @returns 計算結果（有効件数、1件あたりID点数、合計ID点数）
 */
export function calculateMnpIdScore(contract: MnpIdContract): IdScoreCalculationResult {
  const effectiveCount = Math.max(0, contract.count - contract.excludedCount)
  const idScorePerContract = calculateIdScorePerContract(
    contract.planType,
    contract.deviceType,
    contract.specialDevice
  )
  const totalIdScore = idScorePerContract * effectiveCount

  return {
    effectiveCount,
    idScorePerContract,
    totalIdScore,
  }
}

/**
 * 複数のMNP ID契約の合計ID点数を計算
 *
 * @param contracts - MNP ID契約のリスト
 * @returns 合計ID点数
 */
export function calculateTotalIdScore(contracts: MnpIdContract[]): number {
  return contracts.reduce((total, contract) => {
    const { totalIdScore } = calculateMnpIdScore(contract)
    return total + totalIdScore
  }, 0)
}

/**
 * キャリア別のMNP ID契約の合計ID点数を計算
 *
 * @param contracts - MNP ID契約のリスト
 * @param carrier - キャリア区分（'au' または 'uq'）
 * @returns 指定キャリアの合計ID点数
 */
export function calculateCarrierIdScore(contracts: MnpIdContract[], carrier: Carrier): number {
  const carrierContracts = contracts.filter(c => c.carrier === carrier)
  return calculateTotalIdScore(carrierContracts)
}

/**
 * イベント日付が2026年6月2日以降かどうかを判定
 *
 * @param eventDate - イベント開始日（YYYY-MM-DD形式またはDateオブジェクト）
 * @returns 2026年6月2日以降の場合true
 */
export function isIdCalculationEnabled(eventDate: string | Date): boolean {
  const cutoffDate = new Date('2026-06-02')
  const targetDate = typeof eventDate === 'string' ? new Date(eventDate) : eventDate

  return targetDate >= cutoffDate
}

/**
 * MNP ID契約のサマリー情報を計算
 *
 * @param contracts - MNP ID契約のリスト
 * @returns サマリー情報（au/uq別、合計）
 */
export function calculateIdScoreSummary(contracts: MnpIdContract[]) {
  const auContracts = contracts.filter(c => c.carrier === 'au')
  const uqContracts = contracts.filter(c => c.carrier === 'uq')

  const auIdScore = calculateTotalIdScore(auContracts)
  const uqIdScore = calculateTotalIdScore(uqContracts)
  const totalIdScore = auIdScore + uqIdScore

  const auCount = auContracts.reduce((sum, c) => sum + c.count, 0)
  const uqCount = uqContracts.reduce((sum, c) => sum + c.count, 0)
  const totalCount = auCount + uqCount

  const auExcludedCount = auContracts.reduce((sum, c) => sum + c.excludedCount, 0)
  const uqExcludedCount = uqContracts.reduce((sum, c) => sum + c.excludedCount, 0)
  const totalExcludedCount = auExcludedCount + uqExcludedCount

  const auEffectiveCount = auCount - auExcludedCount
  const uqEffectiveCount = uqCount - uqExcludedCount
  const totalEffectiveCount = totalCount - totalExcludedCount

  const avgIdScore = totalEffectiveCount > 0 ? totalIdScore / totalEffectiveCount : 0

  return {
    au: {
      count: auCount,
      excludedCount: auExcludedCount,
      effectiveCount: auEffectiveCount,
      idScore: auIdScore,
      avgIdScore: auEffectiveCount > 0 ? auIdScore / auEffectiveCount : 0,
    },
    uq: {
      count: uqCount,
      excludedCount: uqExcludedCount,
      effectiveCount: uqEffectiveCount,
      idScore: uqIdScore,
      avgIdScore: uqEffectiveCount > 0 ? uqIdScore / uqEffectiveCount : 0,
    },
    total: {
      count: totalCount,
      excludedCount: totalExcludedCount,
      effectiveCount: totalEffectiveCount,
      idScore: totalIdScore,
      avgIdScore,
    },
  }
}

/**
 * MNP ID契約データをデータベース形式に変換
 *
 * @param contract - MNP ID契約情報
 * @returns データベース形式のオブジェクト
 */
export function mnpIdContractToDb(contract: MnpIdContract) {
  const { idScorePerContract, totalIdScore } = calculateMnpIdScore(contract)

  return {
    carrier: contract.carrier,
    plan_type: contract.planType,
    device_type: contract.deviceType,
    special_device: contract.specialDevice,
    count: contract.count,
    excluded_count: contract.excludedCount,
    id_score_per_contract: idScorePerContract,
    total_id_score: totalIdScore,
  }
}

/**
 * データベース形式からMNP ID契約データに変換
 *
 * @param dbContract - データベース形式のMNP ID契約データ
 * @returns MNP ID契約情報
 */
export function mnpIdContractFromDb(dbContract: any): MnpIdContract {
  return {
    id: dbContract.id,
    carrier: dbContract.carrier,
    planType: dbContract.plan_type,
    deviceType: dbContract.device_type,
    specialDevice: dbContract.special_device,
    count: dbContract.count,
    excludedCount: dbContract.excluded_count,
    idScorePerContract: parseFloat(dbContract.id_score_per_contract || '0'),
    totalIdScore: parseFloat(dbContract.total_id_score || '0'),
  }
}
