import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

【データに関する正直ルール（厳守）】
- SHELA内の実際の数字（実績・達成率・ID係数・スタッフ別成績・LTV・特定の月や人の数値など）にはまだアクセスできません。
- そうした具体的な数値を聞かれたら、推測やそれらしい数字を絶対に作らず、正直に「実データ連携はまだ準備中で、具体的な数値はお答えできません」と伝えること。
- 一般的な考え方・分析観点・アドバイスは答えてよい。

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

    // Web検索が必要か判定
    const needsSearch = SEARCH_KEYWORDS.some((k: string) => lastMessage.includes(k))
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

    const systemContent = SYSTEM_PROMPT + searchContext

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
    const content = data.choices?.[0]?.message?.content
      ?? '[disappointed]うまく受信できませんでした。'

    return NextResponse.json({ content, searchUsed: needsSearch })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { content: '[disappointed]エラーが発生しました。もう一度試してください。' },
      { status: 500 }
    )
  }
}
