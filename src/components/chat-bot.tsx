'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Search, Square, RotateCcw } from 'lucide-react'

type Emotion =
  | 'normal' | 'normal2' | 'support' | 'dance' | 'proud'
  | 'hero_pose' | 'guidance' | 'love' | 'shy' | 'surprised'
  | 'shocked' | 'doubt' | 'sulk' | 'angry' | 'disappointed'
  | 'sneaky_snack' | 'sleep'

const EMOTION_FILES: Record<Emotion, string> = {
  normal:       '/characters/SHELA_normal.png',
  normal2:      '/characters/SHELA_normal2.png',
  support:      '/characters/SHELA_support.png',
  dance:        '/characters/SHELA_dance.png',
  proud:        '/characters/SHELA_proud.png',
  hero_pose:    '/characters/SHELA_hero_pose.png',
  guidance:     '/characters/SHELA_guidance.png',
  love:         '/characters/SHELA_love.png',
  shy:          '/characters/SHELA_shy.png',
  surprised:    '/characters/SHELA_surprised.png',
  shocked:      '/characters/SHELA_shocked.png',
  doubt:        '/characters/SHELA_doubt.png',
  sulk:         '/characters/SHELA_sulk.png',
  angry:        '/characters/SHELA_angry.png',
  disappointed: '/characters/SHERL_dissapointed.png',
  sneaky_snack: '/characters/SHELA_sneaky_snack.png',
  sleep:        '/characters/SHELA_sleep.png',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  emotion?: Emotion
  searchUsed?: boolean
  suggestions?: string[]
}

// 起動時に出すジャンル別の質問候補
const STARTER_GROUPS: { genre: string; items: string[] }[] = [
  { genre: '📊 実績・進捗', items: ['今月の全体実績は？', '今週どう？', '今月の達成状況'] },
  { genre: '🏆 ランキング', items: ['今月のランキングは？', 'MNPランキング', '伸び悩んでるスタッフは？'] },
  { genre: '📍 会場・スタッフ', items: ['スタッフ別で見て', '一番良い会場は？', '会場別ランキング'] },
  { genre: '💰 商材・LTV', items: ['今月のMNP取れてる？', 'LTVどう？', 'クレカ取れてる？'] },
  { genre: '📚 ナレッジ検索', items: ['ドコモの予約番号', 'アハモのエラー対応', 'ワイモバの未納'] },
]

function parseResponse(raw: string): { emotion: Emotion; text: string } {
  const match = raw.match(/^\[([a-z0-9_]+)\]([\s\S]*)$/)
  if (match) {
    const tag = match[1] as Emotion
    if (tag in EMOTION_FILES) {
      return { emotion: tag, text: match[2].trim() }
    }
  }
  return { emotion: 'normal', text: raw.trim() }
}

// [表示名](URL) 形式のリンクをクリック可能なアンカーに変換して描画
function renderContent(text: string): React.ReactNode {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  const nodes: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    nodes.push(
      <a
        key={key++}
        href={m[2]}
        style={{ color: '#7ee0a3', textDecoration: 'underline', fontWeight: 600 }}
      >
        {m[1]}
      </a>
    )
    last = regex.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length > 0 ? nodes : text
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [emotion, setEmotion] = useState<Emotion>('normal')
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null)
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; width: number; height: number } | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // 操作があるたびに最終操作時刻を更新（待機表情のリセット用）
  const resetInactivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetInactivity()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, resetInactivity])

  // 待機中は表情を短い間隔で多彩に巡回させて“生きている”感を出す
  useEffect(() => {
    if (!isOpen) return
    const IDLE_POOL: Emotion[] = [
      'normal', 'normal2', 'support', 'proud', 'guidance', 'love',
      'shy', 'surprised', 'sneaky_snack', 'dance', 'hero_pose', 'doubt',
    ]
    const id = setInterval(() => {
      if (loading) return // 生成中は考え中の表情を維持
      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor < 6000) return // 直後は返答の表情を保持
      if (idleFor > 90000) { setEmotion('sleep'); return } // 長時間放置で居眠り
      setEmotion(prev => {
        let next = prev
        for (let i = 0; i < 6 && next === prev; i++) {
          next = IDLE_POOL[Math.floor(Math.random() * IDLE_POOL.length)]
        }
        return next
      })
    }, 6000)
    return () => clearInterval(id)
  }, [isOpen, loading])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const startDrag = (clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    dragStartRef.current = { mouseX: clientX, mouseY: clientY, elemX: rect.left, elemY: rect.top }
    setIsDragging(true)
  }

  const handleDragStart = (e: React.MouseEvent) => {
    startDrag(e.clientX, e.clientY)
    e.preventDefault()
  }

  const handleTouchDragStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    startDrag(touch.clientX, touch.clientY)
  }

  useEffect(() => {
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))
    const updatePosition = (clientX: number, clientY: number) => {
      if (!dragStartRef.current || !containerRef.current) return
      const w = containerRef.current.offsetWidth
      const h = containerRef.current.offsetHeight
      setPosition({
        x: clamp(dragStartRef.current.elemX + (clientX - dragStartRef.current.mouseX), 0, window.innerWidth - w),
        y: clamp(dragStartRef.current.elemY + (clientY - dragStartRef.current.mouseY), 0, window.innerHeight - h),
      })
    }
    const handleMouseMove = (e: MouseEvent) => updatePosition(e.clientX, e.clientY)
    const handleTouchMove = (e: TouchEvent) => {
      updatePosition(e.touches[0].clientX, e.touches[0].clientY)
      e.preventDefault()
    }
    const handleEnd = () => { setIsDragging(false); dragStartRef.current = null }
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging])

  const startResize = (clientX: number, clientY: number) => {
    const width = containerRef.current?.offsetWidth ?? (isMobile ? 280 : 360)
    const height = chatBoxRef.current?.offsetHeight ?? (isMobile ? 360 : 480)
    resizeStartRef.current = { mouseX: clientX, mouseY: clientY, width, height }
    setIsResizing(true)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startResize(e.clientX, e.clientY)
  }

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    startResize(e.touches[0].clientX, e.touches[0].clientY)
  }

  useEffect(() => {
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))
    const updateSize = (clientX: number, clientY: number) => {
      if (!resizeStartRef.current) return
      const dx = clientX - resizeStartRef.current.mouseX
      const dy = clientY - resizeStartRef.current.mouseY
      // 左上ハンドル: 左へドラッグで幅拡大・上へドラッグで高さ拡大
      setSize({
        width: clamp(resizeStartRef.current.width - dx, 240, window.innerWidth - 16),
        height: clamp(resizeStartRef.current.height - dy, 200, window.innerHeight - 60),
      })
    }
    const handleMouseMove = (e: MouseEvent) => updateSize(e.clientX, e.clientY)
    const handleTouchMove = (e: TouchEvent) => {
      updateSize(e.touches[0].clientX, e.touches[0].clientY)
      e.preventDefault()
    }
    const handleEnd = () => { setIsResizing(false); resizeStartRef.current = null }
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isResizing])

  // 生成の停止（考え込み中・タイピング中のキャンセル）
  const stopGeneration = () => {
    cancelledRef.current = true
    abortRef.current?.abort()
    setLoading(false)
    setEmotion('normal2')
    resetInactivity()
  }

  const sendMessage = async (overrideText?: string) => {
    const text0 = (overrideText ?? input).trim()
    if (!text0 || loading) return

    const userMsg: Message = { role: 'user', content: text0 }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setEmotion('normal2')
    resetInactivity()

    cancelledRef.current = false
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      })

      const data = await res.json()
      if (cancelledRef.current) return // 応答到着前に停止された

      const { emotion: e, text } = parseResponse(data.content)
      setEmotion(e)
      setLoading(false)

      // タイピング風演出: 空の枠を追加してから1文字ずつ表示（停止で中断）
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        emotion: e,
        searchUsed: data.searchUsed,
      }])
      for (let i = 1; i <= text.length; i++) {
        if (cancelledRef.current) break
        await new Promise(r => setTimeout(r, 18))
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: text.slice(0, i) }
          return updated
        })
      }
      // 「これかな？」候補があれば付与
      if (!cancelledRef.current && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], suggestions: data.suggestions }
          return updated
        })
      }
    } catch (err) {
      setLoading(false)
      // ユーザーが停止した場合はエラー表示しない
      if (cancelledRef.current || (err as Error)?.name === 'AbortError') return
      setEmotion('disappointed')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度試してください。',
        emotion: 'disappointed',
      }])
    } finally {
      abortRef.current = null
      resetInactivity()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendMessage()
    }
    resetInactivity()
  }

  return (
    <>
      {/* フローティングボタン（閉じているとき） */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-50 transition-transform hover:scale-110"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            // モバイルは下部ナビ(高さ64px)、PCは余白を避けて配置
            bottom: isMobile ? '76px' : '28px',
            right: isMobile ? '12px' : '28px',
          }}
          aria-label="SHELAチャット"
        >
          <img
            src="/characters/SHELA_normal.png"
            alt="SHELA"
            style={{
              width: isMobile ? '56px' : '80px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
            }}
          />
        </button>
      )}

      {/* チャットウィンドウ（キャラクター込みの縦並び） */}
      {isOpen && (
        <div
          ref={containerRef}
          className="fixed z-50 flex flex-col items-center"
          style={{
            width: size ? `${size.width}px` : (isMobile ? 'min(280px, calc(100vw - 16px))' : 'min(360px, calc(100vw - 16px))'),
            ...(position ? { left: position.x, top: position.y } : { bottom: isMobile ? '72px' : '16px', right: '8px' }),
            cursor: isDragging ? 'grabbing' : 'default',
            userSelect: 'none',
          }}
        >
          {/* キャラクター（チャットボックスの上に浮かぶ・ドラッグ可） */}
          <img
            key={emotion}
            src={EMOTION_FILES[emotion]}
            alt={`SHELA ${emotion}`}
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchDragStart}
            style={{
              height: isMobile ? '90px' : '140px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
              transition: 'opacity 0.2s ease',
              zIndex: 51,
              position: 'relative',
              marginBottom: '-8px',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
          />

          {/* チャットボックス本体 */}
          <div
            ref={chatBoxRef}
            className="w-full flex flex-col rounded-2xl overflow-hidden"
            style={{
              position: 'relative',
              height: size ? `${size.height}px` : (isMobile ? 'min(360px, calc(100dvh - 210px))' : 'min(480px, calc(100dvh - 180px))'),
              backgroundColor: '#1a1a16',
              border: '1px solid #2a2a20',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,191,121,0.1)',
              zIndex: 50,
            }}
          >
            {/* リサイズハンドル（左上） */}
            <div
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeTouchStart}
              title="ドラッグでサイズ変更"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '22px',
                height: '22px',
                cursor: 'nwse-resize',
                zIndex: 60,
                touchAction: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
                <path d="M11 1 L1 11 M6 1 L1 6 M11 6 L6 11" stroke="#4abf79" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          {/* ヘッダー（ドラッグハンドル） */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: '#22211A', borderBottom: '1px solid #2a2a20', cursor: 'grab', touchAction: 'none' }}
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchDragStart}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#4abf79' }} />
              <span className="font-bold text-sm" style={{ color: '#FFB300', fontFamily: 'var(--font-orbitron)' }}>
                SHELA
              </span>
              <span className="text-xs" style={{ color: '#4abf79', opacity: 0.8 }}>AI アシスタント</span>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => { stopGeneration(); setMessages([]) }}
                  className="flex items-center gap-0.5 transition-opacity text-xs px-1 rounded opacity-80 hover:opacity-100"
                  style={{ color: '#7ee0a3' }}
                  title="最初の選択肢に戻る"
                >
                  <RotateCcw className="w-3 h-3" />最初へ
                </button>
              )}
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => { setPosition(null); setSize(null) }}
                className="transition-opacity text-xs px-1 rounded"
                style={{
                  color: '#4abf79',
                  opacity: (position || size) ? 1 : 0.3,
                  cursor: (position || size) ? 'pointer' : 'default',
                }}
                title="位置とサイズを元に戻す"
              >
                ↙ 戻す
              </button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setIsOpen(false)}
                className="opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: '#e0e0d8' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* メッセージエリア */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
            style={{ backgroundColor: '#1a1a16' }}
          >
            {messages.length === 0 && (
              <div className="py-3 space-y-3">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium" style={{ color: '#4abf79' }}>こんにちは！SHELAです。</p>
                  <p className="text-xs" style={{ color: '#888' }}>下から選ぶか、そのまま入力してもOKです。</p>
                </div>
                {STARTER_GROUPS.map(group => (
                  <div key={group.genre} className="space-y-1.5">
                    <p className="text-xs font-semibold" style={{ color: '#7ee0a3' }}>{group.genre}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map(item => (
                        <button
                          key={item}
                          onClick={() => sendMessage(item)}
                          className="px-2.5 py-1 rounded-full text-xs transition-colors"
                          style={{ backgroundColor: '#2a2a20', color: '#d8d8cf', border: '1px solid #3a3a30' }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 text-sm leading-relaxed"
                  style={{
                    backgroundColor: msg.role === 'user' ? '#FFB300' : '#2a2a20',
                    color: msg.role === 'user' ? '#22211A' : '#e0e0d8',
                    borderRadius: msg.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                  }}
                >
                  {renderContent(msg.content)}
                  {msg.searchUsed && msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-1 opacity-50">
                      <Search className="w-3 h-3" />
                      <span className="text-xs">Web検索を使用</span>
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestions.map(sug => (
                        <button
                          key={sug}
                          onClick={() => sendMessage(sug)}
                          className="px-2.5 py-1 rounded-full text-xs transition-colors"
                          style={{ backgroundColor: '#1a1a16', color: '#7ee0a3', border: '1px solid #4abf79' }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-2 text-sm rounded-2xl"
                  style={{ backgroundColor: '#2a2a20', color: '#4abf79', borderRadius: '16px 16px 16px 4px' }}
                >
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div
            className="px-3 py-3 flex-shrink-0"
            style={{ backgroundColor: '#22211A', borderTop: '1px solid #2a2a20' }}
          >
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); resetInactivity() }}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                disabled={loading}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm outline-none disabled:opacity-50"
                style={{
                  backgroundColor: '#2a2a20',
                  color: '#e0e0d8',
                  border: '1px solid #3a3a30',
                }}
              />
              {loading ? (
                <button
                  onClick={stopGeneration}
                  className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#e05555', color: '#fff' }}
                  title="停止"
                >
                  <Square className="w-4 h-4" fill="#fff" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#4abf79', color: '#22211A' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-center mt-1" style={{ color: '#444', fontSize: '10px' }}>
              {loading ? '生成中… 停止ボタンでキャンセルできます' : 'Enter で送信 · Shift+Enter で改行'}
            </p>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
