'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Search } from 'lucide-react'

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
}

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
  const inactivityRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null)
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; width: number; height: number } | null>(null)

  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(() => {
      setEmotion('sleep')
    }, 30000)
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetInactivity()
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
  }, [isOpen, resetInactivity])

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

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setEmotion('normal2')
    resetInactivity()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      const { emotion: e, text } = parseResponse(data.content)
      setEmotion(e)
      setLoading(false)

      // タイピング風演出: 空の枠を追加してから1文字ずつ表示
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        emotion: e,
        searchUsed: data.searchUsed,
      }])
      for (let i = 1; i <= text.length; i++) {
        await new Promise(r => setTimeout(r, 18))
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: text.slice(0, i) }
          return updated
        })
      }
    } catch {
      setEmotion('disappointed')
      setLoading(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度試してください。',
        emotion: 'disappointed',
      }])
    } finally {
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
            bottom: isMobile ? '16px' : '24px',
            right: isMobile ? '12px' : '24px',
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
            ...(position ? { left: position.x, top: position.y } : { bottom: isMobile ? '12px' : '16px', right: isMobile ? '8px' : '8px' }),
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
              height: size ? `${size.height}px` : (isMobile ? 'min(360px, calc(100dvh - 140px))' : 'min(480px, calc(100dvh - 180px))'),
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
              <div className="text-center py-6 space-y-1">
                <p className="text-sm font-medium" style={{ color: '#4abf79' }}>こんにちは！SHELAです。</p>
                <p className="text-xs" style={{ color: '#666' }}>なんでも聞いてください！</p>
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
                  {msg.content}
                  {msg.searchUsed && msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-1 opacity-50">
                      <Search className="w-3 h-3" />
                      <span className="text-xs">Web検索を使用</span>
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
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); resetInactivity() }}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none disabled:opacity-50"
                style={{
                  backgroundColor: '#2a2a20',
                  color: '#e0e0d8',
                  border: '1px solid #3a3a30',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-3 py-2 rounded-xl disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: '#4abf79', color: '#22211A' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center mt-1" style={{ color: '#444', fontSize: '10px' }}>
              Enter で送信 · Shift+Enter で改行
            </p>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
