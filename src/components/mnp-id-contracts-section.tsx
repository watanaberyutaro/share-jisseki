'use client'

import { useState } from 'react'
import { useFieldArray, UseFormReturn } from 'react-hook-form'
import { Plus, Trash2, Calculator } from 'lucide-react'
import {
  PLAN_TYPES,
  DEVICE_TYPES,
  CARRIERS,
  ORDER_TYPES,
  PLAN_TYPE_LABELS,
  DEVICE_TYPE_LABELS,
  CARRIER_LABELS,
  ORDER_TYPE_LABELS,
  calculateMnpIdScore,
  type PlanType,
  type DeviceType,
  type Carrier,
  type OrderType
} from '@/lib/mnp-id-calculator'

interface MnpIdContractsSectionProps {
  form: UseFormReturn<any, any, undefined>
  staffIndex: number
  dayIndex: number
  eventDate: string
}

export function MnpIdContractsSection({
  form,
  staffIndex,
  dayIndex,
  eventDate
}: MnpIdContractsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.mnpIdContracts`
  })

  const contracts = form.watch(
    `staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.mnpIdContracts`
  ) || []

  // 新しいHS新規ID契約を追加
  const addContract = (carrier: Carrier, orderType: OrderType) => {
    append({
      carrier,
      planType: 'MANEKATSU_2',
      deviceType: 'DEVICE',
      orderType,
      specialDevice: false,
      count: 0,
      excludedCount: 0,
    })
  }

  // 合計ID点数を計算
  const calculateTotalScore = () => {
    return contracts.reduce((total: number, contract: any) => {
      const { totalIdScore } = calculateMnpIdScore({
        carrier: contract.carrier,
        planType: contract.planType,
        deviceType: contract.deviceType,
        orderType: contract.orderType || 'MNP',
        specialDevice: contract.specialDevice,
        count: contract.count || 0,
        excludedCount: contract.excludedCount || 0,
      })
      return total + totalIdScore
    }, 0)
  }

  // キャリア別ID点数を計算
  const calculateCarrierScore = (carrier: Carrier) => {
    return contracts
      .filter((c: any) => c.carrier === carrier)
      .reduce((total: number, contract: any) => {
        const { totalIdScore } = calculateMnpIdScore({
          carrier: contract.carrier,
          planType: contract.planType,
          deviceType: contract.deviceType,
          orderType: contract.orderType || 'MNP',
          specialDevice: contract.specialDevice,
          count: contract.count || 0,
          excludedCount: contract.excludedCount || 0,
        })
        return total + totalIdScore
      }, 0)
  }

  const totalScore = calculateTotalScore()
  const auScore = calculateCarrierScore('au')
  const uqScore = calculateCarrierScore('uq')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold" style={{ color: '#22211A' }}>
          HS新規ID点数計算（2026年6月2日以降）
        </h5>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addContract('au', 'MNP')}
            className="px-3 py-1.5 text-xs rounded-md transition-colors"
            style={{
              backgroundColor: '#4abf79',
              color: 'white'
            }}
          >
            <Plus className="w-3 h-3 inline mr-1" />
            au MNP
          </button>
          <button
            type="button"
            onClick={() => addContract('au', 'REGULAR')}
            className="px-3 py-1.5 text-xs rounded-md transition-colors"
            style={{
              backgroundColor: '#4abf79',
              color: 'white',
              opacity: 0.8
            }}
          >
            <Plus className="w-3 h-3 inline mr-1" />
            au 通常新規
          </button>
          <button
            type="button"
            onClick={() => addContract('uq', 'MNP')}
            className="px-3 py-1.5 text-xs rounded-md transition-colors"
            style={{
              backgroundColor: '#FFB300',
              color: 'white'
            }}
          >
            <Plus className="w-3 h-3 inline mr-1" />
            UQ MNP
          </button>
          <button
            type="button"
            onClick={() => addContract('uq', 'REGULAR')}
            className="px-3 py-1.5 text-xs rounded-md transition-colors"
            style={{
              backgroundColor: '#FFB300',
              color: 'white',
              opacity: 0.8
            }}
          >
            <Plus className="w-3 h-3 inline mr-1" />
            UQ 通常新規
          </button>
        </div>
      </div>

      {/* ID点数サマリー */}
      {contracts.length > 0 && (
        <div className="glass rounded-lg p-3 space-y-2 text-sm"
          style={{
            borderColor: '#22211A',
            backgroundColor: 'rgba(220, 237, 200, 0.5)'
          }}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">合計ID点数:</span>
            <span className="text-lg font-bold" style={{ color: '#4abf79' }}>
              {totalScore.toFixed(1)} 点
            </span>
          </div>
          <div className="flex justify-between text-xs opacity-80">
            <span>au MNP: {auScore.toFixed(1)}点</span>
            <span>UQ MNP: {uqScore.toFixed(1)}点</span>
          </div>
        </div>
      )}

      {/* HS新規ID契約一覧 */}
      {fields.length === 0 && (
        <div className="text-center py-6 text-sm opacity-60">
          上のボタンから契約を追加してください（au/UQ × MNP/通常新規）
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const contract = contracts[index]
          if (!contract) return null

          const { idScorePerContract, totalIdScore, effectiveCount } = calculateMnpIdScore({
            carrier: contract.carrier,
            planType: contract.planType,
            deviceType: contract.deviceType,
            orderType: contract.orderType || 'MNP',
            specialDevice: contract.specialDevice,
            count: contract.count || 0,
            excludedCount: contract.excludedCount || 0,
          })

          return (
            <div
              key={field.id}
              className="glass rounded-lg p-4 space-y-3"
              style={{
                borderColor: '#22211A',
                borderWidth: '1px',
                backgroundColor: contract.carrier === 'au'
                  ? 'rgba(74, 191, 121, 0.05)'
                  : 'rgba(255, 179, 0, 0.05)'
              }}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: contract.carrier === 'au' ? '#4abf79' : '#FFB300',
                      color: 'white'
                    }}
                  >
                    {CARRIER_LABELS[contract.carrier as Carrier]} {ORDER_TYPE_LABELS[contract.orderType as OrderType] || 'MNP新規'}
                  </span>
                  <Calculator className="w-4 h-4" style={{ color: '#22211A' }} />
                  <span className="text-sm font-semibold" style={{ color: '#22211A' }}>
                    1件: {idScorePerContract.toFixed(1)}点 × {effectiveCount}件 = {totalIdScore.toFixed(1)}点
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                  style={{ color: '#dc2626' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* orderTypeをhidden inputとして保持 */}
              <input
                type="hidden"
                {...form.register(
                  `staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.mnpIdContracts.${index}.orderType`
                )}
              />

              {/* 入力フィールド */}
              <div className="grid grid-cols-2 gap-3">
                {/* プラン区分 */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
                    プラン区分
                  </label>
                  <select
                    {...form.register(
                      `staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.mnpIdContracts.${index}.planType`
                    )}
                    className="w-full px-3 py-2 text-sm rounded-md border"
                    style={{ borderColor: '#22211A' }}
                  >
                    {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 端末区分 */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
                    端末区分
                  </label>
                  <select
                    {...form.register(
                      `staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.mnpIdContracts.${index}.deviceType`
                    )}
                    className="w-full px-3 py-2 text-sm rounded-md border"
                    style={{ borderColor: '#22211A' }}
                  >
                    {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 件数 */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
                    件数
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...form.register(
                      `staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.mnpIdContracts.${index}.count`,
                      { valueAsNumber: true }
                    )}
                    className="w-full px-3 py-2 text-sm rounded-md border"
                    style={{ borderColor: '#22211A' }}
                  />
                </div>
              </div>

              {/* 特定機種フラグ */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`specialDevice-${staffIndex}-${dayIndex}-${index}`}
                  {...form.register(
                    `staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.mnpIdContracts.${index}.specialDevice`
                  )}
                  className="w-4 h-4 rounded border-gray-300"
                  style={{ accentColor: '#4abf79' }}
                />
                <label
                  htmlFor={`specialDevice-${staffIndex}-${dayIndex}-${index}`}
                  className="text-xs font-medium cursor-pointer"
                  style={{ color: '#22211A' }}
                >
                  特定機種対象（+2点）
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
