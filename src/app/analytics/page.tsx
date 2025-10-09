'use client'

import { useState, useEffect } from 'react'
import { PerformanceAnalyticsV2WithMonthly } from '@/components/performance-analytics-v2-with-monthly'
import { MagneticDots } from '@/components/MagneticDots'
import { Download } from 'lucide-react'

export default function AnalyticsPage() {
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [displayedDescription, setDisplayedDescription] = useState('')
  const fullTitle = '実績分析'
  const fullDescription = '蓄積されたデータから様々な角度で分析を行います'

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

  useEffect(() => {
    // 分析ページ専用のスタイルを動的に追加
    const style = document.createElement('style')
    style.id = 'analytics-custom-styles'
    style.textContent = `
      @media (max-width: 768px) {
        .analytics-page h3 {
          font-size: 1rem !important;
        }
        .analytics-page .text-lg {
          font-size: 1rem !important;
        }
        .analytics-page .text-2xl {
          font-size: 1rem !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('analytics-custom-styles')
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  return (
    <div className="min-h-screen py-2 md:py-6 pb-32 md:pb-6 analytics-page" style={{ paddingTop: '5rem' }}>
      <MagneticDots />
      <div className="fade-in">
        <PerformanceAnalyticsV2WithMonthly
          renderPdfButton={(onClick, isGenerating) => (
            <div className="container mx-auto px-2 sm:px-4 mb-4 md:mb-8 max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2" style={{ color: '#22211A' }}>
                    {displayedTitle}
                  </h1>
                  <p className="text-sm md:text-lg leading-relaxed min-h-[24px] md:min-h-[32px]" style={{ color: '#22211A' }}>
                    {displayedDescription}
                    {displayedDescription && <span className="animate-cursor-blink">|</span>}
                  </p>
                </div>
                <button
                  onClick={onClick}
                  disabled={isGenerating}
                  className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 rounded-xl border hover:opacity-90 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  style={{ backgroundColor: '#FFB300', color: '#FFFFFF', borderColor: '#FFB300' }}
                >
                  <Download className="w-4 md:w-5 h-4 md:h-5 mr-2" />
                  {isGenerating ? '生成中...' : 'PDFプレビュー'}
                </button>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}