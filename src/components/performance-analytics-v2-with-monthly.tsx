'use client'

import { PerformanceAnalyticsV2 } from '@/components/performance-analytics-v2'
import { MonthlyAchievementStatus } from '@/components/monthly-achievement-status'

interface Props {
  renderPdfButton?: (onClick: () => void, isGenerating: boolean) => React.ReactNode
}

export function PerformanceAnalyticsV2WithMonthly({ renderPdfButton }: Props) {
  return (
    <>
      <PerformanceAnalyticsV2 includeMonthlyStatus={true} renderPdfButton={renderPdfButton} />
    </>
  )
}