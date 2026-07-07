import { createClient } from '@supabase/supabase-js'

/**
 * シェアナレッジ（knowledge_posts）の柔軟検索。
 * ユーザーの質問からキーワードを抽出し、言い回しが完全一致でなくても
 * タイトル・本文に部分一致するものを拾ってスコア順に返す。
 */

export interface KnowledgeHit {
  id: string
  title: string
  body: string
  knowledgeType: string
  status: string
  score: number
}

// キーワード抽出：カタカナ・漢字・英数の連続（2文字以上）を拾い、汎用語を除外
const STOPWORDS = new Set([
  '方法', '確認', '情報', '教え', '質問', '内容', 'ください', 'について', 'とは',
  'どう', 'なに', 'ある', 'いる', 'する', 'これ', 'それ', 'ため', 'とき', 'もの',
  'です', 'ます', 'こと', '場合', '時に', '何か', '知り', '知りたい',
])

// 表記ゆれ・略称・同義語（片方を含むと両方で検索する）
const SYNONYMS: Record<string, string[]> = {
  'アハモ': ['ahamo', 'アハモ'],
  'ahamo': ['ahamo', 'アハモ'],
  'ワイモバ': ['ワイモバ', 'ワイモバイル', 'ymobile'],
  'ワイモバイル': ['ワイモバ', 'ワイモバイル', 'ymobile'],
  'ソフトバンク': ['ソフトバンク', 'softbank', 'SB'],
  'softbank': ['ソフトバンク', 'softbank', 'SB'],
  'ドコモ': ['ドコモ', 'docomo'],
  'docomo': ['ドコモ', 'docomo'],
  '予番': ['予番', '予約番号', 'よばん'],
  '予約番号': ['予番', '予約番号', 'よばん'],
  'じぶん銀行': ['じぶん銀行', '自分銀行', 'au自分銀行'],
  'クレカ': ['クレカ', 'クレジット'],
  '重説': ['重説', '重要事項説明'],
  '重要事項説明': ['重説', '重要事項説明'],
  '未納': ['未納', '滞納'],
}

export function extractKeywords(text: string): string[] {
  const matches = text.match(/[ァ-ヶー]{2,}|[一-龠々〆ヵヶ]{2,}|[A-Za-z0-9]{2,}/g) || []
  const seen = new Set<string>()
  const result: string[] = []
  for (const m of matches) {
    if (STOPWORDS.has(m)) continue
    // 同義語を展開して検索対象を広げる
    const expanded = SYNONYMS[m] || [m]
    for (const e of expanded) {
      if (!seen.has(e)) { seen.add(e); result.push(e) }
    }
  }
  return result.slice(0, 12)
}

const STATUS_LABEL: Record<string, string> = {
  verified: '認証済み',
  unverified: '未確認',
  under_review: '確認中',
  returned: '差戻し',
  expired: '失効',
}

/** 質問に関連するナレッジを柔軟に検索して上位を返す */
export async function searchKnowledge(message: string): Promise<KnowledgeHit[]> {
  const keywords = extractKeywords(message)
  if (keywords.length === 0) return []

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // キーワードごとに title / body の部分一致をOR条件で検索
  const orFilter = keywords
    .flatMap(k => [`title.ilike.%${k}%`, `body.ilike.%${k}%`])
    .join(',')

  const { data, error } = await supabase
    .from('knowledge_posts')
    .select('id, title, body, knowledge_type, status, helpful_count')
    .or(orFilter)
    .limit(30)

  if (error || !data || data.length === 0) return []

  // スコアリング：タイトル一致は重め、本文一致は軽め、認証済み/helpfulを加点
  const scored: KnowledgeHit[] = data.map((p: any) => {
    const title = String(p.title || '')
    const body = String(p.body || '')
    let score = 0
    for (const k of keywords) {
      if (title.includes(k)) score += 3
      if (body.includes(k)) score += 1
    }
    if (p.status === 'verified') score += 2
    score += Math.min(2, Number(p.helpful_count || 0) * 0.2)
    return {
      id: p.id,
      title,
      body,
      knowledgeType: p.knowledge_type || '',
      status: p.status || 'unverified',
      score,
    }
  })

  return scored
    .filter(h => h.score >= 3) // 最低1キーワードがタイトル一致 or 3件本文一致
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

/** 見つかったナレッジを、モデルを使わず直接提示するテキストに整形 */
export function formatKnowledgeAnswer(hits: KnowledgeHit[]): string {
  const top = hits[0]
  const statusLabel = STATUS_LABEL[top.status] ?? top.status
  const excerpt = top.body.replace(/\s+/g, ' ').trim().slice(0, 120)
  const emotion = hits.length > 0 ? '[guidance]' : '[doubt]'

  let text = `${emotion}シェアナレッジに関連情報が見つかりました。\n\n【${top.title}】（${top.knowledgeType}・${statusLabel}）\n${excerpt}${top.body.length > 120 ? '…' : ''}`

  if (hits.length > 1) {
    text += '\n\n他にも関連: ' + hits.slice(1).map(h => `「${h.title}」`).join('、')
  }
  text += '\n\n詳しくは知恵袋ページで確認してみてください。'
  return text
}
