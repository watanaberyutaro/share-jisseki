'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Calculator } from 'lucide-react'

interface IdCalculationData {
  id: string
  calculation_period_start: string
  calculation_period_end: string
  au_mnp_sp1: number
  au_mnp_sp2: number
  au_mnp_sim: number
  uq_mnp_sp1: number
  uq_mnp_sp2: number
  uq_mnp_sim: number
  au_hs_sp1: number
  au_hs_sp2: number
  au_hs_sim: number
  uq_hs_sp1: number
  uq_hs_sp2: number
  uq_hs_sim: number
  cellup_sp1: number
  cellup_sp2: number
  cellup_sim: number
}

export function IdCalculatorComponent() {
  const [calculationPeriods, setCalculationPeriods] = useState<IdCalculationData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<IdCalculationData | null>(null)
  const [loading, setLoading] = useState(true)

  // 入力件数
  const [inputData, setInputData] = useState({
    auMnpSp1: '',
    auMnpSp2: '',
    auMnpSim: '',
    uqMnpSp1: '',
    uqMnpSp2: '',
    uqMnpSim: '',
    auHsSp1: '',
    auHsSp2: '',
    auHsSim: '',
    uqHsSp1: '',
    uqHsSp2: '',
    uqHsSim: '',
    cellupSp1: '',
    cellupSp2: '',
    cellupSim: ''
  })

  useEffect(() => {
    fetchCalculationPeriods()
  }, [])

  const fetchCalculationPeriods = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('id_calculation_data')
        .select('*')
        .order('calculation_period_start', { ascending: false })

      if (error) throw error
      setCalculationPeriods(data || [])
    } catch (error) {
      console.error('Error fetching calculation periods:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月 〜 ${endDate.getFullYear()}年${endDate.getMonth() + 1}月`
  }

  const calculateTotalId = () => {
    if (!selectedPeriod) return 0

    const calculations = [
      (parseInt(inputData.auMnpSp1) || 0) * selectedPeriod.au_mnp_sp1,
      (parseInt(inputData.auMnpSp2) || 0) * selectedPeriod.au_mnp_sp2,
      (parseInt(inputData.auMnpSim) || 0) * selectedPeriod.au_mnp_sim,
      (parseInt(inputData.uqMnpSp1) || 0) * selectedPeriod.uq_mnp_sp1,
      (parseInt(inputData.uqMnpSp2) || 0) * selectedPeriod.uq_mnp_sp2,
      (parseInt(inputData.uqMnpSim) || 0) * selectedPeriod.uq_mnp_sim,
      (parseInt(inputData.auHsSp1) || 0) * selectedPeriod.au_hs_sp1,
      (parseInt(inputData.auHsSp2) || 0) * selectedPeriod.au_hs_sp2,
      (parseInt(inputData.auHsSim) || 0) * selectedPeriod.au_hs_sim,
      (parseInt(inputData.uqHsSp1) || 0) * selectedPeriod.uq_hs_sp1,
      (parseInt(inputData.uqHsSp2) || 0) * selectedPeriod.uq_hs_sp2,
      (parseInt(inputData.uqHsSim) || 0) * selectedPeriod.uq_hs_sim,
      (parseInt(inputData.cellupSp1) || 0) * selectedPeriod.cellup_sp1,
      (parseInt(inputData.cellupSp2) || 0) * selectedPeriod.cellup_sp2,
      (parseInt(inputData.cellupSim) || 0) * selectedPeriod.cellup_sim
    ]

    return calculations.reduce((sum, value) => sum + value, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#FFB300' }}></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass rounded-lg p-6 space-y-6" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid' }}>
        <div className="flex items-center mb-4">
          <CreditCard className="w-6 h-6 mr-3" style={{ color: '#FFB300' }} />
          <h2 className="text-xl font-bold" style={{ color: '#22211A' }}>
            新規ID計算機
          </h2>
        </div>

        {/* 算定期間選択 */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#22211A' }}>
            算定期間選択
          </label>
          <select
            value={selectedPeriod?.id || ''}
            onChange={(e) => {
              const period = calculationPeriods.find(p => p.id === e.target.value)
              setSelectedPeriod(period || null)
            }}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
            style={{ borderColor: '#22211A' }}
          >
            <option value="">算定期間を選択してください</option>
            {calculationPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {formatPeriod(period.calculation_period_start, period.calculation_period_end)}
              </option>
            ))}
          </select>
        </div>

        {selectedPeriod && (
          <>
            {/* データ入力グリッド */}
            <div className="grid grid-cols-5 gap-4">
              {/* au MNP */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-left mb-2" style={{ color: '#22211A' }}>au MNP</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.auMnpSp1}
                      onChange={(e) => setInputData({ ...inputData, auMnpSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.au_mnp_sp1}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.auMnpSp2}
                      onChange={(e) => setInputData({ ...inputData, auMnpSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.au_mnp_sp2}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.auMnpSim}
                      onChange={(e) => setInputData({ ...inputData, auMnpSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.au_mnp_sim}</span>
                  </div>
                </div>
              </div>

              {/* UQ MNP */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-left mb-2" style={{ color: '#22211A' }}>UQ MNP</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.uqMnpSp1}
                      onChange={(e) => setInputData({ ...inputData, uqMnpSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.uq_mnp_sp1}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.uqMnpSp2}
                      onChange={(e) => setInputData({ ...inputData, uqMnpSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.uq_mnp_sp2}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.uqMnpSim}
                      onChange={(e) => setInputData({ ...inputData, uqMnpSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.uq_mnp_sim}</span>
                  </div>
                </div>
              </div>

              {/* au HS */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-left mb-2" style={{ color: '#22211A' }}>au HS</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.auHsSp1}
                      onChange={(e) => setInputData({ ...inputData, auHsSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.au_hs_sp1}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.auHsSp2}
                      onChange={(e) => setInputData({ ...inputData, auHsSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.au_hs_sp2}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.auHsSim}
                      onChange={(e) => setInputData({ ...inputData, auHsSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.au_hs_sim}</span>
                  </div>
                </div>
              </div>

              {/* UQ HS */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-left mb-2" style={{ color: '#22211A' }}>UQ HS</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.uqHsSp1}
                      onChange={(e) => setInputData({ ...inputData, uqHsSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.uq_hs_sp1}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.uqHsSp2}
                      onChange={(e) => setInputData({ ...inputData, uqHsSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.uq_hs_sp2}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.uqHsSim}
                      onChange={(e) => setInputData({ ...inputData, uqHsSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.uq_hs_sim}</span>
                  </div>
                </div>
              </div>

              {/* セルアップ */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-left mb-2" style={{ color: '#22211A' }}>セルアップ</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.cellupSp1}
                      onChange={(e) => setInputData({ ...inputData, cellupSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.cellup_sp1}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.cellupSp2}
                      onChange={(e) => setInputData({ ...inputData, cellupSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.cellup_sp2}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      value={inputData.cellupSim}
                      onChange={(e) => setInputData({ ...inputData, cellupSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                    <span className="text-xs" style={{ color: '#22211A' }}>×{selectedPeriod.cellup_sim}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 合計ID表示 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border" style={{ borderColor: '#22211A' }}>
              <div className="flex items-center justify-center">
                <Calculator className="w-6 h-6 mr-3" style={{ color: '#FFB300' }} />
                <span className="text-lg font-semibold mr-3" style={{ color: '#22211A' }}>合計ID:</span>
                <span className="text-2xl font-bold" style={{ color: '#FFB300' }}>
                  {calculateTotalId().toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}

        {calculationPeriods.length === 0 && (
          <div className="text-center py-8">
            <p style={{ color: '#22211A', opacity: 0.6 }}>
              新規ID計算用データが登録されていません。<br />
              管理者ページでデータを登録してください。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}