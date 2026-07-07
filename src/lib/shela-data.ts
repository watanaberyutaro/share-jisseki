import { createClient } from '@supabase/supabase-js'

/**
 * SHELAチャットボット用の月次データスナップショット取得。
 * events / staff_performances / mnp_id_contracts を一度の集計でまとめ、
 * スタッフ別・会場別・商流別・全体、さらにLTV(付帯)やau/UQ MNP内訳まで保持する。
 */

export interface StaffAgg {
  staffName: string
  idScore: number
  mnpCount: number
  auMnp: number
  uqMnp: number
  newCount: number
  cellupCount: number
  ltv: number
  eventCount: number
}

export interface GroupAgg {
  name: string
  idScore: number
  mnpCount: number
  newCount: number
  ltv: number
}

export interface ShelaSnapshot {
  year: number
  month: number
  week?: number
  staff: StaffAgg[]
  venues: GroupAgg[]
  tiers: GroupAgg[]
  venueEvents: Record<string, { id: string; date: string }[]>
  totals: {
    idScore: number
    mnpCount: number
    auMnp: number
    uqMnp: number
    newCount: number
    cellupCount: number
    ltv: number
    eventCount: number
    staffCount: number
    // 付帯項目の内訳
    creditCard: number
    goldCard: number
    jiBank: number
    warranty: number
    ott: number
    electricity: number
    gas: number
    network: number
  }
}

const SP_COLUMNS = `id, staff_name, event_id,
  au_mnp_sp1, au_mnp_sp2, au_mnp_sim, uq_mnp_sp1, uq_mnp_sp2, uq_mnp_sim,
  au_hs_sp1, au_hs_sp2, au_hs_sim, uq_hs_sp1, uq_hs_sp2, uq_hs_sim,
  cell_up_sp1, cell_up_sp2, cell_up_sim,
  credit_card, gold_card, ji_bank_account, warranty, ott, electricity, gas, network_count`

const n = (v: unknown) => Number(v || 0)

export async function getShelaSnapshot(year: number, month: number, week?: number): Promise<ShelaSnapshot | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let eventsQuery = supabase
    .from('events')
    .select('id, venue, agency_tier, start_date')
    .eq('year', year)
    .eq('month', month)
    .gte('start_date', '2026-06-02')
    .limit(10000)
  if (week) eventsQuery = eventsQuery.eq('week_number', week)
  const { data: events, error: eventsError } = await eventsQuery

  if (eventsError || !events || events.length === 0) return null

  const eventMap = new Map(events.map(e => [e.id, e]))
  const eventIds = events.map(e => e.id)

  // 会場 → イベント（id・日付）のマップ
  const venueEvents: Record<string, { id: string; date: string }[]> = {}
  for (const e of events) {
    const v = e.venue || '不明'
    if (!venueEvents[v]) venueEvents[v] = []
    venueEvents[v].push({ id: e.id, date: (e.start_date || '').slice(0, 10) })
  }

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
  const t = {
    idScore: 0, mnpCount: 0, auMnp: 0, uqMnp: 0, newCount: 0, cellupCount: 0, ltv: 0,
    eventCount: events.length, staffCount: 0,
    creditCard: 0, goldCard: 0, jiBank: 0, warranty: 0, ott: 0, electricity: 0, gas: 0, network: 0,
  }

  for (const sp of allSP) {
    const ev = eventMap.get(sp.event_id)
    const auMnp = n(sp.au_mnp_sp1) + n(sp.au_mnp_sp2) + n(sp.au_mnp_sim)
    const uqMnp = n(sp.uq_mnp_sp1) + n(sp.uq_mnp_sp2) + n(sp.uq_mnp_sim)
    const mnp = auMnp + uqMnp
    const nw = n(sp.au_hs_sp1) + n(sp.au_hs_sp2) + n(sp.au_hs_sim) + n(sp.uq_hs_sp1) + n(sp.uq_hs_sp2) + n(sp.uq_hs_sim)
    const cu = n(sp.cell_up_sp1) + n(sp.cell_up_sp2) + n(sp.cell_up_sim)
    const credit = n(sp.credit_card), gold = n(sp.gold_card), jibank = n(sp.ji_bank_account)
    const warranty = n(sp.warranty), ott = n(sp.ott), elec = n(sp.electricity), gas = n(sp.gas), network = n(sp.network_count)
    const ltv = credit + gold + jibank + warranty + ott + elec + gas + network
    const idScore = idScoreBySpId.get(sp.id) || 0

    // スタッフ別
    if (!staffMap.has(sp.staff_name)) {
      staffMap.set(sp.staff_name, {
        staffName: sp.staff_name, idScore: 0, mnpCount: 0, auMnp: 0, uqMnp: 0,
        newCount: 0, cellupCount: 0, ltv: 0, eventCount: 0, eventIds: new Set(),
      })
    }
    const s = staffMap.get(sp.staff_name)!
    s.idScore += idScore; s.mnpCount += mnp; s.auMnp += auMnp; s.uqMnp += uqMnp
    s.newCount += nw; s.cellupCount += cu; s.ltv += ltv; s.eventIds.add(sp.event_id)

    // 会場別
    const venue = ev?.venue || '不明'
    if (!venueMap.has(venue)) venueMap.set(venue, { name: venue, idScore: 0, mnpCount: 0, newCount: 0, ltv: 0 })
    const v = venueMap.get(venue)!
    v.idScore += idScore; v.mnpCount += mnp; v.newCount += nw; v.ltv += ltv

    // 商流別
    const tier = ev?.agency_tier || '不明'
    if (!tierMap.has(tier)) tierMap.set(tier, { name: tier, idScore: 0, mnpCount: 0, newCount: 0, ltv: 0 })
    const tt = tierMap.get(tier)!
    tt.idScore += idScore; tt.mnpCount += mnp; tt.newCount += nw; tt.ltv += ltv

    // 全体
    t.idScore += idScore; t.mnpCount += mnp; t.auMnp += auMnp; t.uqMnp += uqMnp
    t.newCount += nw; t.cellupCount += cu; t.ltv += ltv
    t.creditCard += credit; t.goldCard += gold; t.jiBank += jibank; t.warranty += warranty
    t.ott += ott; t.electricity += elec; t.gas += gas; t.network += network
  }

  const staff = Array.from(staffMap.values())
    .map(({ eventIds, ...s }) => ({ ...s, eventCount: eventIds.size }))
    .sort((a, b) => b.idScore - a.idScore)
  t.staffCount = staff.length

  const venues = Array.from(venueMap.values()).sort((a, b) => b.idScore - a.idScore)
  const tiers = Array.from(tierMap.values()).sort((a, b) => b.idScore - a.idScore)

  return { year, month, week, staff, venues, tiers, totals: t, venueEvents }
}

const r1 = (v: number) => Math.round(v * 10) / 10

// 付帯項目名 → 全体合計のキー
const LTV_ITEMS: { test: RegExp; label: string; key: keyof ShelaSnapshot['totals'] }[] = [
  { test: /クレカ|クレジット|credit/i, label: 'クレカ', key: 'creditCard' },
  { test: /ゴールド|gold/i, label: 'ゴールドカード', key: 'goldCard' },
  { test: /じぶん銀行|自分銀行|ji銀行|銀行口座|口座/i, label: 'じぶん銀行口座', key: 'jiBank' },
  { test: /保証/, label: '保証', key: 'warranty' },
  { test: /ott|オプション映像|動画配信/i, label: 'OTT', key: 'ott' },
  { test: /電気/, label: '電気', key: 'electricity' },
  { test: /ガス/, label: 'ガス', key: 'gas' },
  { test: /ネットワーク|nw/i, label: 'ネットワーク', key: 'network' },
]

/**
 * よくある構造化データ質問には、モデルを使わず直接答える（高速・正確・トークンゼロ）。
 * 該当がなければ null を返し、呼び出し側でLLMにデータを渡す。
 */
export function answerFromSnapshot(message: string, snap: ShelaSnapshot): string | null {
  const period = snap.week ? `${snap.year}年${snap.month}月第${snap.week}週` : `${snap.year}年${snap.month}月`
  const T = snap.totals

  // --- スタッフ比較（〇〇と△△を比べて） ---
  if (/比べ|比較|どっち|vs/i.test(message)) {
    const matched = snap.staff.filter(s => {
      const fam = s.staffName.split(/[\s　]/)[0]
      return message.includes(s.staffName) || (fam.length >= 2 && message.includes(fam))
    })
    if (matched.length >= 2) {
      const [a, b] = matched
      return `[guidance]${period}の比較です。${a.staffName}＝ID係数${r1(a.idScore)}pt/MNP${a.mnpCount}件/新規${a.newCount}件/LTV${a.ltv}件、${b.staffName}＝ID係数${r1(b.idScore)}pt/MNP${b.mnpCount}件/新規${b.newCount}件/LTV${b.ltv}件。総合では${a.idScore >= b.idScore ? a.staffName : b.staffName}さんが上回っています。`
    }
    // 会場比較
    const mv = snap.venues.filter(v => v.name && message.includes(v.name))
    if (mv.length >= 2) {
      const [a, b] = mv
      return `[guidance]${period}の会場比較です。${a.name}＝ID係数${r1(a.idScore)}pt/MNP${a.mnpCount}件、${b.name}＝ID係数${r1(b.idScore)}pt/MNP${b.mnpCount}件。総合では${a.idScore >= b.idScore ? a.name : b.name}が上回っています。`
    }
  }

  // --- 個人スタッフ指定 ---
  for (const s of snap.staff) {
    if (!s.staffName) continue
    const fam = s.staffName.split(/[\s　]/)[0]
    if (message.includes(s.staffName) || (fam.length >= 2 && message.includes(fam))) {
      const rank = snap.staff.findIndex(x => x.staffName === s.staffName) + 1
      return `[guidance]${period}の${s.staffName}さんは、ID係数${r1(s.idScore)}pt（${rank}位）、MNP${s.mnpCount}件（au${s.auMnp}/UQ${s.uqMnp}）、新規${s.newCount}件、セルアップ${s.cellupCount}件、LTV${s.ltv}件、${s.eventCount}イベント参加です。`
    }
  }

  // --- 明示的ランキング（会場別 / 指標別スタッフ）を最優先 ---
  if (/ランキング|順位|上位|ベスト|何位/.test(message)) {
    if (/会場|現場/.test(message)) {
      let vkey: keyof GroupAgg = 'idScore'; let vlabel = 'ID係数'
      if (/mnp|乗り換え/i.test(message)) { vkey = 'mnpCount'; vlabel = 'MNP' }
      else if (/新規/.test(message)) { vkey = 'newCount'; vlabel = '新規' }
      else if (/ltv|付帯/i.test(message)) { vkey = 'ltv'; vlabel = 'LTV' }
      const vs = [...snap.venues].sort((a, b) => (b[vkey] as number) - (a[vkey] as number))
      const unit = vkey === 'idScore' ? 'pt' : '件'
      const top = vs.slice(0, 5).map((v, i) => `${i + 1}位 ${v.name}（${r1(v[vkey] as number)}${unit}）`).join('、')
      return `[proud]${period}の会場別${vlabel}ランキングは、${top}です。`
    }
    let key: keyof StaffAgg = 'idScore'; let label = 'ID係数'
    if (/mnp|乗り換え/i.test(message)) { key = 'mnpCount'; label = 'MNP' }
    else if (/新規/.test(message)) { key = 'newCount'; label = '新規' }
    else if (/ltv|付帯/i.test(message)) { key = 'ltv'; label = 'LTV' }
    const sorted = [...snap.staff].sort((a, b) => (b[key] as number) - (a[key] as number))
    const unit = key === 'idScore' ? 'pt' : '件'
    const top = sorted.slice(0, 5).map((s, i) => `${i + 1}位 ${s.staffName}（${r1(s[key] as number)}${unit}）`).join('、')
    return `[proud]${period}の${label}ランキングは、${top}です。`
  }

  // --- LTV / 付帯項目 ---
  const ltvItem = LTV_ITEMS.find(it => it.test.test(message))
  if (ltvItem) {
    const val = T[ltvItem.key]
    return `[guidance]${period}の${ltvItem.label}は${val}件です。LTV（付帯合計）は${T.ltv}件、その内訳はクレカ${T.creditCard}・ゴールド${T.goldCard}・じぶん銀行${T.jiBank}・保証${T.warranty}・OTT${T.ott}・電気${T.electricity}・ガス${T.gas}・NW${T.network}件です。`
  }
  if (/ltv|付帯|オプション/i.test(message)) {
    return `[guidance]${period}のLTV（付帯合計）は${T.ltv}件です。内訳はクレカ${T.creditCard}・ゴールド${T.goldCard}・じぶん銀行${T.jiBank}・保証${T.warranty}・OTT${T.ott}・電気${T.electricity}・ガス${T.gas}・NW${T.network}件です。`
  }

  // --- MNP（au/UQ内訳） ---
  if (/mnp|乗り換え|のりかえ/i.test(message)) {
    return `[guidance]${period}のMNP合計は${T.mnpCount}件（au ${T.auMnp}件 / UQ ${T.uqMnp}件）です。`
  }

  // --- 新規 ---
  if (/新規/.test(message)) {
    return `[guidance]${period}の新規は合計${T.newCount}件です。`
  }

  // --- 特定の会場名を指定（〇〇のイベント実績 → 実績＋詳細ページリンク） ---
  for (const v of snap.venues) {
    if (!v.name || v.name === '不明') continue
    // 会場名フル一致、または特徴的なトークン（漢字・カタカナ3文字以上）で一致判定
    const tokens = v.name.match(/[ァ-ヶー]{3,}|[一-龠々]{3,}/g) || []
    const hit = message.includes(v.name) || tokens.some(tok => message.includes(tok))
    if (hit) {
      const rank = snap.venues.findIndex(x => x.name === v.name) + 1
      const evs = snap.venueEvents[v.name] || []
      const links = evs.slice(0, 3)
        .map(e => `\n・[${e.date} の詳細を見る](/view/${e.id})`)
        .join('')
      return `[guidance]${period}の${v.name}は、ID係数${r1(v.idScore)}pt（会場${rank}位）・MNP${v.mnpCount}件・新規${v.newCount}件・LTV${v.ltv}件です。${links}`
    }
  }

  // --- 会場別（良い/悪い） ---
  if (/会場|現場/.test(message)) {
    if (/悪い|ダメ|だめ|低い|課題|ワースト/.test(message)) {
      const w = snap.venues[snap.venues.length - 1]
      return `[doubt]${period}で最もID係数が低い会場は${w.name}（ID係数${r1(w.idScore)}pt・MNP${w.mnpCount}件）です。ここは重点的に振り返りましょう。`
    }
    const top = snap.venues.slice(0, 5).map((v, i) => `${i + 1}位 ${v.name}（ID係数${r1(v.idScore)}pt・MNP${v.mnpCount}件）`).join('、')
    return `[guidance]${period}の会場別トップ5（ID係数順）は、${top}です。`
  }

  // --- 商流別 ---
  if (/商流|一次|二次/.test(message)) {
    const s = snap.tiers.map(x => `${x.name}＝ID係数${r1(x.idScore)}pt・MNP${x.mnpCount}件・新規${x.newCount}件`).join('、')
    return `[guidance]${period}の商流別は、${s}です。`
  }

  // --- ランキング（指標別） ---
  const wantsRank = /ランキング|トップ|順位|上位|ベスト|何位|一番|誰が|良い|強い|優秀/.test(message)
  const wantsWorst = /悪い|下位|伸び悩|ワースト|弱い|ダメ|だめ|低い/.test(message)
  if (wantsRank || wantsWorst) {
    // 指標を判定
    let key: keyof StaffAgg = 'idScore'
    let label = 'ID係数'
    if (/mnp|乗り換え/i.test(message)) { key = 'mnpCount'; label = 'MNP' }
    else if (/新規/.test(message)) { key = 'newCount'; label = '新規' }
    else if (/ltv|付帯/i.test(message)) { key = 'ltv'; label = 'LTV' }
    const sorted = [...snap.staff].sort((a, b) => (b[key] as number) - (a[key] as number))
    const unit = key === 'idScore' ? 'pt' : '件'
    if (wantsWorst && !wantsRank) {
      const bottom = sorted.slice(-3).reverse().map(s => `${s.staffName}（${r1(s[key] as number)}${unit}）`).join('、')
      return `[support]${period}の${label}が伸び悩んでいるのは、${bottom}です。次はここを一緒に伸ばしましょう。`
    }
    const top = sorted.slice(0, 5).map((s, i) => `${i + 1}位 ${s.staffName}（${r1(s[key] as number)}${unit}）`).join('、')
    return `[proud]${period}の${label}ランキングは、${top}です。`
  }

  // --- 全体サマリー ---
  if (/合計|サマリー|全体|実績|成績|件数|何件|どう|やばい|調子/.test(message)) {
    return `[guidance]${period}の全体は、ID係数合計${r1(T.idScore)}pt、MNP${T.mnpCount}件（au${T.auMnp}/UQ${T.uqMnp}）、新規${T.newCount}件、セルアップ${T.cellupCount}件、LTV${T.ltv}件、イベント${T.eventCount}件、スタッフ${T.staffCount}名です。`
  }

  return null
}

/** スナップショットをLLMに渡すコンパクトなテキストに整形（分析質問用） */
export function formatSnapshot(snap: ShelaSnapshot): string {
  const T = snap.totals
  const lines: string[] = []
  lines.push(`【${snap.year}年${snap.month}月のSHELA実績データ（これを根拠に回答すること）】`)
  lines.push(`■全体: ID係数${r1(T.idScore)}pt / MNP${T.mnpCount}件(au${T.auMnp}/UQ${T.uqMnp}) / 新規${T.newCount}件 / CU${T.cellupCount}件 / LTV${T.ltv}件 / イベント${T.eventCount}件 / スタッフ${T.staffCount}名`)
  lines.push(`■付帯内訳: クレカ${T.creditCard} ゴールド${T.goldCard} じぶん銀行${T.jiBank} 保証${T.warranty} OTT${T.ott} 電気${T.electricity} ガス${T.gas} NW${T.network}`)
  lines.push('■スタッフ別ランキング(ID係数順):')
  snap.staff.slice(0, 20).forEach((s, i) => {
    lines.push(`${i + 1}位 ${s.staffName}: ID${r1(s.idScore)}pt, MNP${s.mnpCount}, 新規${s.newCount}, LTV${s.ltv}, ${s.eventCount}件`)
  })
  lines.push('■商流別: ' + snap.tiers.map(t => `${t.name}(ID${r1(t.idScore)}pt/MNP${t.mnpCount})`).join(' '))
  lines.push('■会場別トップ10: ' + snap.venues.slice(0, 10).map((v, i) => `${i + 1}.${v.name}(ID${r1(v.idScore)}pt/MNP${v.mnpCount})`).join(' '))
  return lines.join('\n')
}
