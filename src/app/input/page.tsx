'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MagneticDots } from '@/components/MagneticDots'

// フォームを遅延ロード（初期表示を高速化）
const EnhancedPerformanceFormV2 = dynamic(
  () => import('@/components/enhanced-performance-form-v2').then((mod) => ({ default: mod.EnhancedPerformanceFormV2 })),
  {
    ssr: false,
    loading: () => (
      <div className="glass rounded-xl p-8 border text-center" style={{ borderColor: '#22211A' }}>
        <div className="animate-pulse">フォームを読み込んでいます...</div>
      </div>
    )
  }
)

export default function InputPage() {
  const router = useRouter()
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [displayedDescription, setDisplayedDescription] = useState('')
  const [isReady, setIsReady] = useState(false)
  const fullTitle = '実績入力'
  const fullDescription = 'イベントの詳細情報と実績データを入力してください'

  // ログインチェック
  useEffect(() => {
    console.log('[InputPage] ページマウント - ログインチェック開始')
    const userName = localStorage.getItem('userName')
    const userRole = localStorage.getItem('userRole')
    console.log('[InputPage] userName:', userName, 'userRole:', userRole)

    if (!userName && userRole !== 'admin') {
      console.log('[InputPage] ユーザー名が見つかりません。ログインページにリダイレクトします')
      router.push('/login')
    } else {
      console.log('[InputPage] ログイン確認完了。フォームを表示します')
      setIsReady(true)
    }
  }, [router])

  useEffect(() => {
    let titleIndex = 0
    let descIndex = 0
    let titleComplete = false

    const typeTitle = () => {
      if (titleIndex <= fullTitle.length) {
        setDisplayedTitle(fullTitle.slice(0, titleIndex))
        titleIndex++
      } else {
        titleComplete = true
      }
    }

    const typeDescription = () => {
      if (descIndex <= fullDescription.length) {
        setDisplayedDescription(fullDescription.slice(0, descIndex))
        descIndex++
      }
    }

    const interval = setInterval(() => {
      if (!titleComplete) {
        typeTitle()
      } else {
        typeDescription()
        if (descIndex > fullDescription.length) {
          clearInterval(interval)
        }
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6 pb-20" style={{ paddingTop: '5rem' }}>
      <MagneticDots />
      <div className="fade-in">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2" style={{ color: '#22211A' }}>
            {displayedTitle}
          </h1>
          <p className="text-sm md:text-lg leading-relaxed min-h-[24px] md:min-h-[32px]" style={{ color: '#22211A' }}>
            {displayedDescription}
            {displayedDescription && <span className="animate-cursor-blink">|</span>}
          </p>
        </div>

        <Suspense fallback={
          <div className="glass rounded-xl p-8 border text-center" style={{ borderColor: '#22211A' }}>
            <div className="animate-pulse">フォームを読み込んでいます...</div>
          </div>
        }>
          {isReady ? (
            <EnhancedPerformanceFormV2 />
          ) : (
            <div className="glass rounded-xl p-8 border text-center" style={{ borderColor: '#22211A' }}>
              <div className="animate-pulse">認証を確認しています...</div>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  )
}