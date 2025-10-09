'use client'

import { useState, useEffect } from 'react'
import { PerformanceListV2 } from '@/components/performance-list-v2'
import { MagneticDots } from '@/components/MagneticDots'

export default function ViewPage() {
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [displayedDescription, setDisplayedDescription] = useState('')
  const fullTitle = 'イベント実績一覧'
  const fullDescription = '過去のイベント実績を確認できます'

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
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6 pb-32 md:pb-6" style={{ paddingTop: '5rem' }}>
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

        <PerformanceListV2 />
      </div>
    </div>
  )
}