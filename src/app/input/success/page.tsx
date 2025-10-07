'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Home, Eye, Sparkles, Award } from 'lucide-react'

export default function InputSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showContent, setShowContent] = useState(false)
  const [showButtons, setShowButtons] = useState(false)
  
  // URLパラメータから保存されたイベントIDを取得
  const eventId = searchParams.get('eventId')
  const venue = searchParams.get('venue')
  const staffCount = searchParams.get('staffCount')

  useEffect(() => {
    // アニメーションの段階的表示
    const timer1 = setTimeout(() => setShowContent(true), 500)
    const timer2 = setTimeout(() => setShowButtons(true), 1500)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-success/5 via-background to-primary/5 flex items-center justify-center p-4">
      {/* Background Animation Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-success/20 rounded-full animate-ping animation-delay-0" />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-primary/20 rounded-full animate-ping animation-delay-1000" />
        <div className="absolute bottom-1/3 left-1/3 w-5 h-5 bg-warning/20 rounded-full animate-ping animation-delay-2000" />
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-success/30 rounded-full animate-ping animation-delay-1500" />
      </div>

      <div className="max-w-md w-full">
        {/* Success Icon with Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* Outer Ring Animation */}
            <div className="absolute inset-0 w-24 h-24 border-4 rounded-full animate-spin-slow" style={{ borderColor: '#F1AD26' }} />
            <div className="absolute inset-2 w-20 h-20 border-2 rounded-full animate-reverse-spin" style={{ borderColor: '#F1AD26', opacity: 0.5 }} />
            
            {/* Success Icon */}
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transform transition-all duration-1000 ${
              showContent ? 'scale-100 rotate-0' : 'scale-0 rotate-45'
            }`} style={{ backgroundColor: '#F1AD26' }}>
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            
            {/* Sparkle Effects */}
            <Sparkles className={`absolute -top-2 -right-2 w-6 h-6 transform transition-all duration-500 ${
              showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`} style={{ color: '#F1AD26' }} />
            <Award className={`absolute -bottom-1 -left-2 w-5 h-5 transform transition-all duration-700 ${
              showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`} style={{ color: '#F1AD26' }} />
          </div>
        </div>

        {/* Success Message */}
        <div className={`text-center mb-8 transform transition-all duration-1000 ${
          showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#22211A' }}>
            保存完了！
          </h1>
          
          <div className="space-y-2">
            <p className="text-lg" style={{ color: '#22211A' }}>実績データが正常に保存されました</p>
            {venue && (
              <p className="text-sm" style={{ color: '#22211A' }}>会場: <span className="font-semibold">{venue}</span></p>
            )}
            {staffCount && (
              <p className="text-sm" style={{ color: '#22211A' }}>スタッフ: <span className="font-semibold">{staffCount}名</span></p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`space-y-4 transform transition-all duration-1000 ${
          showButtons ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {/* Primary Actions */}
          <div className="grid grid-cols-1 gap-4">
            {/* View Performance Button */}
            {eventId && (
              <Link
                href="/view"
                className="group flex items-center justify-center px-6 py-4 rounded-xl hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-elegant-lg font-bold"
                style={{ backgroundColor: '#FFB300', color: '#FFFFFF' }}
              >
                <Eye className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                入力した実績を見る
              </Link>
            )}
            
            {/* Home Button */}
            <Link
              href="/"
              className="group flex items-center justify-center px-6 py-4 bg-gradient-to-r from-muted/50 to-muted/30 border rounded-xl hover:bg-gradient-to-r hover:from-muted/70 hover:to-muted/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg font-semibold"
              style={{ borderColor: '#22211A', color: '#22211A' }}
            >
              <Home className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" style={{ color: '#22211A' }} />
              ホームに戻る
            </Link>
          </div>
          
          {/* Quick Actions */}
          <div className="pt-4 border-t border-border/30">
            <p className="text-xs text-center mb-3" style={{ color: '#22211A' }}>その他の操作</p>
            <div className="flex gap-2">
              <Link
                href="/input"
                className="flex-1 text-center py-2 px-4 text-sm hover:bg-primary/10 rounded-lg transition-colors"
                style={{ color: '#22211A' }}
              >
                新規入力
              </Link>
              <Link
                href="/analytics"
                className="flex-1 text-center py-2 px-4 text-sm hover:bg-foreground/10 rounded-lg transition-colors"
                style={{ color: '#22211A' }}
              >
                分析を見る
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Particles Animation */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 bg-success/40 rounded-full animate-float-${i % 3}`}
            style={{
              left: `${20 + (i * 15)}%`,
              top: `${30 + (i * 10)}%`,
              animationDelay: `${i * 0.8}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}