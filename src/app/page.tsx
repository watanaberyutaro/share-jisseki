'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingAnimation } from '@/components/loading-animation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // 即座にダッシュボードにリダイレクト
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingAnimation />
    </div>
  )
}