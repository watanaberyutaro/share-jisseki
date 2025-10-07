'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, Save, TrendingUp } from 'lucide-react'

const performanceSchema = z.object({
  eventName: z.string().min(1, 'イベント名を入力してください'),
  date: z.string().min(1, '日付を選択してください'),
  venue: z.string().min(1, '催事場を入力してください'),
  team: z.string().min(1, 'チーム名を入力してください'),
  
  // 新規ID系 - au MNP
  auMnpSp1: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  auMnpSp2: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  auMnpSim: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  
  // 新規ID系 - UQ MNP
  uqMnpSp1: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  uqMnpSp2: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  uqMnpSim: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  
  // 新規ID系 - au HS
  auHsSp1: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  auHsSp2: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  auHsSim: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  
  // 新規ID系 - UQ HS
  uqHsSp1: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  uqHsSp2: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  uqHsSim: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  
  // 新規ID系 - セルアップ
  cellUpSp1: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  cellUpSp2: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  cellUpSim: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  
  // LTV系
  creditCard: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  goldCard: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  jiBankAccount: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  warranty: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  ott: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  electricity: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  gas: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  
  // NW件数
  networkCount: z.union([z.number(), z.nan()]).transform(val => isNaN(val) ? 0 : val).default(0),
  
  notes: z.string().optional(),
})

type PerformanceFormData = z.infer<typeof performanceSchema>

export function PerformanceForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      auMnpSp1: 0,
      auMnpSp2: 0,
      auMnpSim: 0,
      uqMnpSp1: 0,
      uqMnpSp2: 0,
      uqMnpSim: 0,
      auHsSp1: 0,
      auHsSp2: 0,
      auHsSim: 0,
      uqHsSp1: 0,
      uqHsSp2: 0,
      uqHsSim: 0,
      cellUpSp1: 0,
      cellUpSp2: 0,
      cellUpSim: 0,
      creditCard: 0,
      goldCard: 0,
      jiBankAccount: 0,
      warranty: 0,
      ott: 0,
      electricity: 0,
      gas: 0,
      networkCount: 0,
    },
  })

  const onSubmit = async (data: PerformanceFormData) => {
    setIsSubmitting(true)
    setSuccessMessage('')
    
    // 空の値を0に変換
    const formattedData = {
      ...data,
      auMnpSp1: data.auMnpSp1 || 0,
      auMnpSp2: data.auMnpSp2 || 0,
      auMnpSim: data.auMnpSim || 0,
      uqMnpSp1: data.uqMnpSp1 || 0,
      uqMnpSp2: data.uqMnpSp2 || 0,
      uqMnpSim: data.uqMnpSim || 0,
      auHsSp1: data.auHsSp1 || 0,
      auHsSp2: data.auHsSp2 || 0,
      auHsSim: data.auHsSim || 0,
      uqHsSp1: data.uqHsSp1 || 0,
      uqHsSp2: data.uqHsSp2 || 0,
      uqHsSim: data.uqHsSim || 0,
      cellUpSp1: data.cellUpSp1 || 0,
      cellUpSp2: data.cellUpSp2 || 0,
      cellUpSim: data.cellUpSim || 0,
      creditCard: data.creditCard || 0,
      goldCard: data.goldCard || 0,
      jiBankAccount: data.jiBankAccount || 0,
      warranty: data.warranty || 0,
      ott: data.ott || 0,
      electricity: data.electricity || 0,
      gas: data.gas || 0,
      networkCount: data.networkCount || 0,
    }
    
    try {
      const response = await fetch('/api/performances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      })
      
      if (!response.ok) {
        throw new Error('実績の保存に失敗しました')
      }
      
      setSuccessMessage('実績を保存しました')
      reset()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error:', error)
      alert('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formValues = watch()
  const totalNewIds = 
    (formValues.auMnpSp1 || 0) + (formValues.auMnpSp2 || 0) + (formValues.auMnpSim || 0) +
    (formValues.uqMnpSp1 || 0) + (formValues.uqMnpSp2 || 0) + (formValues.uqMnpSim || 0) +
    (formValues.auHsSp1 || 0) + (formValues.auHsSp2 || 0) + (formValues.auHsSim || 0) +
    (formValues.uqHsSp1 || 0) + (formValues.uqHsSp2 || 0) + (formValues.uqHsSim || 0) +
    (formValues.cellUpSp1 || 0) + (formValues.cellUpSp2 || 0) + (formValues.cellUpSim || 0)
  
  const totalLtv = 
    (formValues.creditCard || 0) + (formValues.goldCard || 0) + (formValues.jiBankAccount || 0) +
    (formValues.warranty || 0) + (formValues.ott || 0) + (formValues.electricity || 0) + (formValues.gas || 0)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-4 md:p-6 rounded-lg shadow-lg">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            イベント名
          </label>
          <input
            type="text"
            {...register('eventName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="例: 〇〇店外販イベント"
          />
          {errors.eventName && (
            <p className="mt-1 text-sm text-red-600">{errors.eventName.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            日付
          </label>
          <input
            type="date"
            {...register('date')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            催事場
          </label>
          <input
            type="text"
            {...register('venue')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="例: イオンモール〇〇"
          />
          {errors.venue && (
            <p className="mt-1 text-sm text-red-600">{errors.venue.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            チーム名
          </label>
          <input
            type="text"
            {...register('team')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="例: Aチーム"
          />
          {errors.team && (
            <p className="mt-1 text-sm text-red-600">{errors.team.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            新規ID系
          </h3>
          
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">au MNP</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP1</label>
                  <input
                    type="number"
                    {...register('auMnpSp1', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP2</label>
                  <input
                    type="number"
                    {...register('auMnpSp2', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SIM単</label>
                  <input
                    type="number"
                    {...register('auMnpSim', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">UQ MNP</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP1</label>
                  <input
                    type="number"
                    {...register('uqMnpSp1', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP2</label>
                  <input
                    type="number"
                    {...register('uqMnpSp2', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SIM単</label>
                  <input
                    type="number"
                    {...register('uqMnpSim', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">au HS</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP1</label>
                  <input
                    type="number"
                    {...register('auHsSp1', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP2</label>
                  <input
                    type="number"
                    {...register('auHsSp2', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SIM単</label>
                  <input
                    type="number"
                    {...register('auHsSim', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">UQ HS</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP1</label>
                  <input
                    type="number"
                    {...register('uqHsSp1', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP2</label>
                  <input
                    type="number"
                    {...register('uqHsSp2', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SIM単</label>
                  <input
                    type="number"
                    {...register('uqHsSim', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">セルアップ</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP1</label>
                  <input
                    type="number"
                    {...register('cellUpSp1', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SP2</label>
                  <input
                    type="number"
                    {...register('cellUpSp2', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SIM単</label>
                  <input
                    type="number"
                    {...register('cellUpSim', { valueAsNumber: true })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">LTV系</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">クレカ</label>
              <input
                type="number"
                {...register('creditCard', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ゴールド</label>
              <input
                type="number"
                {...register('goldCard', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">じ銀</label>
              <input
                type="number"
                {...register('jiBankAccount', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">保証</label>
              <input
                type="number"
                {...register('warranty', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">OTT</label>
              <input
                type="number"
                {...register('ott', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">でんき</label>
              <input
                type="number"
                {...register('electricity', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ガス</label>
              <input
                type="number"
                {...register('gas', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">その他</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">NW件数</label>
              <input
                type="number"
                {...register('networkCount', { valueAsNumber: true })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">備考</label>
              <textarea
                {...register('notes')}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                rows={2}
                placeholder="メモ・特記事項など"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-50 p-4 rounded-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">新規ID系 合計</span>
          <span className="text-lg font-bold text-primary-700">{totalNewIds}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">LTV系 合計</span>
          <span className="text-lg font-bold text-primary-700">{totalLtv}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center items-center px-4 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-5 h-5 mr-2" />
        {isSubmitting ? '保存中...' : '実績を保存'}
      </button>
    </form>
  )
}