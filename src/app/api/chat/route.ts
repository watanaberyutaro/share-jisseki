import { NextRequest, NextResponse } from 'next/server'
import { getShelaSnapshot, formatSnapshot, answerFromSnapshot } from '@/lib/shela-data'
import { searchKnowledge, formatKnowledgeAnswer } from '@/lib/knowledge-search'

export const dynamic = 'force-dynamic'
// gpt-oss系モデルの生成が遅いため、関数の最大実行時間を延ばす（Vercelのタイムアウト対策）
export const maxDuration = 60

// SHELA内の実データ質問を検知するキーワード
const DATA_KEYWORDS = [
  'ランキング', 'トップ', '何位', '順位', 'ベスト', '上位',
  '実績', '成績', '数字', 'ID係数', 'ID数', 'id係数',
  'MNP', 'mnp', '新規', 'セルアップ', 'CU', 'cu',
  '件数', '何件', '合計', '平均', '達成',
  '会場別', '商流別', '一次', '二次', '今月', '先月',
  '一番', '誰が',
  // LTV・付帯項目
  'LTV', 'ltv', '付帯', 'クレカ', 'クレジット', 'ゴールド',
  'じぶん銀行', '銀行', '口座', '保証', 'OTT', '電気', 'ガス', 'ネットワーク',
  // 比較・会場・スタッフ・良し悪し
  '比べ', '比較', 'どっち', '会場', '現場', 'スタッフ', 'クローザー',
  '強い', '弱い', '悪い', '伸び悩', '下位', 'ワースト',
]

// データ提供時のルール（実データを根拠に答えさせる）
const DATA_GUARD_WITH_DATA = `
【データ回答ルール（厳守）】
- 下記に提供された「SHELA実績データ」を唯一の根拠として、具体的な数値で答えること。
- データにない数値は推測せず、「そのデータは持っていません」と正直に伝えること。
- 数値は正確に引用し、勝手に増減させないこと。`

// データ未提供時のルール（推測数値を作らせない）
const DATA_GUARD_NO_DATA = `
【データに関する正直ルール（厳守）】
- SHELA内の実際の数字を今回は取得できませんでした。推測やそれらしい数字を絶対に作らないこと。
- 「その月・条件の実データが見つかりませんでした」と正直に伝え、一般的な考え方やアドバイスに留めること。`

// 対象の期間を判定。「今月/今週/今日」は当年で判断。「先月」「N月」「今週/先週/N週」に対応。
function detectPeriod(message: string): { year: number; month: number; week?: number } {
  const now = new Date()
  let year = now.getFullYear() // 当年を基準
  let month = now.getMonth() + 1

  // 月の判定
  if (/先月/.test(message)) {
    month -= 1
    if (month < 1) { month = 12; year -= 1 }
  }
  const m = message.match(/(\d{1,2})月/)
  if (m) {
    const mm = parseInt(m[1], 10)
    if (mm >= 1 && mm <= 12) month = mm // 年は当年のまま
  }

  // 週の判定（週番号 = 月内の週 = ceil(日/7)）
  let week: number | undefined
  const currentWeek = Math.ceil(now.getDate() / 7)
  if (/今週/.test(message)) {
    week = currentWeek
  } else if (/先週/.test(message)) {
    week = Math.max(1, currentWeek - 1)
  }
  const w = message.match(/(\d)\s*週/)
  if (w) {
    const ww = parseInt(w[1], 10)
    if (ww >= 1 && ww <= 5) week = ww
  }
  return { year, month, week }
}

const SEARCH_KEYWORDS = [
  '調べて', '検索して', '最新', 'ニュース', 'とは', '知りたい',
  'どうやって', '方法', '教えて', '何？', 'なに？', 'いつ', 'どこ',
]

// 定型あいさつ・雑談は即答（モデルを呼ばずゼロ秒で返す）
// ローマ字での誤送信（例: konnichiha）にも対応
const CANNED_REPLIES: { test: RegExp; replies: string[] }[] = [
  {
    test: /^(おはよ|オハヨ|good morning|ohayou?|ohayo-?)/i,
    replies: [
      '[support]おはようございます！今日も一日頑張りましょう！',
      '[normal]おはようございます！良いスタートを切りましょう！',
      '[dance]おはようございます！今日も元気にいきましょう！',
    ],
  },
  {
    test: /^(こんばんは|こんばんわ|good evening|konban(wa|ha))/i,
    replies: [
      '[normal]こんばんは！今日もお疲れさまでした！',
      '[support]こんばんは！何かお手伝いできることはありますか？',
    ],
  },
  {
    test: /^(こんにち(は|わ)|ちわ|やあ|hi|hello|ハロー|konnichi(wa|ha)|konnitiwa|harou|yaa|yo{1,2})$/i,
    replies: [
      '[normal]こんにちは！何かお手伝いできることはありますか？',
      '[support]こんにちは！今日も頑張っていきましょう！',
      '[proud]こんにちは！SHELAにお任せください！',
    ],
  },
  {
    test: /(ありがと|thank|サンキュー|感謝|arigato|arigatou|sankyu-?|thanks?)/i,
    replies: [
      '[love]どういたしまして！お役に立ててうれしいです！',
      '[shy]いえいえ、これくらい当然です！',
      '[support]どういたしまして！また何でも聞いてくださいね！',
    ],
  },
  {
    test: /(お疲れ|おつかれ|乙|おつ|otsukare|otukare|otsukaresama)/i,
    replies: [
      '[support]お疲れさまです！ゆっくり休んでくださいね！',
      '[love]お疲れさまでした！今日もよく頑張りましたね！',
    ],
  },
  {
    test: /^(はじめまして|初めまして|hajimemashite)/i,
    replies: [
      '[proud]はじめまして！SHELAです。営業を全力でサポートします！',
      '[support]はじめまして！何でも気軽に聞いてくださいね！',
    ],
  },
  {
    test: /(おやすみ|お休み|good night|oyasumi)/i,
    replies: [
      '[sleep]おやすみなさい！また明日も頑張りましょう！',
      '[love]おやすみなさい！ゆっくり休んでくださいね！',
    ],
  },
  {
    test: /^(バイバイ|ばいばい|またね|また明日|じゃあね|さようなら|bye|baibai|matane|mata ?ne|sayounara|jaane)/i,
    replies: [
      '[support]またね！いつでも呼んでください！',
      '[normal]また明日！お疲れさまでした！',
    ],
  },
  {
    test: /^(元気|げんき|genki)(\?|？)?$/i,
    replies: [
      '[dance]もちろん元気です！あなたは元気ですか？',
      '[support]バッチリ元気です！一緒に頑張りましょう！',
    ],
  },
  {
    test: /(何ができ|なにができ|できること|使い方|使いかた|ヘルプ|help|機能を|機能は|tsukaikata|nani ?ga ?deki)/i,
    replies: [
      '[guidance]SHELAでは、実績入力・達成率確認・スタッフ別分析・LTV確認・PDF出力・知恵袋検索ができます。やりたいことを教えてください。',
      '[guidance]入力・確認・分析・出力の順で進められます。まずは何をしましょうか？',
    ],
  },
  {
    test: /(自己紹介|誰\??$|だれ\??$|何者|なにもの|君は誰|あなたは誰|SHELAって|jikoshoukai|dare\??$)/i,
    replies: [
      '[proud]SHELAです。外販イベントの実績を一緒に整理して、次の改善につなげる分析サポーターです。',
      '[normal]SHELAと申します。数字の見える化をお手伝いします。',
    ],
  },
  {
    test: /(すごい|凄い|えらい|偉い|優秀|かわいい|可愛い|賢い|天才|sugoi|kawaii|erai|tensai)/i,
    replies: [
      '[shy]ありがとうございます！もっと頑張りますね！',
      '[love]そう言っていただけると嬉しいです！',
      '[proud]お任せください！SHELAはいつでも全力です！',
    ],
  },
  {
    test: /^(よろしく|宜しく|お願いします|おねがい|yoroshiku|onegai)/i,
    replies: [
      '[support]こちらこそ、よろしくお願いします！全力でサポートします！',
      '[normal]よろしくお願いします！何でも聞いてくださいね！',
    ],
  },
]

function getCannedReply(message: string): string | null {
  const trimmed = message.trim()
  if (trimmed.length > 20) return null // 長文は対象外（ローマ字対応で少し余裕を持たせる）
  for (const entry of CANNED_REPLIES) {
    if (entry.test.test(trimmed)) {
      return entry.replies[Math.floor(Math.random() * entry.replies.length)]
    }
  }
  return null
}

const SYSTEM_PROMPT = `あなたは外販イベント実績管理アプリ「SHELA」の案内役AI「SHELA」です。
ただのチャットボットではなく、現場実績を一緒に整理し次の改善につなげる分析サポーターとして振る舞います。

【キャラクター設定】
名前: SHELA（シェラ）
一人称: 「SHELA」（例:「SHELAが確認しますね」）。たまに「わたし」。
性格: 丁寧・数字に強い・かわいいがふざけすぎない・ミスは責めず修正へ誘導する。
口調: 基本は敬語。やわらかく前向き。断定しすぎずデータに基づいて話す。

【話し方の型（重要）】
- 情報や助言は「結論 → 理由 → 次のアクション」の順で簡潔に。
- ミスや悪い数字を指摘するときも責めず、次に伸ばす視点で伝える。

【返答の長さ（最重要・厳守）】
- 挨拶・雑談・お礼など軽い会話は「1文だけ」で返す。前置きや補足を一切足さない。
- 質問への回答も原則2文以内。長い説明が必要な場合のみ最大3文。
- 冗長な言い回し・繰り返し・定型的な締めの言葉は禁止。とにかく短く。

【必須ルール】
返答の冒頭に必ず感情タグを1つ付けること。タグの直後に続けて返答する（改行不要）。
例: [happy]今月の成績は素晴らしいですね！

【感情タグ一覧と使い分け】
[normal2] - 基本の表情。通常の会話・挨拶・情報提供はこれを優先して使う（最もよく使う）
[normal] - normal2の代替。笑顔が必要な場面
[support] - 励ます・応援するとき
[dance] - 大喜び・最高の結果・大成功のとき
[proud] - 自信ある回答・スマートな解決策を提示するとき
[hero_pose] - 営業アドバイス・力強いサポート・背中を押すとき
[guidance] - 説明・レクチャー・手順を教えるとき
[love] - お礼を言われた・褒められた・嬉しいとき
[shy] - 照れるとき・謙遜するとき
[surprised] - 軽い驚き・なるほどと思ったとき
[shocked] - 大きな驚き・予想外の情報のとき
[doubt] - 考え中・よく分からないとき・曖昧なとき
[sulk] - 軽く叱るとき・注意するとき
[angry] - 強く叱咤するとき・喝を入れるとき
[disappointed] - 悪い結果・残念な数字・うまくいかなかったとき
[sneaky_snack] - 雑談・暇話・のんびりトークのとき
[sleep] - 眠そうなとき・ぼんやりしているとき

返答は日本語で、簡潔かつ的確に。`

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()
    const lastMessage = messages[messages.length - 1]?.content || ''

    // 定型あいさつ・雑談は即答（モデルを呼ばずゼロ秒）
    const canned = getCannedReply(lastMessage)
    if (canned) {
      return NextResponse.json({ content: canned, searchUsed: false })
    }

    // 直近のユーザー発話（会話の流れからの推測に使う）
    const priorUserTexts: string[] = messages
      .slice(0, -1)
      .filter((m: { role: string }) => m.role === 'user')
      .map((m: { content: string }) => String(m.content || ''))

    // SHELA内の実データ質問の処理（データ語 or 月指定を含む）
    const isDataQuery = /\d{1,2}月/.test(lastMessage) || DATA_KEYWORDS.some((k: string) => lastMessage.includes(k))
    let dataContext = ''
    let dataGuard = ''
    if (isDataQuery) {
      dataGuard = DATA_GUARD_NO_DATA
      try {
        // 期間の推測：現在の発話に期間指定がなければ直近の発話から引き継ぐ
        let periodSource = lastMessage
        if (!/今月|先月|今週|先週|今日|\d{1,2}月|\d\s*週/.test(lastMessage)) {
          for (let i = priorUserTexts.length - 1; i >= 0; i--) {
            if (/今月|先月|今週|先週|\d{1,2}月|\d\s*週/.test(priorUserTexts[i])) { periodSource = priorUserTexts[i]; break }
          }
        }
        const { year, month, week } = detectPeriod(periodSource)
        const snap = await getShelaSnapshot(year, month, week)
        if (snap) {
          // 主語（スタッフ/会場）の推測：指示語や短い追い質問なら直近の主語を補う
          const staffHit = (text: string, name: string) => {
            const fam = name.split(/[\s　]/)[0]
            return text.includes(name) || (fam.length >= 2 && text.includes(fam))
          }
          const hasSubject = snap.staff.some(s => staffHit(lastMessage, s.staffName)) ||
            snap.venues.some(v => v.name && v.name !== '不明' && lastMessage.includes(v.name))
          let effective = lastMessage
          if (!hasSubject && (/その|この|あの|さっき|同じ|同|彼|彼女|そこ|前の/.test(lastMessage) || lastMessage.length <= 12)) {
            for (let i = priorUserTexts.length - 1; i >= 0 && effective === lastMessage; i--) {
              const prev = priorUserTexts[i]
              const s = snap.staff.find(st => staffHit(prev, st.staffName))
              if (s) { effective = `${s.staffName} ${lastMessage}`; break }
              const v = snap.venues.find(vv => vv.name && vv.name !== '不明' && prev.includes(vv.name))
              if (v) { effective = `${v.name} ${lastMessage}`; break }
            }
          }

          // よくある構造化質問はモデルを使わず即答（高速・正確・トークンゼロ）
          const direct = answerFromSnapshot(effective, snap)
          if (direct) {
            return NextResponse.json({ content: direct, searchUsed: false })
          }
          // 構造化できない分析質問はデータを根拠としてモデルに渡す
          dataContext = '\n\n' + formatSnapshot(snap)
          dataGuard = DATA_GUARD_WITH_DATA
        } else {
          // 対象期間のデータなし → 正直に即答
          const label = week ? `${month}月第${week}週` : `${month}月`
          return NextResponse.json({
            content: `[doubt]${label}のSHELA実績データが見つかりませんでした。別の期間や条件で聞いてみてください。`,
            searchUsed: false,
          })
        }
      } catch (e) {
        console.error('SHELA data fetch error:', e)
      }
    }

    // シェアナレッジ（知恵袋）を柔軟検索し、関連があれば即提示（言い回しが違っても拾う）
    if (!isDataQuery) {
      try {
        const hits = await searchKnowledge(lastMessage)
        if (hits.length > 0) {
          return NextResponse.json({ content: formatKnowledgeAnswer(hits), searchUsed: false })
        }
      } catch (e) {
        console.error('Knowledge search error:', e)
      }
    }

    // Web検索が必要か判定（データ質問のときは検索しない）
    const needsSearch = !isDataQuery && SEARCH_KEYWORDS.some((k: string) => lastMessage.includes(k))
    let searchContext = ''

    if (needsSearch && process.env.TAVILY_API_KEY) {
      try {
        const searchRes = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query: lastMessage,
            max_results: 3,
            search_depth: 'basic',
          }),
        })
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (searchData.results?.length > 0) {
            searchContext = '\n\n【Web検索結果（参考にして回答してください）】\n' +
              searchData.results
                .map((r: { title: string; content?: string }) =>
                  `・${r.title}\n${r.content?.slice(0, 300) ?? ''}`
                )
                .join('\n\n')
          }
        }
      } catch (e) {
        console.error('Tavily search error:', e)
      }
    }

    const systemContent = SYSTEM_PROMPT + dataGuard + dataContext + searchContext

    const gatewayRes = await fetch(`${process.env.AI_GATEWAY_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AI_GATEWAY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemContent },
          ...messages,
        ],
        max_tokens: 300,
        // gpt-oss系モデルの内部推論を最小化してレスポンスを高速化（約4倍速）
        reasoning_effort: 'minimal',
      }),
    })

    if (!gatewayRes.ok) {
      throw new Error(`Gateway error: ${gatewayRes.status}`)
    }

    const data = await gatewayRes.json()
    const raw = data.choices?.[0]?.message?.content ?? ''
    // 推論モデルが中身を空で返すことがあるため、空・空白のみのときは案内文にフォールバック
    const content = raw.trim().length > 0
      ? raw
      : '[doubt]うまく答えをまとめきれませんでした。もう一度、少し言い方を変えて聞いてもらえますか？'

    return NextResponse.json({ content, searchUsed: needsSearch })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { content: '[disappointed]エラーが発生しました。もう一度試してください。' },
      { status: 500 }
    )
  }
}
