'use client'

import { useState, useEffect } from 'react'
import { getActiveNews, type News } from '@/lib/supabase/news'
import { Bell } from 'lucide-react'

export function NewsTicker() {
  const [news, setNews] = useState<News[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    console.log('[NewsTicker] コンポーネントマウント')
    loadNews()
    // 30秒ごとにニュースを再取得
    const interval = setInterval(loadNews, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (news.length === 0) return

    // 15秒ごとに次のニュースに切り替え
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length)
    }, 15000)

    return () => clearInterval(interval)
  }, [news.length])

  const loadNews = async () => {
    console.log('[NewsTicker] ニュースを読み込み中...')
    const activeNews = await getActiveNews()
    console.log('[NewsTicker] 取得したニュース数:', activeNews.length)
    console.log('[NewsTicker] ニュース詳細:', activeNews)
    setNews(activeNews)
  }

  console.log('[NewsTicker] レンダリング - ニュース数:', news.length)

  if (news.length === 0) {
    console.log('[NewsTicker] ニュースが0件のため非表示')
    return (
      <div className="w-full h-12 flex items-center justify-center" style={{ backgroundColor: '#FFB300' }}>
        <span style={{ color: '#22211A' }}>ニュースを読み込み中...</span>
      </div>
    )
  }

  const currentNews = news[currentIndex]
  console.log('[NewsTicker] 表示中のニュース:', currentNews)

  return (
    <div className="w-full overflow-hidden border-b" style={{ backgroundColor: '#FFB300', borderBottomColor: '#22211A' }}>
      <div className="flex items-center h-12 px-4">
        <div className="flex items-center gap-2 mr-4 flex-shrink-0">
          <Bell className="w-5 h-5" style={{ color: '#22211A' }} />
          <span className="font-bold text-sm whitespace-nowrap" style={{ color: '#22211A' }}>お知らせ</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            className="animate-scroll-left whitespace-nowrap inline-block"
            style={{ color: '#22211A' }}
          >
            <span className="font-medium text-sm">
              【{new Date(currentNews.display_until).toLocaleDateString('ja-JP')}まで】 {currentNews.content}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 15s linear infinite;
        }
      `}</style>
    </div>
  )
}
