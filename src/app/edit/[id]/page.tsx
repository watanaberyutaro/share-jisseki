'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Edit, ArrowLeft } from 'lucide-react'
import { EnhancedPerformanceFormV2 } from '@/components/enhanced-performance-form-v2'
import { LoadingAnimation } from '@/components/loading-animation'
import { MagneticDots } from '@/components/MagneticDots'

export default function EditPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [eventData, setEventData] = useState(null)
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [displayedDescription, setDisplayedDescription] = useState('')
  const fullTitle = '実績編集'
  const fullDescription = 'イベントの詳細情報と実績データを編集してください'
  const eventId = params?.id as string

  useEffect(() => {
    if (eventId) {
      fetchEventData()
    }
  }, [eventId])

  // タイピングエフェクト
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

  const fetchEventData = async () => {
    try {
      // キャッシュバスティングのためにタイムスタンプを追加
      const response = await fetch(`/api/events/${eventId}/detail?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEventData(data)
      } else {
        console.error('Failed to fetch event data')
        router.push('/view')
      }
    } catch (error) {
      console.error('Error fetching event data:', error)
      router.push('/view')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
        <MagneticDots />
        <LoadingAnimation />
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8" style={{ paddingTop: '80px' }}>
        <MagneticDots />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#22211A' }}>データが見つかりません</h1>
          <button
            onClick={() => router.push('/view')}
            className="inline-flex items-center px-4 py-2 rounded-lg hover:opacity-90 transition-colors border"
            style={{ backgroundColor: '#22211A', color: '#FFFFFF', borderColor: '#22211A' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 md:pb-6" style={{ paddingTop: '80px' }}>
      <MagneticDots />
      <div className="fade-in">
        <div className="mb-8">
          <button
            onClick={() => router.push(`/view/${eventId}`)}
            className="inline-flex items-center hover:opacity-80 transition-colors mb-4"
            style={{ color: '#22211A' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" style={{ color: '#22211A' }} />
            詳細に戻る
          </button>

          <h1 className="text-4xl font-bold mb-2" style={{ color: '#22211A' }}>
            {displayedTitle}
          </h1>
          <p className="text-lg leading-relaxed min-h-[32px]" style={{ color: '#22211A' }}>
            {displayedDescription}
            {displayedDescription && <span className="animate-cursor-blink">|</span>}
          </p>
        </div>

        <EnhancedPerformanceFormV2
          editMode={true}
          initialData={eventData}
          eventId={eventId}
        />
      </div>
    </div>
  )
}