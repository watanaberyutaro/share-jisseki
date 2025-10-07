'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, getWeekOfMonth, differenceInDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  CalendarIcon, Save, TrendingUp, Plus, Trash2, Copy,
  ChevronDown, ChevronUp, Users, Building2, MapPin, Calendar, Upload, X, Image, Clock
} from 'lucide-react'
import { getSharedList, addToSharedList, updateSharedListItem, deleteFromSharedList, migrateLocalStorageToSupabase } from '@/lib/supabase/shared-lists'
import { getDraft, saveDraft as saveDraftToSupabase, deleteDraft as deleteDraftFromSupabase, migrateDraftToSupabase } from '@/lib/supabase/drafts'

// 日別実績のスキーマ（未入力時に0とする処理を追加）
const dailyPerformanceSchema = z.object({
  auMnpSp1: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  auMnpSp2: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  auMnpSim: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  uqMnpSp1: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  uqMnpSp2: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  uqMnpSim: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  auHsSp1: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  auHsSp2: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  auHsSim: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  uqHsSp1: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  uqHsSp2: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  uqHsSim: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  cellUpSp1: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  cellUpSp2: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  cellUpSim: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  creditCard: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  goldCard: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  jiBankAccount: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  warranty: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  ott: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  electricity: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  gas: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  networkCount: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
})

// スタッフ実績のスキーマ（日別実績を含む）
const staffPerformanceSchema = z.object({
  staffName: z.string().min(1, 'スタッフ名を入力してください'),
  dailyPerformances: z.array(dailyPerformanceSchema),
})

// メインフォームのスキーマ（イベント名を削除）
const performanceFormSchema = z.object({
  // イベント基本情報
  venue: z.string().min(1, '会場を入力してください'),
  agencyName: z.string().min(1, '代理店名を入力してください'),
  startDate: z.string().min(1, '開始日を選択してください'),
  endDate: z.string().min(1, '終了日を選択してください'),
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
  weekNumber: z.number().min(1).max(5),
  
  // 目標値（未入力時に0とする処理を追加）
  targetHsTotal: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  targetAuMnp: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  targetUqMnp: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  targetAuNew: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  targetUqNew: z.preprocess(
    (val) => val === '' || val === undefined || val === null ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  
  // 運営詳細
  operationDetails: z.string().optional(),
  preparationDetails: z.string().optional(),
  promotionMethod: z.string().optional(),
  successCase1: z.string().optional(),
  successCase2: z.string().optional(),
  challengesAndSolutions: z.string().optional(),
  
  // イベントブース写真（最大5枚）
  eventPhotos: z.array(z.instanceof(File)).max(5, '写真は最大5枚までアップロードできます').optional(),
  
  // スタッフ実績（複数・日別）
  staffPerformances: z.array(staffPerformanceSchema),
})

type PerformanceFormData = z.infer<typeof performanceFormSchema>

const createEmptyDailyPerformance = () => ({
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

interface EnhancedPerformanceFormV2Props {
  editMode?: boolean
  initialData?: any
  eventId?: string
}

export function EnhancedPerformanceFormV2({ editMode = false, initialData, eventId }: EnhancedPerformanceFormV2Props) {
  console.log('[EnhancedPerformanceFormV2] コンポーネントレンダリング開始', { editMode, eventId })

  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [displayedSuccessMessage, setDisplayedSuccessMessage] = useState('')

  // タイピングエフェクト for success message
  useEffect(() => {
    if (!successMessage) {
      setDisplayedSuccessMessage('')
      return
    }
    
    let index = 0
    setDisplayedSuccessMessage('')
    
    const interval = setInterval(() => {
      if (index <= successMessage.length) {
        setDisplayedSuccessMessage(successMessage.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 30)
    
    return () => clearInterval(interval)
  }, [successMessage])
  const [expandedStaff, setExpandedStaff] = useState<number[]>([0])
  const [expandedDays, setExpandedDays] = useState<{[staffIndex: number]: number[]}>({0: [0]})
  const [eventPhotos, setEventPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<any[]>([])
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([])
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // 代理店管理用のステート
  const [agencies, setAgencies] = useState<string[]>([])
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false)
  const [newAgencyName, setNewAgencyName] = useState('')
  const [editingAgencyIndex, setEditingAgencyIndex] = useState<number | null>(null)
  const [editingAgencyName, setEditingAgencyName] = useState('')

  // 会場管理用のステート
  const [venues, setVenues] = useState<string[]>([])
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false)
  const [newVenueName, setNewVenueName] = useState('')
  const [editingVenueIndex, setEditingVenueIndex] = useState<number | null>(null)
  const [editingVenueName, setEditingVenueName] = useState('')

  // スタッフ管理用のステート
  const [staffList, setStaffList] = useState<string[]>([])
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [editingStaffIndex, setEditingStaffIndex] = useState<number | null>(null)
  const [editingStaffName, setEditingStaffName] = useState('')
  const [currentStaffFieldIndex, setCurrentStaffFieldIndex] = useState<number | null>(null)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentWeek = getWeekOfMonth(new Date(), { locale: ja })

  // 編集モードの場合、初期データを整形
  const getDefaultValues = () => {
    if (editMode && initialData) {
      const staffPerformances = initialData.staff_performances?.map((staff: any) => ({
        staffName: staff.staff_name,
        dailyPerformances: [{
          auMnpSp1: staff.au_mnp || 0,
          auMnpSp2: 0,
          auMnpSim: 0,
          uqMnpSp1: staff.uq_mnp || 0,
          uqMnpSp2: 0,
          uqMnpSim: 0,
          auHsSp1: staff.au_new || 0,
          auHsSp2: 0,
          auHsSim: 0,
          uqHsSp1: staff.uq_new || 0,
          uqHsSp2: 0,
          uqHsSim: 0,
          cellUpSp1: 0,
          cellUpSp2: 0,
          cellUpSim: 0,
          creditCard: staff.credit_card || 0,
          goldCard: staff.gold_card || 0,
          jiBankAccount: staff.ji_bank_account || 0,
          warranty: staff.warranty || 0,
          ott: staff.ott || 0,
          electricity: staff.electricity || 0,
          gas: staff.gas || 0,
          networkCount: 0,
        }]
      })) || [{
        staffName: '',
        dailyPerformances: [createEmptyDailyPerformance()],
      }]

      return {
        venue: initialData.venue || '',
        agencyName: initialData.agency_name || '',
        startDate: initialData.start_date || format(new Date(), 'yyyy-MM-dd'),
        endDate: initialData.end_date || format(new Date(), 'yyyy-MM-dd'),
        year: initialData.year || currentYear,
        month: initialData.month || currentMonth,
        weekNumber: initialData.week_number || currentWeek,
        targetHsTotal: initialData.target_hs_total || 0,
        targetAuMnp: initialData.target_au_mnp || 0,
        targetUqMnp: initialData.target_uq_mnp || 0,
        targetAuNew: initialData.target_au_new || 0,
        targetUqNew: initialData.target_uq_new || 0,
        operationDetails: initialData.operation_details || '',
        preparationDetails: initialData.preparation_details || '',
        promotionMethod: initialData.promotion_method || '',
        successCase1: initialData.success_case_1 || '',
        successCase2: initialData.success_case_2 || '',
        challengesAndSolutions: initialData.challenges_and_solutions || '',
        staffPerformances,
      }
    }

    return {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      year: currentYear,
      month: currentMonth,
      weekNumber: currentWeek,
      staffPerformances: [
        {
          staffName: '',
          dailyPerformances: [createEmptyDailyPerformance()],
        }
      ],
    }
  }

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
    defaultValues: getDefaultValues(),
  })
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'staffPerformances',
  })

  // 代理店リストをSupabaseから読み込む（全ユーザー共通）
  const loadAgencies = async () => {
    try {
      await migrateLocalStorageToSupabase('agency_names', 'agencies_global')
      const names = await getSharedList('agency_names')
      setAgencies(names)
    } catch (error) {
      console.error('Error loading agencies:', error)
      const savedAgencies = localStorage.getItem('agencies_global')
      if (savedAgencies) {
        setAgencies(JSON.parse(savedAgencies))
      }
    }
  }

  useEffect(() => {
    loadAgencies()
  }, [])

  // スタッフリストをSupabaseから読み込む（全ユーザー共通）
  const loadStaffList = async () => {
    try {
      await migrateLocalStorageToSupabase('staff_names', 'staffList_global')
      const names = await getSharedList('staff_names')
      setStaffList(names)
    } catch (error) {
      console.error('Error loading staff list:', error)
      const savedStaff = localStorage.getItem('staffList_global')
      if (savedStaff) {
        setStaffList(JSON.parse(savedStaff))
      }
    }
  }

  useEffect(() => {
    loadStaffList()
  }, [])

  // 会場リストをSupabaseから読み込む（全ユーザー共通）
  const loadVenues = async () => {
    try {
      await migrateLocalStorageToSupabase('venue_names', 'venues_global')
      const names = await getSharedList('venue_names')
      setVenues(names)
    } catch (error) {
      console.error('Error loading venues:', error)
      const savedVenues = localStorage.getItem('venues_global')
      if (savedVenues) {
        setVenues(JSON.parse(savedVenues))
      }
    }
  }

  useEffect(() => {
    loadVenues()
  }, [])

  // 代理店を追加
  const addAgency = async () => {
    if (newAgencyName.trim()) {
      try {
        await addToSharedList('agency_names', newAgencyName.trim())
        await loadAgencies()
        setNewAgencyName('')
      } catch (error) {
        console.error('Error adding agency:', error)
        alert('代理店の追加に失敗しました')
      }
    }
  }

  // 代理店を編集
  const updateAgency = async (index: number) => {
    const oldName = agencies[index]
    if (editingAgencyName.trim() && editingAgencyName !== oldName) {
      try {
        await updateSharedListItem('agency_names', oldName, editingAgencyName.trim())
        await loadAgencies()
        setEditingAgencyIndex(null)
        setEditingAgencyName('')
      } catch (error) {
        console.error('Error updating agency:', error)
        alert('代理店名の変更に失敗しました')
      }
    }
  }

  // 代理店を削除
  const deleteAgency = async (index: number) => {
    const agencyName = agencies[index]
    if (!confirm(`「${agencyName}」を削除しますか？`)) return

    try {
      await deleteFromSharedList('agency_names', agencyName)
      await loadAgencies()
    } catch (error) {
      console.error('Error deleting agency:', error)
      alert('代理店の削除に失敗しました')
    }
  }

  // スタッフを追加
  const addStaffToList = async () => {
    if (newStaffName.trim()) {
      try {
        await addToSharedList('staff_names', newStaffName.trim())
        await loadStaffList()
        setNewStaffName('')
      } catch (error) {
        console.error('Error adding staff:', error)
        alert('スタッフの追加に失敗しました')
      }
    }
  }

  // スタッフを編集
  const updateStaff = async (index: number) => {
    const oldName = staffList[index]
    if (editingStaffName.trim() && editingStaffName !== oldName) {
      try {
        await updateSharedListItem('staff_names', oldName, editingStaffName.trim())
        await loadStaffList()
        setEditingStaffIndex(null)
        setEditingStaffName('')
      } catch (error) {
        console.error('Error updating staff:', error)
        alert('スタッフ名の変更に失敗しました')
      }
    }
  }

  // スタッフを削除
  const deleteStaff = async (index: number) => {
    const staffName = staffList[index]
    if (!confirm(`「${staffName}」を削除しますか？`)) return

    try {
      await deleteFromSharedList('staff_names', staffName)
      await loadStaffList()
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert('スタッフの削除に失敗しました')
    }
  }

  // 会場を追加
  const addVenue = async () => {
    if (newVenueName.trim()) {
      try {
        await addToSharedList('venue_names', newVenueName.trim())
        await loadVenues()
        setNewVenueName('')
      } catch (error) {
        console.error('Error adding venue:', error)
        alert('会場の追加に失敗しました')
      }
    }
  }

  // 会場を編集
  const updateVenue = async (index: number) => {
    const oldName = venues[index]
    if (editingVenueName.trim() && editingVenueName !== oldName) {
      try {
        await updateSharedListItem('venue_names', oldName, editingVenueName.trim())
        await loadVenues()
        setEditingVenueIndex(null)
        setEditingVenueName('')
      } catch (error) {
        console.error('Error updating venue:', error)
        alert('会場名の変更に失敗しました')
      }
    }
  }

  // 会場を削除
  const deleteVenue = async (index: number) => {
    const venueName = venues[index]
    if (!confirm(`「${venueName}」を削除しますか？`)) return

    try {
      await deleteFromSharedList('venue_names', venueName)
      await loadVenues()
    } catch (error) {
      console.error('Error deleting venue:', error)
      alert('会場の削除に失敗しました')
    }
  }

  // 一時保存キー（ユーザー名ごとに分ける）
  const getUserName = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userName') || 'default'
    }
    return 'default'
  }
  const DRAFT_KEY = editMode && eventId
    ? `draft_edit_${eventId}_${getUserName()}`
    : `draft_performance_form_${getUserName()}`

  // 一時保存機能（Supabase版）
  const saveDraft = useCallback(async (data: Partial<PerformanceFormData>, isManual = false) => {
    const userName = getUserName()
    if (userName === 'default') {
      console.warn('[saveDraft] ユーザー名が取得できません')
      return
    }

    try {
      console.log('[saveDraft] 保存開始:', { userName, isManual, dataKeys: Object.keys(data) })
      setAutoSaveStatus('saving')

      const draftData = {
        ...data,
        savedAt: new Date().toISOString(),
        eventPhotos: undefined // ファイルは保存しない
      }

      const success = await saveDraftToSupabase(userName, draftData)

      if (success) {
        console.log('[saveDraft] Supabase保存成功:', userName)
        setAutoSaveStatus('saved')
        setLastSavedAt(new Date())

        // 手動保存の場合は成功メッセージを一時的に表示
        if (isManual) {
          setSuccessMessage('下書きを保存しました')
          setTimeout(() => setSuccessMessage(''), 3000)
        }
      } else {
        console.error('[saveDraft] Supabase保存失敗')
        setAutoSaveStatus('error')
        if (isManual) {
          alert('下書きの保存に失敗しました')
        }
      }
    } catch (error) {
      console.error('[saveDraft] エラー:', error)
      setAutoSaveStatus('error')
      if (isManual) {
        alert('下書きの保存に失敗しました')
      }
    }
  }, [])

  // 一時保存データの読み込み（Supabase版）
  const loadDraft = useCallback(async () => {
    const userName = getUserName()
    if (userName === 'default') {
      console.warn('[loadDraft] ユーザー名が取得できません')
      return false
    }

    try {
      console.log('[loadDraft] 読み込み開始:', userName)
      console.log('[loadDraft] editMode:', editMode)

      // localStorageからの移行を試みる
      await migrateDraftToSupabase(userName)

      if (editMode) {
        console.log('[loadDraft] editModeのためDraftを読み込みません')
        return false
      }

      const draftData = await getDraft(userName)

      if (!draftData) {
        console.log('[loadDraft] Draftが存在しません')
        return false
      }

      console.log('[loadDraft] Draft取得成功。savedAt:', draftData.savedAt)
      console.log('[loadDraft] データキー数:', Object.keys(draftData).length)

      // 24時間以内の下書きのみ読み込む
      const savedAt = new Date(draftData.savedAt)
      const now = new Date()
      const timeDiff = now.getTime() - savedAt.getTime()
      const hoursDiff = timeDiff / (1000 * 3600)

      console.log('[loadDraft] 経過時間:', hoursDiff.toFixed(2), '時間')

      if (hoursDiff < 24) {
        console.log('[loadDraft] データを復元します')
        delete draftData.savedAt
        reset(draftData)
        setLastSavedAt(savedAt)
        setAutoSaveStatus('saved')
        return true
      } else {
        console.log('[loadDraft] 24時間以上経過しているため削除します')
        await deleteDraftFromSupabase(userName)
        return false
      }
    } catch (error) {
      console.error('[loadDraft] エラー:', error)
      return false
    }
  }, [editMode, reset])

  // 一時保存データの削除（Supabase版）
  const clearDraft = useCallback(async () => {
    const userName = getUserName()
    if (userName === 'default') {
      console.warn('[clearDraft] ユーザー名が取得できません')
      return
    }

    try {
      await deleteDraftFromSupabase(userName)
      setAutoSaveStatus('idle')
      setLastSavedAt(null)
      console.log('[clearDraft] Draft削除成功')
    } catch (error) {
      console.error('[clearDraft] エラー:', error)
    }
  }, [])

  // フォームデータの監視と自動保存（5分間隔）
  const formData = watch()
  useEffect(() => {
    if (!editMode && autoSaveStatus !== 'saving') {
      const timer = setTimeout(() => {
        saveDraft(formData)
      }, 300000) // 5分後に自動保存（300000ms = 5分）

      return () => clearTimeout(timer)
    }
  }, [formData, saveDraft, editMode, autoSaveStatus])

  // 初回読み込み時に下書きを復元
  useEffect(() => {
    console.log('[useEffect] コンポーネントマウント - loadDraftを呼び出します')
    const draftLoaded = loadDraft()
    if (draftLoaded) {
      console.log('[useEffect] 下書きが読み込まれました')
    } else {
      console.log('[useEffect] 下書きは読み込まれませんでした')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 編集モードの場合、既存の写真を読み込む
  useEffect(() => {
    if (editMode && initialData?.photos) {
      setExistingPhotos(initialData.photos)
    }
  }, [editMode, initialData])

  // イベント期間から日数を計算
  const startDate = watch('startDate')
  const endDate = watch('endDate')
  
  const eventDays = useMemo(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = differenceInDays(end, start) + 1
      return Math.max(1, days) // 最低1日
    }
    return 1
  }, [startDate, endDate])
  
  // 期間が変更されたときにスタッフの日別実績を更新
  const updateStaffDailyPerformances = () => {
    fields.forEach((_, staffIndex) => {
      const currentDailyPerformances = watch(`staffPerformances.${staffIndex}.dailyPerformances`) || []
      
      if (currentDailyPerformances.length < eventDays) {
        // 日数が増えた場合、新しい日を追加
        const newDays = []
        for (let i = currentDailyPerformances.length; i < eventDays; i++) {
          newDays.push(createEmptyDailyPerformance())
        }
        setValue(`staffPerformances.${staffIndex}.dailyPerformances`, [
          ...currentDailyPerformances,
          ...newDays
        ])
      } else if (currentDailyPerformances.length > eventDays) {
        // 日数が減った場合、余分な日を削除
        setValue(`staffPerformances.${staffIndex}.dailyPerformances`, 
          currentDailyPerformances.slice(0, eventDays)
        )
      }
    })
  }
  
  // 期間変更時の処理
  useEffect(() => {
    updateStaffDailyPerformances()
  }, [eventDays, fields, watch, setValue])

  // 開始日が変更されたら、年・月・週を自動的に更新
  useEffect(() => {
    if (startDate) {
      const date = new Date(startDate)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const weekNumber = getWeekOfMonth(date, { locale: ja })

      setValue('year', year)
      setValue('month', month)
      setValue('weekNumber', weekNumber)
    }
  }, [startDate, setValue])
  
  const toggleStaffExpansion = (index: number) => {
    setExpandedStaff(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }
  
  const toggleDayExpansion = (staffIndex: number, dayIndex: number) => {
    setExpandedDays(prev => ({
      ...prev,
      [staffIndex]: prev[staffIndex]?.includes(dayIndex)
        ? prev[staffIndex].filter(i => i !== dayIndex)
        : [...(prev[staffIndex] || []), dayIndex]
    }))
  }
  
  const addStaffField = () => {
    const dailyPerformances = Array(eventDays).fill(null).map(() => createEmptyDailyPerformance())
    append({
      staffName: '',
      dailyPerformances,
    })
    setExpandedStaff(prev => [...prev, fields.length])
    setExpandedDays(prev => ({ ...prev, [fields.length]: [0] }))
  }
  
  const copyDayData = (staffIndex: number, fromDay: number, toDay: number) => {
    const sourceDay = watch(`staffPerformances.${staffIndex}.dailyPerformances.${fromDay}`)
    if (sourceDay) {
      setValue(`staffPerformances.${staffIndex}.dailyPerformances.${toDay}`, sourceDay)
    }
  }
  
  // 写真アップロード関連の関数
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const remainingSlots = 5 - eventPhotos.length
    const newFiles = files.slice(0, remainingSlots)
    
    if (newFiles.length > 0) {
      const newPhotos = [...eventPhotos, ...newFiles]
      setEventPhotos(newPhotos)
      
      // プレビュー用のURLを生成
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])
      
      // フォームのフィールドに設定
      setValue('eventPhotos', newPhotos)
    }
  }
  
  const removePhoto = (index: number) => {
    // メモリリークを防ぐためにObject URLを解放
    URL.revokeObjectURL(previewUrls[index])
    
    const newPhotos = eventPhotos.filter((_, i) => i !== index)
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index)
    
    setEventPhotos(newPhotos)
    setPreviewUrls(newPreviewUrls)
    setValue('eventPhotos', newPhotos)
  }
  
  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])
  
  const onSubmit = async (data: PerformanceFormData) => {
    setIsSubmitting(true)
    setSuccessMessage('')
    
    try {
      // FormDataを使用してファイルアップロードに対応
      const formData = new FormData()
      
      // 写真以外のデータをJSON文字列として追加
      const { eventPhotos, ...jsonData } = data
      formData.append('data', JSON.stringify(jsonData))
      
      // 写真ファイルを個別に追加
      if (eventPhotos) {
        eventPhotos.forEach((file, index) => {
          formData.append(`photo_${index}`, file)
        })
      }
      
      // デバッグ情報をログ出力
      console.log('Submitting form with data:', {
        dataKeys: Object.keys(jsonData),
        staffCount: jsonData.staffPerformances?.length,
        photoCount: eventPhotos?.length || 0,
        venue: jsonData.venue,
        agencyName: jsonData.agencyName
      })
      
      console.log('Photo debug info:', {
        eventPhotosFromData: eventPhotos,
        eventPhotosFromState: eventPhotos,
        hasEventPhotosInData: 'eventPhotos' in data,
        dataEventPhotos: data.eventPhotos,
        eventPhotosLength: eventPhotos?.length || 0,
        firstPhotoInfo: eventPhotos?.[0] ? {
          name: eventPhotos[0].name,
          size: eventPhotos[0].size,
          type: eventPhotos[0].type
        } : null
      })
      
      // 削除する写真のIDを追加
      if (editMode && photosToDelete.length > 0) {
        formData.append('photosToDelete', JSON.stringify(photosToDelete))
      }

      // FormDataの内容をログ出力
      console.log('FormData contents:')
      for (let pair of formData.entries()) {
        if (pair[0].startsWith('photo_')) {
          console.log(`${pair[0]}:`, {
            name: (pair[1] as File).name,
            size: (pair[1] as File).size,
            type: (pair[1] as File).type
          })
        } else {
          console.log(`${pair[0]}:`, typeof pair[1] === 'string' ? pair[1].substring(0, 100) + '...' : pair[1])
        }
      }
      
      const response = await fetch(
        editMode ? `/api/performances/${eventId}` : '/api/performances/enhanced-v2',
        {
          method: editMode ? 'PUT' : 'POST',
          body: formData, // Content-Typeヘッダーは自動設定される
        }
      )
      
      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = await response.text()
        }
        console.error('API Error Response:', errorData)
        console.error('Response status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        
        const errorMessage = typeof errorData === 'object' ? errorData.details || errorData.error : errorData
        throw new Error(`実績の保存に失敗しました: ${errorMessage}`)
      }
      
      const responseData = await response.json()
      console.log('Save successful:', responseData)

      // 編集モードの場合は詳細ページに戻り、新規作成の場合は成功ページに遷移
      // 正常に送信された場合、下書きを削除
      clearDraft()

      if (editMode) {
        // 成功メッセージを表示
        setSuccessMessage('編集内容を保存しました。詳細ページに戻ります...')

        // 完全リロードで最新データを確実に表示
        setTimeout(() => {
          // 強制的にキャッシュをクリアしてリロード
          window.location.replace(`/view/${eventId}?t=${Date.now()}&refresh=true`)
        }, 1000) // 1秒後にリダイレクト（データベース反映を確実に待つ）
      } else {
        const params = new URLSearchParams({
          eventId: responseData.eventId || '',
          venue: data.venue || '',
          staffCount: data.staffPerformances?.length.toString() || '0'
        })

        router.push(`/input/success?${params.toString()}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert(`エラーが発生しました: ${error}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 合計値の計算（文字列を数値に変換）
  const staffPerformances = watch('staffPerformances')
  const totalsByStaff = staffPerformances?.map(staff => {
    const dailyTotals = staff.dailyPerformances?.reduce((acc, day) => ({
      hsTotal: acc.hsTotal + (Number(day.auMnpSp1) || 0) + (Number(day.auMnpSp2) || 0) + (Number(day.auMnpSim) || 0) +
               (Number(day.uqMnpSp1) || 0) + (Number(day.uqMnpSp2) || 0) + (Number(day.uqMnpSim) || 0) +
               (Number(day.auHsSp1) || 0) + (Number(day.auHsSp2) || 0) + (Number(day.auHsSim) || 0) +
               (Number(day.uqHsSp1) || 0) + (Number(day.uqHsSp2) || 0) + (Number(day.uqHsSim) || 0) +
               (Number(day.cellUpSp1) || 0) + (Number(day.cellUpSp2) || 0) + (Number(day.cellUpSim) || 0),
      ltvTotal: acc.ltvTotal + (Number(day.creditCard) || 0) + (Number(day.goldCard) || 0) + (Number(day.jiBankAccount) || 0) +
                (Number(day.warranty) || 0) + (Number(day.ott) || 0) + (Number(day.electricity) || 0) + (Number(day.gas) || 0),
      auMnpTotal: acc.auMnpTotal + (Number(day.auMnpSp1) || 0) + (Number(day.auMnpSp2) || 0) + (Number(day.auMnpSim) || 0),
      uqMnpTotal: acc.uqMnpTotal + (Number(day.uqMnpSp1) || 0) + (Number(day.uqMnpSp2) || 0) + (Number(day.uqMnpSim) || 0),
      auNewTotal: acc.auNewTotal + (Number(day.auHsSp1) || 0) + (Number(day.auHsSp2) || 0) + (Number(day.auHsSim) || 0),
      uqNewTotal: acc.uqNewTotal + (Number(day.uqHsSp1) || 0) + (Number(day.uqHsSp2) || 0) + (Number(day.uqHsSim) || 0),
    }), { hsTotal: 0, ltvTotal: 0, auMnpTotal: 0, uqMnpTotal: 0, auNewTotal: 0, uqNewTotal: 0 })
    return dailyTotals || { hsTotal: 0, ltvTotal: 0, auMnpTotal: 0, uqMnpTotal: 0, auNewTotal: 0, uqNewTotal: 0 }
  }) || []
  
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
        <div className="glass rounded-xl bg-foreground/5 px-4 py-3" style={{ borderColor: '#22211A', color: '#22211A' }}>
          {displayedSuccessMessage}
        </div>
      )}

      {/* 一時保存ステータス */}
      {!editMode && (
        <div className="flex items-center justify-between glass rounded-lg p-3" style={{ borderColor: '#22211A' }}>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 shrink-0" style={{ color: '#22211A' }} />
            <span className="text-sm font-medium md:block hidden" style={{ color: '#22211A' }}>
              自動保存
            </span>
            <span className="text-[10px] font-medium text-center leading-tight md:hidden" style={{ color: '#22211A' }}>
              自動<br />保存
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {autoSaveStatus === 'saving' && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-amber-600">保存中...</span>
              </div>
            )}
            {autoSaveStatus === 'saved' && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4abf79' }}></div>
                <span className="text-sm" style={{ color: '#4abf79' }}>
                  {lastSavedAt && `${format(lastSavedAt, 'HH:mm')}に保存済み`}
                </span>
              </div>
            )}
            {autoSaveStatus === 'error' && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-600">保存エラー</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => saveDraft(formData, true)}
              disabled={autoSaveStatus === 'saving'}
              className="text-xs px-3 py-1 rounded border hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              style={{ borderColor: '#22211A', color: '#22211A' }}
            >
              <Save className="w-3 h-3" />
              <span>手動保存</span>
            </button>
            {lastSavedAt && (
              <button
                type="button"
                onClick={clearDraft}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-100 transition-colors md:block hidden"
                style={{ borderColor: '#22211A', color: '#22211A' }}
              >
                下書きを削除
              </button>
            )}
            {lastSavedAt && (
              <button
                type="button"
                onClick={clearDraft}
                className="text-[10px] px-1.5 py-1 rounded border hover:bg-gray-100 transition-colors text-center leading-tight md:hidden"
                style={{ borderColor: '#22211A', color: '#22211A' }}
              >
                下書き<br />削除
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* イベント基本情報（イベント名を削除） */}
      <div className="glass rounded-lg p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#22211A' }}>
          <Building2 className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
          イベント基本情報
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              会場
            </label>
            <div className="flex gap-2">
              <select
                {...register('venue')}
                className="flex-1 px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all"
                style={{ border: `1px solid ${errors.venue ? '#dc2626' : '#22211A'}`, color: '#22211A' }}
              >
                <option value="">選択してください</option>
                {venues.map((venue, index) => (
                  <option key={index} value={venue}>{venue}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsVenueModalOpen(true)}
                className="px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1"
                style={{ border: '1px solid #22211A', color: '#22211A' }}
              >
                <MapPin className="w-4 h-4" />
                管理
              </button>
            </div>
            {errors.venue && (
              <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.venue.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              代理店名
            </label>
            <div className="flex gap-2">
              <select
                {...register('agencyName')}
                className="flex-1 px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all"
                style={{ border: `1px solid ${errors.agencyName ? '#dc2626' : '#22211A'}`, color: '#22211A' }}
              >
                <option value="">選択してください</option>
                {agencies.map((agency, index) => (
                  <option key={index} value={agency}>{agency}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsAgencyModalOpen(true)}
                className="px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1"
                style={{ border: '1px solid #22211A', color: '#22211A' }}
              >
                <Building2 className="w-4 h-4" />
                管理
              </button>
            </div>
            {errors.agencyName && (
              <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.agencyName.message}</p>
            )}
          </div>
        </div>
        
        {/* 期間設定 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              開始日
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              終了日
            </label>
            <input
              type="date"
              {...register('endDate')}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              年
            </label>
            <select
              {...register('year', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
            >
              {[...Array(11)].map((_, i) => (
                <option key={i} value={2020 + i}>{2020 + i}年</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              月
            </label>
            <select
              {...register('month', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              週
            </label>
            <select
              {...register('weekNumber', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={i + 1}>第{i + 1}週</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* イベント期間情報表示 */}
        <div className="mt-4 p-3 bg-primary/5 rounded-xl">
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 mr-2" style={{ color: '#22211A' }} />
            <span style={{ color: '#22211A' }}>
              イベント期間: {eventDays}日間
              {startDate && endDate && (
                <span className="ml-2" style={{ color: '#22211A' }}>
                  ({format(new Date(startDate), 'M/d', { locale: ja })} 〜 {format(new Date(endDate), 'M/d', { locale: ja })})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      {/* 目標設定 */}
      <div className="glass rounded-lg p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#22211A' }}>
          <TrendingUp className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
          目標設定
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
              HS総販目標
            </label>
            <input
              type="number"
              {...register('targetHsTotal')}
              className="w-full px-2 py-1.5 bg-background/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid #22211A', color: '#22211A' }}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
              au MNP目標
            </label>
            <input
              type="number"
              {...register('targetAuMnp')}
              className="w-full px-2 py-1.5 bg-background/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid #22211A', color: '#22211A' }}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
              UQ MNP目標
            </label>
            <input
              type="number"
              {...register('targetUqMnp')}
              className="w-full px-2 py-1.5 bg-background/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid #22211A', color: '#22211A' }}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
              au新規目標
            </label>
            <input
              type="number"
              {...register('targetAuNew')}
              className="w-full px-2 py-1.5 bg-background/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid #22211A', color: '#22211A' }}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#22211A' }}>
              UQ新規目標
            </label>
            <input
              type="number"
              {...register('targetUqNew')}
              className="w-full px-2 py-1.5 bg-background/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid #22211A', color: '#22211A' }}
              placeholder="0"
              min="0"
            />
          </div>
        </div>
      </div>
      
      {/* スタッフ日別実績 */}
      <div className="glass rounded-lg p-6 space-y-4" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
            <Users className="w-5 h-5 mr-2" style={{ color: '#22211A' }} />
            スタッフ日別実績
          </h3>
          <button
            type="button"
            onClick={addStaffField}
            className="inline-flex items-center px-4 py-2 rounded-xl border hover:opacity-90 transition-all font-bold"
            style={{ backgroundColor: '#FFB300', color: '#FFFFFF', borderColor: '#FFB300' }}
          >
            <Plus className="w-4 h-4 mr-2" style={{ color: '#FFFFFF' }} />
            スタッフ追加
          </button>
        </div>
        
        {fields.map((field, staffIndex) => (
          <div key={field.id} className="glass rounded-lg overflow-hidden" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            {/* スタッフヘッダー */}
            <div className="px-3 md:px-6 py-3 md:py-4" style={{ backgroundColor: 'rgba(34, 33, 26, 0.1)', borderBottom: '1px solid #22211A' }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* モバイル用：上段 */}
                <div className="flex items-center justify-between md:justify-start md:flex-1 gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleStaffExpansion(staffIndex)}
                      className="p-1 hover:bg-[#22211A33] rounded-lg transition-colors shrink-0"
                    >
                      {expandedStaff.includes(staffIndex) ? (
                        <ChevronUp className="w-5 h-5" style={{ color: '#22211A' }} />
                      ) : (
                        <ChevronDown className="w-5 h-5" style={{ color: '#22211A' }} />
                      )}
                    </button>
                    <div className="flex gap-2 flex-1 min-w-0">
                      <select
                        {...register(`staffPerformances.${staffIndex}.staffName`)}
                        className="px-2 md:px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all text-sm md:text-base flex-1 min-w-0"
                        style={{ backgroundColor: '#FAFAFA', border: `1px solid ${errors.staffPerformances?.[staffIndex]?.staffName ? '#dc2626' : '#22211A'}`, color: '#22211A' }}
                      >
                        <option value="">選択してください</option>
                        {staffList.map((staff, index) => (
                          <option key={index} value={staff}>{staff}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStaffFieldIndex(staffIndex)
                          setIsStaffModalOpen(true)
                        }}
                        className="px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors flex items-center shrink-0"
                        style={{ border: '1px solid #22211A', color: '#22211A', fontSize: '12px' }}
                      >
                        <Users className="w-3 h-3 md:mr-1" />
                        <span className="hidden md:inline">管理</span>
                      </button>
                    </div>
                  </div>
                  {/* 削除ボタン（モバイルでも常に表示） */}
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(staffIndex)}
                      className="p-2 rounded-lg transition-all border shrink-0"
                      style={{
                        backgroundColor: '#ff4444',
                        borderColor: '#cc0000',
                        color: '#FFFFFF'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#cc0000'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ff4444'
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* 統計情報 */}
                <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm pl-8 md:pl-0">
                  <div className="flex items-center gap-1">
                    <span style={{ color: '#22211A' }}>HS総販:</span>
                    <span className="font-bold" style={{ color: '#22211A' }}>{totalsByStaff[staffIndex]?.hsTotal || 0}件</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ color: '#22211A' }}>LTV:</span>
                    <span className="font-bold" style={{ color: '#22211A' }}>{totalsByStaff[staffIndex]?.ltvTotal || 0}件</span>
                  </div>
                </div>
              </div>
              {errors.staffPerformances?.[staffIndex]?.staffName && (
                <p className="mt-1 text-sm pl-8 md:pl-0" style={{ color: '#dc2626' }}>{errors.staffPerformances[staffIndex].staffName?.message}</p>
              )}
            </div>
            
            {/* 日別実績詳細（展開時のみ表示） */}
            {expandedStaff.includes(staffIndex) && (
              <div className="p-6 space-y-4">
                {Array(eventDays).fill(null).map((_, dayIndex) => (
                  <div key={dayIndex} className="rounded-xl overflow-hidden" style={{ borderColor: '#22211A' }}>
                    {/* 日別ヘッダー */}
                    <div className="px-4 py-3" style={{ backgroundColor: 'rgba(34, 33, 26, 0.05)', borderBottom: '1px solid #22211A' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => toggleDayExpansion(staffIndex, dayIndex)}
                            className="p-1 hover:bg-[#22211A33] rounded transition-colors"
                          >
                            {expandedDays[staffIndex]?.includes(dayIndex) ? (
                              <ChevronUp className="w-4 h-4" style={{ color: '#22211A' }} />
                            ) : (
                              <ChevronDown className="w-4 h-4" style={{ color: '#22211A' }} />
                            )}
                          </button>
                          <span className="font-medium" style={{ color: '#22211A' }}>
                            {dayIndex + 1}日目
                            {startDate && (
                              <span className="ml-2 text-sm" style={{ color: '#22211A' }}>
                                ({format(addDays(new Date(startDate), dayIndex), 'M/d', { locale: ja })})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {dayIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => copyDayData(staffIndex, dayIndex - 1, dayIndex)}
                              className="p-1 hover:bg-[#22211A33] rounded transition-all text-xs" style={{ color: '#22211A' }}
                              title="前日のデータをコピー"
                            >
                              <Copy className="w-3 h-3" style={{ color: '#22211A' }} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 日別実績入力フォーム（展開時のみ） */}
                    {expandedDays[staffIndex]?.includes(dayIndex) && (
                      <div className="p-4 space-y-4">
                        {/* 新規ID系 */}
                        <div>
                          <h5 className="text-sm font-semibold mb-3" style={{ color: '#22211A' }}>新規ID系</h5>
                          
                          <div className="space-y-3">
                            {/* au MNP */}
                            <div className="bg-muted/20 p-3 rounded-xl">
                              <h6 className="text-xs font-medium mb-2" style={{ color: '#22211A' }}>au MNP</h6>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP1</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.auMnpSp1`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP2</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.auMnpSp2`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SIM単</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.auMnpSim`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* UQ MNP */}
                            <div className="bg-muted/20 p-3 rounded-xl">
                              <h6 className="text-xs font-medium mb-2" style={{ color: '#22211A' }}>UQ MNP</h6>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP1</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.uqMnpSp1`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP2</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.uqMnpSp2`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SIM単</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.uqMnpSim`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* au HS (新規) */}
                            <div className="bg-muted/20 p-3 rounded-xl">
                              <h6 className="text-xs font-medium mb-2" style={{ color: '#22211A' }}>au HS (新規)</h6>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP1</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.auHsSp1`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP2</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.auHsSp2`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SIM単</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.auHsSim`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* UQ HS (新規) */}
                            <div className="bg-muted/20 p-3 rounded-xl">
                              <h6 className="text-xs font-medium mb-2" style={{ color: '#22211A' }}>UQ HS (新規)</h6>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP1</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.uqHsSp1`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP2</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.uqHsSp2`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SIM単</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.uqHsSim`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* セルアップ */}
                            <div className="bg-muted/20 p-3 rounded-xl">
                              <h6 className="text-xs font-medium mb-2" style={{ color: '#22211A' }}>セルアップ</h6>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP1</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.cellUpSp1`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SP2</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.cellUpSp2`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: '#22211A' }}>SIM単</label>
                                  <input
                                    type="number"
                                    {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.cellUpSim`)}
                                    className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* LTV系 */}
                        <div>
                          <h5 className="text-sm font-semibold mb-3" style={{ color: '#22211A' }}>LTV系</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>クレカ</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.creditCard`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>ゴールド</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.goldCard`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>じ銀</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.jiBankAccount`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>保証</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.warranty`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>OTT</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.ott`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>でんき</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.electricity`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>ガス</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.gas`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* その他 */}
                        <div>
                          <h5 className="text-sm font-semibold mb-3" style={{ color: '#22211A' }}>その他</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#22211A' }}>NW件数</label>
                              <input
                                type="number"
                                {...register(`staffPerformances.${staffIndex}.dailyPerformances.${dayIndex}.networkCount`)}
                                className="w-full px-2 py-1 bg-background/50 rounded text-sm" style={{ border: '1px solid #22211A', color: '#22211A' }}
                                placeholder="0"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 運営詳細 */}
      <div className="glass rounded-lg p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#22211A' }}>運営詳細</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              実施状況・オペレーション
            </label>
            <textarea
              {...register('operationDetails')}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
              rows={3}
              placeholder="実施状況やオペレーション内容を入力"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              事前準備
            </label>
            <textarea
              {...register('preparationDetails')}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
              rows={3}
              placeholder="事前準備の詳細を入力"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              訴求物・集客方法
            </label>
            <textarea
              {...register('promotionMethod')}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
              rows={3}
              placeholder="使用した訴求物や集客方法を入力"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                成功事例①
              </label>
              <textarea
                {...register('successCase1')}
                className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
                rows={3}
                placeholder="成功事例を入力"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                成功事例②
              </label>
              <textarea
                {...register('successCase2')}
                className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
                rows={3}
                placeholder="成功事例を入力"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
              所感・課題・対策
            </label>
            <textarea
              {...register('challengesAndSolutions')}
              className="w-full px-3 py-2 bg-background/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22211A33] transition-all" style={{ border: '1px solid #22211A', color: '#22211A' }}
              rows={4}
              placeholder="イベントの所感、課題、今後の対策を入力"
            />
          </div>
          
          {/* イベントブース写真 */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid #22211A' }}>
            <h4 className="text-sm font-medium mb-4 flex items-center" style={{ color: '#22211A' }}>
              <Image className="w-4 h-4 mr-2" style={{ color: '#22211A' }} />
              イベントブース写真（最大5枚）
            </h4>
            
            {/* 既存の写真（編集モードの場合） */}
            {editMode && existingPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2" style={{ color: '#22211A' }}>既存の写真</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {existingPhotos.filter(photo => !photosToDelete.includes(photo.id)).map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.file_url}
                        alt={photo.file_name || 'イベント写真'}
                        className="w-full h-20 object-cover rounded-lg" style={{ border: '1px solid #22211A' }}
                      />
                      <button
                        type="button"
                        onClick={() => setPhotosToDelete([...photosToDelete, photo.id])}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="削除"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {photosToDelete.length > 0 && (
                  <p className="text-xs mt-2" style={{ color: '#ff0000' }}>
                    {photosToDelete.length}枚の写真が削除されます
                  </p>
                )}
              </div>
            )}

            {/* アップロードボタン */}
            {(eventPhotos.length + (existingPhotos.length - photosToDelete.length)) < 5 && (
              <div className="flex items-center justify-center mb-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#22211A1A] hover:bg-[#22211A33] transition-all" style={{ borderColor: '#22211A' }}>
                  <Upload className="w-8 h-8 mb-2" style={{ color: '#22211A' }} />
                  <span className="text-sm" style={{ color: '#22211A' }}>
                    写真を選択 ({eventPhotos.length}/5)
                  </span>
                  <span className="text-xs mt-1" style={{ color: '#22211A' }}>
                    PNG, JPG, JPEG (最大10MB)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            
            {/* 写真プレビュー */}
            {eventPhotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`イベントブース写真 ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg" style={{ border: '1px solid #22211A' }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" style={{ color: '#22211A' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {errors.eventPhotos && (
              <p className="text-sm mt-2" style={{ color: '#dc2626' }}>{errors.eventPhotos.message}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* 合計表示 */}
      <div className="glass rounded-2xl p-6 bg-gradient-to-r from-primary/5 to-transparent" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#22211A' }}>全体合計</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{grandTotal.hsTotal}</div>
            <div className="text-xs" style={{ color: '#22211A' }}>HS総販</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{grandTotal.ltvTotal}</div>
            <div className="text-xs" style={{ color: '#22211A' }}>LTV合計</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{grandTotal.auMnpTotal}</div>
            <div className="text-xs" style={{ color: '#22211A' }}>au MNP</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{grandTotal.uqMnpTotal}</div>
            <div className="text-xs" style={{ color: '#22211A' }}>UQ MNP</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{grandTotal.auNewTotal}</div>
            <div className="text-xs" style={{ color: '#22211A' }}>au新規</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-xl">
            <div className="text-2xl font-bold" style={{ color: '#22211A' }}>{grandTotal.uqNewTotal}</div>
            <div className="text-xs" style={{ color: '#22211A' }}>UQ新規</div>
          </div>
        </div>
        
        {/* 目標達成状況 */}
        {watch('targetHsTotal') > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #22211A' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: '#22211A' }}>目標達成率</span>
              <span className="text-sm font-medium" style={{ color: '#22211A' }}>
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

      {/* ボタンエリア */}
      <div className="space-y-3">
        {/* 手動保存ボタン（新規入力時のみ） */}
        {!editMode && (
          <button
            type="button"
            onClick={() => saveDraft(formData, true)}
            disabled={autoSaveStatus === 'saving' || isSubmitting}
            className="w-full flex justify-center items-center px-4 py-2 font-medium rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4abf79] disabled:opacity-50 disabled:cursor-not-allowed transition-all border"
            style={{ backgroundColor: '#4abf79', color: '#FFFFFF', borderColor: '#4abf79' }}
          >
            <Clock className="w-4 h-4 mr-2" style={{ color: '#FFFFFF' }} />
            {autoSaveStatus === 'saving' ? '下書き保存中...' : '下書きとして保存'}
          </button>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center items-center px-4 py-3 font-bold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFB300] disabled:opacity-50 disabled:cursor-not-allowed transition-all border"
          style={{ backgroundColor: '#FFB300', color: '#FFFFFF', borderColor: '#FFB300' }}
        >
          <Save className="w-5 h-5 mr-2" style={{ color: '#FFFFFF' }} />
          {isSubmitting ? '保存中...' : editMode ? '編集を保存' : '実績を保存'}
        </button>
      </div>

      {/* 会場管理モーダル */}
      {isVenueModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" style={{ border: '2px solid #22211A' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#22211A' }}>会場管理</h3>
              <button
                type="button"
                onClick={() => setIsVenueModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" style={{ color: '#22211A' }} />
              </button>
            </div>

            {/* 新規追加 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>
                新しい会場を追加
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVenue())}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                  placeholder="会場名を入力"
                />
                <button
                  type="button"
                  onClick={addVenue}
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                  style={{ border: '1px solid #22211A', color: '#22211A' }}
                >
                  <Plus className="w-4 h-4" />
                  追加
                </button>
              </div>
            </div>

            {/* 会場リスト */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>
                登録済み会場 ({venues.length})
              </label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {venues.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    登録されている会場がありません
                  </p>
                ) : (
                  venues.map((venue, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                    >
                      {editingVenueIndex === index ? (
                        <>
                          <input
                            type="text"
                            value={editingVenueName}
                            onChange={(e) => setEditingVenueName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), updateVenue(index))}
                            className="flex-1 px-2 py-1 border rounded"
                            style={{ borderColor: '#22211A', color: '#22211A' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => updateVenue(index)}
                            className="px-2 py-1 text-sm rounded hover:bg-green-100"
                            style={{ color: '#22211A' }}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVenueIndex(null)
                              setEditingVenueName('')
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-gray-200"
                            style={{ color: '#22211A' }}
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1" style={{ color: '#22211A' }}>{venue}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVenueIndex(index)
                              setEditingVenueName(venue)
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-blue-100"
                            style={{ color: '#22211A' }}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`「${venue}」を削除しますか？`)) {
                                deleteVenue(index)
                              }
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-red-100"
                            style={{ color: '#dc2626' }}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVenueModalOpen(false)}
                className="px-4 py-2 rounded-lg hover:bg-gray-100"
                style={{ border: '1px solid #22211A', color: '#22211A' }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 代理店管理モーダル */}
      {isAgencyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" style={{ border: '2px solid #22211A' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#22211A' }}>代理店管理</h3>
              <button
                type="button"
                onClick={() => setIsAgencyModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" style={{ color: '#22211A' }} />
              </button>
            </div>

            {/* 新規追加 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>
                新しい代理店を追加
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAgencyName}
                  onChange={(e) => setNewAgencyName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAgency())}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                  placeholder="代理店名を入力"
                />
                <button
                  type="button"
                  onClick={addAgency}
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                  style={{ border: '1px solid #22211A', color: '#22211A' }}
                >
                  <Plus className="w-4 h-4" />
                  追加
                </button>
              </div>
            </div>

            {/* 代理店リスト */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>
                登録済み代理店 ({agencies.length})
              </label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {agencies.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    登録されている代理店がありません
                  </p>
                ) : (
                  agencies.map((agency, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                    >
                      {editingAgencyIndex === index ? (
                        <>
                          <input
                            type="text"
                            value={editingAgencyName}
                            onChange={(e) => setEditingAgencyName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), updateAgency(index))}
                            className="flex-1 px-2 py-1 border rounded"
                            style={{ borderColor: '#22211A', color: '#22211A' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => updateAgency(index)}
                            className="px-2 py-1 text-sm rounded hover:bg-green-100"
                            style={{ color: '#22211A' }}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAgencyIndex(null)
                              setEditingAgencyName('')
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-gray-200"
                            style={{ color: '#22211A' }}
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1" style={{ color: '#22211A' }}>{agency}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAgencyIndex(index)
                              setEditingAgencyName(agency)
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-blue-100"
                            style={{ color: '#22211A' }}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`「${agency}」を削除しますか？`)) {
                                deleteAgency(index)
                              }
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-red-100"
                            style={{ color: '#dc2626' }}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAgencyModalOpen(false)}
                className="px-4 py-2 rounded-lg hover:bg-gray-100"
                style={{ border: '1px solid #22211A', color: '#22211A' }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スタッフ管理モーダル */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" style={{ border: '2px solid #22211A' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#22211A' }}>スタッフ管理</h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" style={{ color: '#22211A' }} />
              </button>
            </div>

            {/* 新規追加 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>
                新しいスタッフを追加
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStaffToList())}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                  placeholder="スタッフ名を入力"
                />
                <button
                  type="button"
                  onClick={addStaffToList}
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                  style={{ border: '1px solid #22211A', color: '#22211A' }}
                >
                  <Plus className="w-4 h-4" />
                  追加
                </button>
              </div>
            </div>

            {/* スタッフリスト */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#22211A' }}>
                登録済みスタッフ ({staffList.length})
              </label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {staffList.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    登録されているスタッフがいません
                  </p>
                ) : (
                  staffList.map((staff, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                    >
                      {editingStaffIndex === index ? (
                        <>
                          <input
                            type="text"
                            value={editingStaffName}
                            onChange={(e) => setEditingStaffName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), updateStaff(index))}
                            className="flex-1 px-2 py-1 border rounded"
                            style={{ borderColor: '#22211A', color: '#22211A' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => updateStaff(index)}
                            className="px-2 py-1 text-sm rounded hover:bg-green-100"
                            style={{ color: '#22211A' }}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaffIndex(null)
                              setEditingStaffName('')
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-gray-200"
                            style={{ color: '#22211A' }}
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1" style={{ color: '#22211A' }}>{staff}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaffIndex(index)
                              setEditingStaffName(staff)
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-blue-100"
                            style={{ color: '#22211A' }}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`「${staff}」を削除しますか？`)) {
                                deleteStaff(index)
                              }
                            }}
                            className="px-2 py-1 text-sm rounded hover:bg-red-100"
                            style={{ color: '#dc2626' }}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 rounded-lg hover:bg-gray-100"
                style={{ border: '1px solid #22211A', color: '#22211A' }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}