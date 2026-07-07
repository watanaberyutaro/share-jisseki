import { createClient } from '@supabase/supabase-js'

/**
 * SHELAチャットボット用の月次データスナップショット取得。
 * 既存の closer-monthly-id-scores と同じデータソース（events / staff_performances / mnp_id_contracts）を
 * 一度の集計でスタッフ別・会場別・商流別にまとめ、LLMへ渡す最小限のサマリーを作る。
 */

export interface StaffAgg {
  staffName: string
  idScore: number
  mnpCount: number
  newCount: number
  cellupCount: number
  eventCount: number
}

export interface GroupAgg {
  name: string
  idScore: number
  mnpCount: number
  newCount: number
}

export interface ShelaSnapshot {
  year: number
  month: number
  staff: StaffAgg[]
  venues: GroupAgg[]
  tiers: GroupAgg[]
  totals: {
    idScore: number
    mnpCount: number
    newCount: number
    cellupCount: number
    eventCount: number
    staffCount: number
  }
}

const SP_COLUMNS = `id, staff_name, event_id,
  au_mnp_sp1, au_mnp_sp2, au_mnp_sim, uq_mnp_sp1, uq_mnp_sp2, uq_mnp_sim,
  au_hs_sp1, au_hs_sp2, au_hs_sim, uq_hs_sp1, uq_hs_sp2, uq_hs_sim,
  cell_up_sp1, cell_up_sp2, cell_up_sim`

const n = (v: unknown) => Number(v || 0)

export async function getShelaSnapshot(year: number, month: number): Promise<ShelaSnapshot | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 対象月のイベント（ID計算開始日 2026-06-02 以降）
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, venue, agency_tier')
    .eq('year', year)
    .eq('month', month)
    .gte('start_date', '2026-06-02')
    .limit(10000)

  if (eventsError || !events || events.length === 0) return null

  const eventMap = new Map(events.map(e => [e.id, e]))
  const eventIds = events.map(e => e.id)

  // staff_performances を chunk 取得
  const EVENT_CHUNK = 500
  const allSP: any[] = []
  for (let i = 0; i < eventIds.length; i += EVENT_CHUNK) {
    const chunk = eventIds.slice(i, i + EVENT_CHUNK)
    const { data, error } = await supabase
      .from('staff_performances')
      .select(SP_COLUMNS)
      .in('event_id', chunk)
      .limit(50000)
    if (error) return null
    if (data) allSP.push(...data)
  }
  if (allSP.length === 0) return null

  // mnp_id_contracts を chunk 取得（staff_performance_id → 合計ID点数）
  const spIds = allSP.map(sp => sp.id)
  const idScoreBySpId = new Map<string, number>()
  const CHUNK = 500
  for (let i = 0; i < spIds.length; i += CHUNK) {
    const chunk = spIds.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('mnp_id_contracts')
      .select('staff_performance_id, total_id_score')
      .in('staff_performance_id', chunk)
      .limit(50000)
    if (error) continue
    if (data) {
      for (const c of data) {
        idScoreBySpId.set(
          c.staff_performance_id,
          (idScoreBySpId.get(c.staff_performance_id) || 0) + parseFloat(String(c.total_id_score || '0'))
        )
      }
    }
  }

  const staffMap = new Map<string, StaffAgg & { eventIds: Set<string> }>()
  const venueMap = new Map<string, GroupAgg>()
  const tierMap = new Map<string, GroupAgg>()

  for (const sp of allSP) {
    const ev = eventMap.get(sp.event_id)
    const mnp = n(sp.au_mnp_sp1) + n(sp.au_mnp_sp2) + n(sp.au_mnp_sim) + n(sp.uq_mnp_sp1) + n(sp.uq_mnp_sp2) + n(sp.uq_mnp_sim)
    const nw = n(sp.au_hs_sp1) + n(sp.au_hs_sp2) + n(sp.au_hs_sim) + n(sp.uq_hs_sp1) + n(sp.uq_hs_sp2) + n(sp.uq_hs_sim)
    const cu = n(sp.cell_up_sp1) + n(sp.cell_up_sp2) + n(sp.cell_up_sim)
    const idScore = idScoreBySpId.get(sp.id) || 0

    // スタッフ別
    if (!staffMap.has(sp.staff_name)) {
      staffMap.set(sp.staff_name, {
        staffName: sp.staff_name, idScore: 0, mnpCount: 0, newCount: 0, cellupCount: 0, eventCount: 0, eventIds: new Set(),
      })
    }
    const s = staffMap.get(sp.staff_name)!
    s.idScore += idScore
    s.mnpCount += mnp
    s.newCount += nw
    s.cellupCount += cu
    s.eventIds.add(sp.event_id)

    // 会場別
    const venue = ev?.venue || '不明'
    if (!venueMap.has(venue)) venueMap.set(venue, { name: venue, idScore: 0, mnpCount: 0, newCount: 0 })
    const v = venueMap.get(venue)!
    v.idScore += idScore
    v.mnpCount += mnp
    v.newCount += nw

    // 商流別（一次/二次）
    const tier = ev?.agency_tier || '不明'
    if (!tierMap.has(tier)) tierMap.set(tier, { name: tier, idScore: 0, mnpCount: 0, newCount: 0 })
    const t = tierMap.get(tier)!
    t.idScore += idScore
    t.mnpCount += mnp
    t.newCount += nw
  }

  const staff = Array.from(staffMap.values())
    .map(s => ({ staffName: s.staffName, idScore: s.idScore, mnpCount: s.mnpCount, newCount: s.newCount, cellupCount: s.cellupCount, eventCount: s.eventIds.size }))
    .sort((a, b) => b.idScore - a.idScore)

  const venues = Array.from(venueMap.values()).sort((a, b) => b.idScore - a.idScore)
  const tiers = Array.from(tierMap.values()).sort((a, b) => b.idScore - a.idScore)

  const totals = {
    idScore: staff.reduce((sum, s) => sum + s.idScore, 0),
    mnpCount: staff.reduce((sum, s) => sum + s.mnpCount, 0),
    newCount: staff.reduce((sum, s) => sum + s.newCount, 0),
    cellupCount: staff.reduce((sum, s) => sum + s.cellupCount, 0),
    eventCount: events.length,
    staffCount: staff.length,
  }

  return { year, month, staff, venues, tiers, totals }
}

/**
 * よくある構造化データ質問には、モデルを使わず直接答える（高速・正確・トークンゼロ）。
 * 該当パターンがなければ null を返し、呼び出し側でLLMにデータを渡す。
 */
export function answerFromSnapshot(message: string, snap: ShelaSnapshot): string | null {
  const r1 = (v: number) => Math.round(v * 10) / 10
  const period = `${snap.year}年${snap.month}月`

  // 1. 個人スタッフ指定（名前が含まれるか）
  for (const s of snap.staff) {
    if (!s.staffName) continue
    const family = s.staffName.split(/[\s　]/)[0]
    const hit = message.includes(s.staffName) || (family.length >= 2 && message.includes(family))
    if (hit) {
      const rank = snap.staff.findIndex(x => x.staffName === s.staffName) + 1
      return `[guidance]${period}の${s.staffName}さんは、ID係数${r1(s.idScore)}pt（${rank}位）、MNP${s.mnpCount}件、新規${s.newCount}件、セルアップ${s.cellupCount}件、${s.eventCount}イベント参加です。`
    }
  }

  // 2. 会場別
  if (/会場/.test(message)) {
    const top = snap.venues.slice(0, 5).map((v, i) => `${i + 1}位 ${v.name}（ID係数${r1(v.idScore)}pt・MNP${v.mnpCount}件）`).join('、')
    return `[guidance]${period}の会場別トップ5（ID係数順）は、${top}です。`
  }

  // 3. 商流別（一次/二次）
  if (/商流|一次|二次/.test(message)) {
    const t = snap.tiers.map(x => `${x.name}＝ID係数${r1(x.idScore)}pt・MNP${x.mnpCount}件・新規${x.newCount}件`).join('、')
    return `[guidance]${period}の商流別は、${t}です。`
  }

  // 4. ランキング・トップ
  if (/ランキング|トップ|順位|上位|ベスト|何位|一番|誰が/.test(message)) {
    const top = snap.staff.slice(0, 5).map((s, i) => `${i + 1}位 ${s.staffName}（${r1(s.idScore)}pt）`).join('、')
    return `[proud]${period}のID係数ランキングは、${top}です。`
  }

  // 5. 合計・サマリー
  if (/合計|サマリー|全体|実績|成績|件数|何件/.test(message)) {
    const t = snap.totals
    return `[guidance]${period}の全体は、ID係数合計${r1(t.idScore)}pt、MNP${t.mnpCount}件、新規${t.newCount}件、セルアップ${t.cellupCount}件、イベント${t.eventCount}件、スタッフ${t.staffCount}名です。`
  }

  return null
}

/** スナップショットをLLMに渡すコンパクトなテキストに整形（トークン節約のため要点のみ） */
export function formatSnapshot(snap: ShelaSnapshot): string {
  const r1 = (v: number) => Math.round(v * 10) / 10
  const lines: string[] = []
  lines.push(`【${snap.year}年${snap.month}月のSHELA実績データ（これを根拠に回答すること）】`)
  lines.push(`■全体サマリー: ID係数合計${r1(snap.totals.idScore)}pt / MNP${snap.totals.mnpCount}件 / 新規${snap.totals.newCount}件 / セルアップ${snap.totals.cellupCount}件 / イベント${snap.totals.eventCount}件 / スタッフ${snap.totals.staffCount}名`)

  lines.push('■スタッフ別ランキング（ID係数順）:')
  snap.staff.slice(0, 30).forEach((s, i) => {
    lines.push(`${i + 1}位 ${s.staffName}: ID係数${r1(s.idScore)}pt, MNP${s.mnpCount}件, 新規${s.newCount}件, CU${s.cellupCount}件, ${s.eventCount}イベント`)
  })

  lines.push('■商流別（一次/二次）:')
  snap.tiers.forEach(t => {
    lines.push(`${t.name}: ID係数${r1(t.idScore)}pt, MNP${t.mnpCount}件, 新規${t.newCount}件`)
  })

  lines.push('■会場別トップ10（ID係数順）:')
  snap.venues.slice(0, 10).forEach((v, i) => {
    lines.push(`${i + 1}. ${v.name}: ID係数${r1(v.idScore)}pt, MNP${v.mnpCount}件, 新規${v.newCount}件`)
  })

  return lines.join('\n')
}
