'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, getWeekOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { 
  CalendarIcon, Save, TrendingUp, Plus, Trash2, Copy, 
  ChevronDown, ChevronUp, Users, Building2, MapPin 
} from 'lucide-react'

// スタッフ実績のスキーマ
const staffPerformanceSchema = z.object({
  staffName: z.string().min(1, 'スタッフ名を入力してください'),
  auMnpSp1: z.number().min(0).default(0),
  auMnpSp2: z.number().min(0).default(0),
  auMnpSim: z.number().min(0).default(0),
  uqMnpSp1: z.number().min(0).default(0),
  uqMnpSp2: z.number().min(0).default(0),
  uqMnpSim: z.number().min(0).default(0),
  auHsSp1: z.number().min(0).default(0),
  auHsSp2: z.number().min(0).default(0),
  auHsSim: z.number().min(0).default(0),
  uqHsSp1: z.number().min(0).default(0),
  uqHsSp2: z.number().min(0).default(0),
  uqHsSim: z.number().min(0).default(0),
  cellUpSp1: z.number().min(0).default(0),
  cellUpSp2: z.number().min(0).default(0),
  cellUpSim: z.number().min(0).default(0),
  creditCard: z.number().min(0).default(0),
  goldCard: z.number().min(0).default(0),
  jiBankAccount: z.number().min(0).default(0),
  warranty: z.number().min(0).default(0),
  ott: z.number().min(0).default(0),
  electricity: z.number().min(0).default(0),
  gas: z.number().min(0).default(0),
  networkCount: z.number().min(0).default(0),
})

// メインフォームのスキーマ
const performanceFormSchema = z.object({
  // イベント基本情報
  eventName: z.string().min(1, 'イベント名を入力してください'),
  venue: z.string().min(1, '会場を入力してください'),
  agencyName: z.string().min(1, '代理店名を入力してください'),
  startDate: z.string().min(1, '開始日を選択してください'),
  endDate: z.string().min(1, '終了日を選択してください'),
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
  weekNumber: z.number().min(1).max(5),
  
  // 目標値
  targetHsTotal: z.number().min(0).default(0),
  targetAuMnp: z.number().min(0).default(0),
  targetUqMnp: z.number().min(0).default(0),
  targetAuNew: z.number().min(0).default(0),
  targetUqNew: z.number().min(0).default(0),
  
  // 運営詳細
  operationDetails: z.string().optional(),
  preparationDetails: z.string().optional(),
  promotionMethod: z.string().optional(),
  successCase1: z.string().optional(),
  successCase2: z.string().optional(),
  challengesAndSolutions: z.string().optional(),
  
  // スタッフ実績（複数）
  staffPerformances: z.array(staffPerformanceSchema),
})

type PerformanceFormData = z.infer<typeof performanceFormSchema>

export function EnhancedPerformanceForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [expandedStaff, setExpandedStaff] = useState<number[]>([0])
  
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentWeek = getWeekOfMonth(new Date(), { locale: ja })
  
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceFormSchema),
    defaultValues: {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      year: currentYear,
      month: currentMonth,
      weekNumber: currentWeek,
      staffPerformances: [
        {
          staffName: '',
          auMnpSp1: 0,
          auMnpSp2: 0,
          auMnpSim: 0,
          // ... 他の全フィールドも0で初期化
        }
      ],
    },
  })
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'staffPerformances',
  })
  
  const toggleStaffExpansion = (index: number) => {
    setExpandedStaff(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }
  
  const addStaff = () => {
    append({
      staffName: '',
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
    })
    setExpandedStaff(prev => [...prev, fields.length])
  }
  
  const copyStaffData = (fromIndex: number, toIndex: number) => {
    const sourceStaff = watch(`staffPerformances.${fromIndex}`)
    if (sourceStaff) {
      const targetStaffName = watch(`staffPerformances.${toIndex}.staffName`)
      setValue(`staffPerformances.${toIndex}`, {
        ...sourceStaff,
        staffName: targetStaffName, // 名前は維持
      })
    }
  }
  
  const onSubmit = async (data: PerformanceFormData) => {
    setIsSubmitting(true)
    setSuccessMessage('')
    
    try {
      const response = await fetch('/api/performances/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
  
  // 合計値の計算
  const staffPerformances = watch('staffPerformances')
  const totalsByStaff = staffPerformances?.map(staff => ({
    hsTotal: (staff.auMnpSp1 || 0) + (staff.auMnpSp2 || 0) + (staff.auMnpSim || 0) +
             (staff.uqMnpSp1 || 0) + (staff.uqMnpSp2 || 0) + (staff.uqMnpSim || 0) +
             (staff.auHsSp1 || 0) + (staff.auHsSp2 || 0) + (staff.auHsSim || 0) +
             (staff.uqHsSp1 || 0) + (staff.uqHsSp2 || 0) + (staff.uqHsSim || 0) +
             (staff.cellUpSp1 || 0) + (staff.cellUpSp2 || 0) + (staff.cellUpSim || 0),
    ltvTotal: (staff.creditCard || 0) + (staff.goldCard || 0) + (staff.jiBankAccount || 0) +
              (staff.warranty || 0) + (staff.ott || 0) + (staff.electricity || 0) + (staff.gas || 0),
    auMnpTotal: (staff.auMnpSp1 || 0) + (staff.auMnpSp2 || 0) + (staff.auMnpSim || 0),
    uqMnpTotal: (staff.uqMnpSp1 || 0) + (staff.uqMnpSp2 || 0) + (staff.uqMnpSim || 0),
    auNewTotal: (staff.auHsSp1 || 0) + (staff.auHsSp2 || 0) + (staff.auHsSim || 0),
    uqNewTotal: (staff.uqHsSp1 || 0) + (staff.uqHsSp2 || 0) + (staff.uqHsSim || 0),
  })) || []
  
  const grandTotal = totalsByStaff.reduce((acc, curr) => ({
    hsTotal: acc.hsTotal + curr.hsTotal,
    ltvTotal: acc.ltvTotal + curr.ltvTotal,
    auMnpTotal: acc.auMnpTotal + curr.auMnpTotal,
    uqMnpTotal: acc.uqMnpTotal + curr.uqMnpTotal,
    auNewTotal: acc.auNewTotal + curr.auNewTotal,
    uqNewTotal: acc.uqNewTotal + curr.uqNewTotal,
  }), { hsTotal: 0, ltvTotal: 0, auMnpTotal: 0, uqMnpTotal: 0, auNewTotal: 0, uqNewTotal: 0 })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 fade-in">
      {successMessage && (
        <div className="glass rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-success">
          {successMessage}
        </div>
      )}
      
      {/* イベント基本情報 */}
      <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-primary" />
          イベント基本情報
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              イベント名
            </label>
            <input
              type="text"
              {...register('eventName')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="例: 〇〇店外販イベント"
            />
            {errors.eventName && (
              <p className="mt-1 text-sm text-destructive">{errors.eventName.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              会場
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                {...register('venue')}
                className="w-full pl-10 pr-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="例: イオンモール〇〇"
              />
            </div>
            {errors.venue && (
              <p className="mt-1 text-sm text-destructive">{errors.venue.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              代理店名
            </label>
            <input
              type="text"
              {...register('agencyName')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="例: 〇〇代理店"
            />
            {errors.agencyName && (
              <p className="mt-1 text-sm text-destructive">{errors.agencyName.message}</p>
            )}
          </div>
        </div>
        
        {/* 期間設定 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              開始日
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              終了日
            </label>
            <input
              type="date"
              {...register('endDate')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              年
            </label>
            <select
              {...register('year', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              {[...Array(11)].map((_, i) => (
                <option key={i} value={2020 + i}>{2020 + i}年</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              月
            </label>
            <select
              {...register('month', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              週
            </label>
            <select
              {...register('weekNumber', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={i + 1}>第{i + 1}週</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* 目標設定 */}
      <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary" />
          目標設定
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              HS総販目標
            </label>
            <input
              type="number"
              {...register('targetHsTotal', { valueAsNumber: true })}
              className="w-full px-2 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              au MNP目標
            </label>
            <input
              type="number"
              {...register('targetAuMnp', { valueAsNumber: true })}
              className="w-full px-2 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              UQ MNP目標
            </label>
            <input
              type="number"
              {...register('targetUqMnp', { valueAsNumber: true })}
              className="w-full px-2 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              au新規目標
            </label>
            <input
              type="number"
              {...register('targetAuNew', { valueAsNumber: true })}
              className="w-full px-2 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              UQ新規目標
            </label>
            <input
              type="number"
              {...register('targetUqNew', { valueAsNumber: true })}
              className="w-full px-2 py-1.5 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0"
            />
          </div>
        </div>
      </div>
      
      {/* スタッフ個別実績 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" />
            スタッフ個別実績
          </h3>
          <button
            type="button"
            onClick={addStaff}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            スタッフ追加
          </button>
        </div>
        
        {fields.map((field, index) => (
          <div key={field.id} className="glass rounded-2xl border border-border/50 shadow-elegant overflow-hidden">
            {/* スタッフヘッダー */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleStaffExpansion(index)}
                    className="p-1 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    {expandedStaff.includes(index) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <input
                    type="text"
                    {...register(`staffPerformances.${index}.staffName`)}
                    className="px-3 py-1.5 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="スタッフ名を入力"
                  />
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-muted-foreground">HS総販:</span>
                    <span className="font-bold text-primary">{totalsByStaff[index]?.hsTotal || 0}件</span>
                    <span className="text-muted-foreground">LTV:</span>
                    <span className="font-bold text-success">{totalsByStaff[index]?.ltvTotal || 0}件</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => copyStaffData(index - 1, index)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                      title="前のスタッフのデータをコピー"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {errors.staffPerformances?.[index]?.staffName && (
                <p className="mt-1 text-sm text-destructive">{errors.staffPerformances[index].staffName?.message}</p>
              )}
            </div>
            
            {/* スタッフ実績詳細（展開時のみ表示） */}
            {expandedStaff.includes(index) && (
              <div className="p-6 space-y-4">
                {/* 新規ID系 */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">新規ID系</h4>
                  
                  <div className="space-y-3">
                    {/* au MNP */}
                    <div className="bg-muted/20 p-3 rounded-xl">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">au MNP</h5>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP1</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.auMnpSp1`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP2</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.auMnpSp2`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SIM単</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.auMnpSim`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* UQ MNP */}
                    <div className="bg-muted/20 p-3 rounded-xl">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">UQ MNP</h5>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP1</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.uqMnpSp1`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP2</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.uqMnpSp2`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SIM単</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.uqMnpSim`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* au HS (新規) */}
                    <div className="bg-muted/20 p-3 rounded-xl">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">au HS (新規)</h5>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP1</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.auHsSp1`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP2</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.auHsSp2`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SIM単</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.auHsSim`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* UQ HS (新規) */}
                    <div className="bg-muted/20 p-3 rounded-xl">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">UQ HS (新規)</h5>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP1</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.uqHsSp1`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP2</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.uqHsSp2`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SIM単</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.uqHsSim`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* セルアップ */}
                    <div className="bg-muted/20 p-3 rounded-xl">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">セルアップ</h5>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP1</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.cellUpSp1`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SP2</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.cellUpSp2`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">SIM単</label>
                          <input
                            type="number"
                            {...register(`staffPerformances.${index}.cellUpSim`, { valueAsNumber: true })}
                            className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* LTV系 */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">LTV系</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">クレカ</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.creditCard`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">ゴールド</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.goldCard`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">じ銀</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.jiBankAccount`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">保証</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.warranty`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">OTT</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.ott`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">でんき</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.electricity`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">ガス</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.gas`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                
                {/* その他 */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">その他</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">NW件数</label>
                      <input
                        type="number"
                        {...register(`staffPerformances.${index}.networkCount`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 bg-background/50 border border-border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 運営詳細 */}
      <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant">
        <h3 className="text-lg font-bold text-foreground mb-4">運営詳細</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              実施状況・オペレーション
            </label>
            <textarea
              {...register('operationDetails')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              rows={3}
              placeholder="実施状況やオペレーション内容を入力"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              事前準備
            </label>
            <textarea
              {...register('preparationDetails')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              rows={3}
              placeholder="事前準備の詳細を入力"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              訴求物・集客方法
            </label>
            <textarea
              {...register('promotionMethod')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              rows={3}
              placeholder="使用した訴求物や集客方法を入力"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                成功事例①
              </label>
              <textarea
                {...register('successCase1')}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                rows={3}
                placeholder="成功事例を入力"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                成功事例②
              </label>
              <textarea
                {...register('successCase2')}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                rows={3}
                placeholder="成功事例を入力"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              所感・課題・対策
            </label>
            <textarea
              {...register('challengesAndSolutions')}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              rows={4}
              placeholder="イベントの所感、課題、今後の対策を入力"
            />
          </div>
        </div>
      </div>
      
      {/* 合計表示 */}
      <div className="glass rounded-2xl p-6 border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="text-lg font-bold text-foreground mb-4">全体合計</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold text-primary">{grandTotal.hsTotal}</div>
            <div className="text-xs text-muted-foreground">HS総販</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold text-success">{grandTotal.ltvTotal}</div>
            <div className="text-xs text-muted-foreground">LTV合計</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold text-warning">{grandTotal.auMnpTotal}</div>
            <div className="text-xs text-muted-foreground">au MNP</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold text-warning">{grandTotal.uqMnpTotal}</div>
            <div className="text-xs text-muted-foreground">UQ MNP</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold text-primary">{grandTotal.auNewTotal}</div>
            <div className="text-xs text-muted-foreground">au新規</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold text-primary">{grandTotal.uqNewTotal}</div>
            <div className="text-xs text-muted-foreground">UQ新規</div>
          </div>
        </div>
        
        {/* 目標達成状況 */}
        {watch('targetHsTotal') > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">目標達成率</span>
              <span className="text-sm font-medium">
                {Math.round((grandTotal.hsTotal / watch('targetHsTotal')) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-3">
              <div
                className="h-3 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(Math.round((grandTotal.hsTotal / watch('targetHsTotal')) * 100), 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center items-center px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium rounded-xl hover:from-primary/90 hover:to-primary/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-elegant"
      >
        <Save className="w-5 h-5 mr-2" />
        {isSubmitting ? '保存中...' : '実績を保存'}
      </button>
    </form>
  )
}