'use client'

import { Calculator } from 'lucide-react'
import { CalculatorComponent } from '@/components/calculator'
import { IdCalculatorComponent } from '@/components/id-calculator'
import { MagneticDots } from '@/components/MagneticDots'

export default function CalculatorPage() {
  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6" style={{ paddingTop: '5rem', paddingBottom: '10rem' }}>
      <MagneticDots />
      <div className="fade-in">

        <div className="space-y-8">
          {/* 新規ID計算機 */}
          <IdCalculatorComponent />

          {/* 基本計算機 */}
          <div>
            <div className="flex justify-center">
              <CalculatorComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}