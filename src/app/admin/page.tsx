'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Users, CheckCircle, XCircle, Clock, AlertCircle, Calculator, Save, Edit2, Trash2, X, Database, Calendar, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, Check } from 'lucide-react'
import { LoadingAnimation } from '@/components/loading-animation'
import { MagneticDots } from '@/components/MagneticDots'

interface ApprovalRequest {
  id: string
  user_id: string
  requested_role: 'user' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  profiles: {
    email: string
    display_name: string
  }
}

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
  created_at: string
  created_by?: string
}

interface EventData {
  id: string
  venue: string
  agency_name: string
  start_date: string
  end_date: string
  year: number
  month: number
  week_number: number
  created_at: string
  target_hs_total?: number
  target_au_mnp?: number
  target_uq_mnp?: number
  target_au_new?: number
  target_uq_new?: number
  actual_hs_total?: number
  actual_au_mnp?: number
  actual_uq_mnp?: number
  actual_au_new?: number
  actual_uq_new?: number
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState(null)
  const [idCalculationList, setIdCalculationList] = useState<IdCalculationData[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [eventsList, setEventsList] = useState<EventData[]>([])
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'date' | 'venue' | 'achievement'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterYear, setFilterYear] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterWeek, setFilterWeek] = useState<string>('')
  const [filterVenue, setFilterVenue] = useState<string>('')
  const [editAdminId, setEditAdminId] = useState('')
  const [editAdminPassword, setEditAdminPassword] = useState('')
  const [showAdminSettings, setShowAdminSettings] = useState(false)
  const [adminSettingsSaved, setAdminSettingsSaved] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const supabase = createClient()

  // 新規ID計算用データの状態
  const [calculationData, setCalculationData] = useState({
    startYear: '',
    startMonth: '',
    endYear: '',
    endMonth: '',
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
    checkAuthAndFetchData()
  }, [])

  useEffect(() => {
    setEditAdminId(localStorage.getItem('adminId') || 'SHELA')
    setEditAdminPassword(localStorage.getItem('adminPassword') || 'Pw123123')
  }, [])


  const checkAuthAndFetchData = async () => {
    try {
      // 認証状態を確認（一時的に認証チェックをスキップ）
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      console.log('認証状態確認:', { user, authError })

      // 一時的に認証チェックをコメントアウト
      /*
      if (authError || !user) {
        console.error('認証エラー:', authError)
        alert('ログインが必要です。ログインページにリダイレクトします。')
        window.location.href = '/auth/login'
        return
      }
      */

      if (user) {
        setUser(user)

        // プロファイルを確認
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        console.log('プロファイル確認:', { profile, profileError })

        if (profile) {
          setUserProfile(profile)
        }

        // 管理者権限確認（一時的に無効化）
        /*
        if (profile.role !== 'admin' || profile.status !== 'approved') {
          alert('管理者権限が必要です。')
          window.location.href = '/dashboard'
          return
        }
        */
      }

      // データを取得
      await fetchPendingRequests()
      await fetchIdCalculationData()
      await fetchEventsData()

    } catch (error) {
      console.error('認証チェックエラー:', error)
      // alert('認証の確認に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ID計算データ一覧を取得
  const fetchIdCalculationData = async () => {
    try {
      const { data, error } = await supabase
        .from('id_calculation_data')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('ID計算データ取得エラー:', error)
      } else {
        setIdCalculationList(data || [])
      }
    } catch (error) {
      console.error('予期しないエラー:', error)
    }
  }

  // ID計算データを削除
  const handleDeleteCalculationData = async (id: string) => {
    if (!confirm('このデータを削除しますか？')) return

    setDeleting(id)
    try {
      const { error } = await supabase
        .from('id_calculation_data')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('削除エラー:', error)
        alert(`削除に失敗しました: ${error.message}`)
      } else {
        alert('データを削除しました')
        await fetchIdCalculationData()
      }
    } catch (error) {
      console.error('削除処理エラー:', error)
      alert(`削除処理中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setDeleting(null)
    }
  }

  // 編集モードに切り替え
  const startEditing = (data: IdCalculationData) => {
    const startDate = new Date(data.calculation_period_start)
    const endDate = new Date(data.calculation_period_end)

    setCalculationData({
      startYear: startDate.getFullYear().toString(),
      startMonth: (startDate.getMonth() + 1).toString(),
      endYear: endDate.getFullYear().toString(),
      endMonth: (endDate.getMonth() + 1).toString(),
      auMnpSp1: data.au_mnp_sp1.toString(),
      auMnpSp2: data.au_mnp_sp2.toString(),
      auMnpSim: data.au_mnp_sim.toString(),
      uqMnpSp1: data.uq_mnp_sp1.toString(),
      uqMnpSp2: data.uq_mnp_sp2.toString(),
      uqMnpSim: data.uq_mnp_sim.toString(),
      auHsSp1: data.au_hs_sp1.toString(),
      auHsSp2: data.au_hs_sp2.toString(),
      auHsSim: data.au_hs_sim.toString(),
      uqHsSp1: data.uq_hs_sp1.toString(),
      uqHsSp2: data.uq_hs_sp2.toString(),
      uqHsSim: data.uq_hs_sim.toString(),
      cellupSp1: data.cellup_sp1.toString(),
      cellupSp2: data.cellup_sp2.toString(),
      cellupSim: data.cellup_sim.toString()
    })
    setEditingId(data.id)
  }

  // 編集をキャンセル
  const cancelEditing = () => {
    setEditingId(null)
    // フォームをリセット
    setCalculationData({
      startYear: '',
      startMonth: '',
      endYear: '',
      endMonth: '',
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
  }

  // イベント実績データ一覧を取得
  const fetchEventsData = async () => {
    try {
      // event_summaryビューを使用してデータを取得
      const { data, error } = await supabase
        .from('event_summary')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('イベントデータ取得エラー:', error)
      } else {
        setEventsList(data || [])
      }
    } catch (error) {
      console.error('予期しないエラー:', error)
    }
  }

  // イベントデータを削除
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('このイベントとすべての関連データを削除しますか？\n削除すると元に戻せません。')) return

    setDeletingEvent(eventId)
    try {
      // 関連するパフォーマンスデータも一緒に削除される（カスケード削除）
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) {
        console.error('削除エラー:', error)
        alert(`削除に失敗しました: ${error.message}`)
      } else {
        alert('イベントデータを削除しました')
        await fetchEventsData()
      }
    } catch (error) {
      console.error('削除処理エラー:', error)
      alert(`削除処理中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setDeletingEvent(null)
    }
  }

  // イベント詳細の展開/折りたたみ
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  // ソート機能
  const handleSort = (field: 'date' | 'venue' | 'achievement') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // フィルタ用のユニーク値を取得
  const getUniqueYears = () => {
    const years = [...new Set(eventsList.map(event => event.year))].sort((a, b) => b - a)
    return years
  }

  const getUniqueMonths = () => {
    const months = [...new Set(eventsList.map(event => event.month))].sort((a, b) => a - b)
    return months
  }

  const getUniqueWeeks = () => {
    const weeks = [...new Set(eventsList.map(event => event.week_number))].sort((a, b) => a - b)
    return weeks
  }

  const getUniqueVenues = () => {
    const venues = [...new Set(eventsList.map(event => event.venue))].sort()
    return venues
  }

  // フィルタリング機能
  const getFilteredEvents = () => {
    return eventsList.filter(event => {
      if (filterYear && event.year.toString() !== filterYear) return false
      if (filterMonth && event.month.toString() !== filterMonth) return false
      if (filterWeek && event.week_number.toString() !== filterWeek) return false
      if (filterVenue && event.venue !== filterVenue) return false
      return true
    })
  }

  // ソートされたイベントリストを取得
  const getSortedAndFilteredEvents = () => {
    return [...getFilteredEvents()].sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'date':
          compareValue = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          break
        case 'venue':
          compareValue = a.venue.localeCompare(b.venue, 'ja')
          break
        case 'achievement':
          const aAchievement = (a.actual_hs_total || 0) / Math.max(a.target_hs_total || 1, 1)
          const bAchievement = (b.actual_hs_total || 0) / Math.max(b.target_hs_total || 1, 1)
          compareValue = aAchievement - bAchievement
          break
      }

      return sortOrder === 'asc' ? compareValue : -compareValue
    })
  }

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          profiles!user_id (
            email,
            display_name
          )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (requestId: string, userId: string, role: string, approve: boolean) => {
    setProcessing(requestId)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証エラー')

      // 承認申請を更新
      const { error: requestError } = await supabase
        .from('approval_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (requestError) throw requestError

      // プロファイルを更新
      if (approve) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role,
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (profileError) throw profileError
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            status: 'rejected',
          })
          .eq('id', userId)

        if (profileError) throw profileError
      }

      // リストを更新
      await fetchPendingRequests()
    } catch (error) {
      console.error('Error processing approval:', error)
      alert('処理に失敗しました')
    } finally {
      setProcessing(null)
    }
  }

  // 新規ID計算用データの保存
  const handleSaveCalculationData = async () => {
    setSaving(true)

    try {
      // 入力検証
      if (!calculationData.startYear || !calculationData.startMonth ||
          !calculationData.endYear || !calculationData.endMonth) {
        alert('算定期間を入力してください')
        return
      }

      // 一時的にユーザー認証チェックを緩和
      console.log('現在のユーザー:', user)
      console.log('現在のプロファイル:', userProfile)

      const dataToSave = {
        calculation_period_start: `${calculationData.startYear}-${calculationData.startMonth.padStart(2, '0')}-01`,
        calculation_period_end: `${calculationData.endYear}-${calculationData.endMonth.padStart(2, '0')}-01`,
        au_mnp_sp1: parseInt(calculationData.auMnpSp1) || 0,
        au_mnp_sp2: parseInt(calculationData.auMnpSp2) || 0,
        au_mnp_sim: parseInt(calculationData.auMnpSim) || 0,
        uq_mnp_sp1: parseInt(calculationData.uqMnpSp1) || 0,
        uq_mnp_sp2: parseInt(calculationData.uqMnpSp2) || 0,
        uq_mnp_sim: parseInt(calculationData.uqMnpSim) || 0,
        au_hs_sp1: parseInt(calculationData.auHsSp1) || 0,
        au_hs_sp2: parseInt(calculationData.auHsSp2) || 0,
        au_hs_sim: parseInt(calculationData.auHsSim) || 0,
        uq_hs_sp1: parseInt(calculationData.uqHsSp1) || 0,
        uq_hs_sp2: parseInt(calculationData.uqHsSp2) || 0,
        uq_hs_sim: parseInt(calculationData.uqHsSim) || 0,
        cellup_sp1: parseInt(calculationData.cellupSp1) || 0,
        cellup_sp2: parseInt(calculationData.cellupSp2) || 0,
        cellup_sim: parseInt(calculationData.cellupSim) || 0,
        // created_by と created_at は一時的にオプショナルにする
        ...(user ? { created_by: user.id } : {}),
        created_at: new Date().toISOString()
      }

      console.log('保存するデータ:', dataToSave)

      // テーブルの存在確認
      const { data: tableCheck, error: tableError } = await supabase
        .from('id_calculation_data')
        .select('*')
        .limit(1)

      if (tableError) {
        console.error('テーブル確認エラー:', tableError)
        alert(`テーブルにアクセスできません: ${tableError.message}`)
        return
      }

      console.log('テーブル確認成功:', tableCheck)

      // データ保存（挿入または更新）
      let data, error

      if (editingId) {
        // 更新
        const result = await supabase
          .from('id_calculation_data')
          .update(dataToSave)
          .eq('id', editingId)
          .select()

        data = result.data
        error = result.error
      } else {
        // 挿入
        const result = await supabase
          .from('id_calculation_data')
          .insert(dataToSave)
          .select()

        data = result.data
        error = result.error
      }

      if (error) {
        console.error('保存エラー:', error)
        alert(`データの保存に失敗しました: ${error.message}`)
        return
      }

      console.log('保存成功:', data)
      alert(editingId ? 'ID計算用データを更新しました' : '新規ID計算用データを保存しました')

      // フォームをリセット
      setCalculationData({
        startYear: '',
        startMonth: '',
        endYear: '',
        endMonth: '',
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
      setEditingId(null)

      // データを再取得
      await fetchIdCalculationData()
    } catch (error) {
      console.error('予期しないエラー:', error)
      alert(`予期しないエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAdminCredentials = () => {
    if (!editAdminId || !editAdminPassword) {
      alert('IDとパスワードを入力してください')
      return
    }
    setShowConfirmModal(true)
  }

  const confirmSaveAdminCredentials = () => {
    localStorage.setItem('adminId', editAdminId)
    localStorage.setItem('adminPassword', editAdminPassword)
    setAdminSettingsSaved(true)
    setTimeout(() => setAdminSettingsSaved(false), 3000)
    setShowConfirmModal(false)
    alert('管理者ID/パスワードを更新しました')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
        <LoadingAnimation />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6 pb-16 md:pb-6" style={{ paddingTop: '5rem' }}>
      <MagneticDots />
      <div className="fade-in">
        <div className="mb-4 md:mb-8">
          <div className="glass rounded-xl p-3 md:p-6 mb-3 md:mb-6 border shadow-lg hover:shadow-xl transition-all duration-300" style={{
            borderColor: '#22211A',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            transform: 'translateY(-2px)'
          }}>
            <div className="flex items-center mb-2 md:mb-4">
              <div className="w-8 md:w-10 h-8 md:h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-2 md:mr-4 shadow-md">
                <Shield className="w-4 md:w-5 h-4 md:h-5" style={{ color: '#22211A' }} />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                管理者ダッシュボード
              </h1>
            </div>
            <p className="text-sm md:text-lg text-gray-600 leading-relaxed">
              ユーザーの承認申請を管理できます
            </p>
          </div>
        </div>

        {/* 管理者ID/パスワード設定パネル */}
        <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant mb-8" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center" style={{ color: '#22211A' }}>
              <Shield className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
              管理者認証設定
            </h2>
            <button
              onClick={() => setShowAdminSettings(!showAdminSettings)}
              className="text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: '#FFB300' }}
            >
              {showAdminSettings ? '閉じる' : '編集'}
            </button>
          </div>

          {showAdminSettings && (
            <div className="space-y-4">
              {adminSettingsSaved && (
                <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#4abf7920', color: '#4abf79' }}>
                  <p className="text-sm font-semibold">✓ 設定を保存しました</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#22211A' }}>
                  管理者ID
                </label>
                <input
                  type="text"
                  value={editAdminId}
                  onChange={(e) => setEditAdminId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                  placeholder="管理者IDを入力"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#22211A' }}>
                  パスワード
                </label>
                <input
                  type="password"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                  placeholder="パスワードを入力"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAdminCredentials}
                  className="px-6 py-3 rounded-lg font-bold transition-all hover:opacity-90 flex items-center"
                  style={{ backgroundColor: '#4abf79', color: '#FFFFFF' }}
                >
                  <Save className="w-5 h-5 mr-2" />
                  保存
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 新規ID計算用データ入力パネル */}
        <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant mb-8" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#22211A' }}>
            <Calculator className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
            新規ID計算用データ入力パネル
          </h2>

          <div className="space-y-4">
            {/* 算定期間 */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#22211A' }}>
                算定期間
              </label>
              <div className="flex items-center space-x-2">
                <select
                  value={calculationData.startYear}
                  onChange={(e) => setCalculationData({ ...calculationData, startYear: e.target.value })}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">年</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </select>
                <span style={{ color: '#22211A' }}>年</span>
                <select
                  value={calculationData.startMonth}
                  onChange={(e) => setCalculationData({ ...calculationData, startMonth: e.target.value })}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <span style={{ color: '#22211A' }}>月</span>
                <span style={{ color: '#22211A' }}>～</span>
                <select
                  value={calculationData.endYear}
                  onChange={(e) => setCalculationData({ ...calculationData, endYear: e.target.value })}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">年</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </select>
                <span style={{ color: '#22211A' }}>年</span>
                <select
                  value={calculationData.endMonth}
                  onChange={(e) => setCalculationData({ ...calculationData, endMonth: e.target.value })}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <span style={{ color: '#22211A' }}>月</span>
              </div>
            </div>

            {/* データ入力グリッド */}
            <div className="grid grid-cols-5 gap-4">
              {/* au MNP */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold whitespace-nowrap text-left mb-2" style={{ color: '#22211A' }}>au MNP</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.auMnpSp1}
                      onChange={(e) => setCalculationData({ ...calculationData, auMnpSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.auMnpSp2}
                      onChange={(e) => setCalculationData({ ...calculationData, auMnpSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.auMnpSim}
                      onChange={(e) => setCalculationData({ ...calculationData, auMnpSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                </div>
              </div>

              {/* UQ MNP */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold whitespace-nowrap text-left mb-2" style={{ color: '#22211A' }}>UQ MNP</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.uqMnpSp1}
                      onChange={(e) => setCalculationData({ ...calculationData, uqMnpSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.uqMnpSp2}
                      onChange={(e) => setCalculationData({ ...calculationData, uqMnpSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.uqMnpSim}
                      onChange={(e) => setCalculationData({ ...calculationData, uqMnpSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                </div>
              </div>

              {/* au HS */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold whitespace-nowrap text-left mb-2" style={{ color: '#22211A' }}>au HS</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.auHsSp1}
                      onChange={(e) => setCalculationData({ ...calculationData, auHsSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.auHsSp2}
                      onChange={(e) => setCalculationData({ ...calculationData, auHsSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.auHsSim}
                      onChange={(e) => setCalculationData({ ...calculationData, auHsSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                </div>
              </div>

              {/* UQ HS */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold whitespace-nowrap text-left mb-2" style={{ color: '#22211A' }}>UQ HS</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.uqHsSp1}
                      onChange={(e) => setCalculationData({ ...calculationData, uqHsSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.uqHsSp2}
                      onChange={(e) => setCalculationData({ ...calculationData, uqHsSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.uqHsSim}
                      onChange={(e) => setCalculationData({ ...calculationData, uqHsSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                </div>
              </div>

              {/* セルアップ */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold whitespace-nowrap text-left mb-2" style={{ color: '#22211A' }}>セルアップ</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP1</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.cellupSp1}
                      onChange={(e) => setCalculationData({ ...calculationData, cellupSp1: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SP2</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.cellupSp2}
                      onChange={(e) => setCalculationData({ ...calculationData, cellupSp2: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs whitespace-nowrap w-10" style={{ color: '#22211A' }}>SIM単</span>
                    <span className="text-xs" style={{ color: '#22211A' }}>=</span>
                    <input
                      type="number"
                      min="0"
                      value={calculationData.cellupSim}
                      onChange={(e) => setCalculationData({ ...calculationData, cellupSim: e.target.value })}
                      className="w-12 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#FFB300]"
                      style={{ borderColor: '#22211A' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 保存・キャンセルボタン */}
            <div className="flex justify-end space-x-3">
              {editingId && (
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-6 py-3 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-white"
                  style={{ backgroundColor: '#6b7280' }}
                >
                  <X className="w-5 h-5 mr-2" />
                  キャンセル
                </button>
              )}
              <button
                onClick={handleSaveCalculationData}
                disabled={saving}
                className="px-6 py-3 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-white"
                style={{ backgroundColor: '#4abf79' }}
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? (editingId ? '更新中...' : '保存中...') : (editingId ? '更新' : '保存')}
              </button>
            </div>
          </div>
        </div>

        {/* ID計算データ一覧 */}
        <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant mb-8" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#22211A' }}>
            <Calculator className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
            登録済みID計算データ
          </h2>

          {idCalculationList.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.5 }} />
              <p style={{ color: '#22211A' }}>登録されているID計算データはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {idCalculationList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-background/50 rounded-xl border border-border/50"
                  style={{ borderColor: 'rgba(34, 33, 26, 0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <span className="font-medium text-lg" style={{ color: '#22211A' }}>
                          算定期間: {new Date(item.calculation_period_start).toLocaleDateString('ja-JP')} ～ {new Date(item.calculation_period_end).toLocaleDateString('ja-JP')}
                        </span>
                        {editingId === item.id && (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-sm" style={{
                            backgroundColor: 'rgba(255, 179, 0, 0.1)',
                            color: '#FFB300'
                          }}>
                            編集中
                          </span>
                        )}
                      </div>
                      <div className="text-sm opacity-70" style={{ color: '#22211A' }}>
                        作成日: {new Date(item.created_at).toLocaleDateString('ja-JP')} {new Date(item.created_at).toLocaleTimeString('ja-JP')}
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                        <div>au MNP: SP1={item.au_mnp_sp1}, SP2={item.au_mnp_sp2}, SIM={item.au_mnp_sim}</div>
                        <div>UQ MNP: SP1={item.uq_mnp_sp1}, SP2={item.uq_mnp_sp2}, SIM={item.uq_mnp_sim}</div>
                        <div>au HS: SP1={item.au_hs_sp1}, SP2={item.au_hs_sp2}, SIM={item.au_hs_sim}</div>
                        <div>UQ HS: SP1={item.uq_hs_sp1}, SP2={item.uq_hs_sp2}, SIM={item.uq_hs_sim}</div>
                        <div>セルアップ: SP1={item.cellup_sp1}, SP2={item.cellup_sp2}, SIM={item.cellup_sim}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => startEditing(item)}
                        disabled={saving || deleting === item.id}
                        className="px-3 py-2 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-white text-sm"
                        style={{ backgroundColor: '#FFB300' }}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteCalculationData(item.id)}
                        disabled={saving || deleting === item.id}
                        className="px-3 py-2 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-white text-sm"
                        style={{ backgroundColor: '#ef4444' }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {deleting === item.id ? '削除中...' : '削除'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* イベント実績一覧 */}
        <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant mb-8" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid' }}>
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center mb-2 sm:mb-0" style={{ color: '#22211A' }}>
                <Database className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
                イベント実績一覧
              </h2>

              <div className="flex items-center space-x-4 text-sm">
                <div className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#FFB300' }}>
                  総イベント数: {eventsList.length}件
                </div>
                <div className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(74, 191, 121, 0.1)', color: '#4abf79' }}>
                  表示中: {getSortedAndFilteredEvents().length}件
                </div>
              </div>
            </div>

            {/* フィルター機能 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* 年フィルター */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>年</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">すべての年</option>
                  {getUniqueYears().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>

              {/* 月フィルター */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>月</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">すべての月</option>
                  {getUniqueMonths().map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>

              {/* 週フィルター */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>週</label>
                <select
                  value={filterWeek}
                  onChange={(e) => setFilterWeek(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">すべての週</option>
                  {getUniqueWeeks().map(week => (
                    <option key={week} value={week}>第{week}週</option>
                  ))}
                </select>
              </div>

              {/* 会場フィルター */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>会場名</label>
                <select
                  value={filterVenue}
                  onChange={(e) => setFilterVenue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
                  style={{ borderColor: '#22211A' }}
                >
                  <option value="">すべての会場</option>
                  {getUniqueVenues().map(venue => (
                    <option key={venue} value={venue}>{venue}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ソート機能 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium" style={{ color: '#22211A' }}>並び替え:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSort('date')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors ${
                      sortBy === 'date' ? 'text-white' : 'hover:opacity-70'
                    }`}
                    style={{
                      backgroundColor: sortBy === 'date' ? '#FFB300' : 'transparent',
                      color: sortBy === 'date' ? 'white' : '#22211A'
                    }}
                  >
                    <span>日付</span>
                    {sortBy === 'date' && (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSort('venue')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors ${
                      sortBy === 'venue' ? 'text-white' : 'hover:opacity-70'
                    }`}
                    style={{
                      backgroundColor: sortBy === 'venue' ? '#FFB300' : 'transparent',
                      color: sortBy === 'venue' ? 'white' : '#22211A'
                    }}
                  >
                    <span>会場名</span>
                    {sortBy === 'venue' && (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSort('achievement')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors ${
                      sortBy === 'achievement' ? 'text-white' : 'hover:opacity-70'
                    }`}
                    style={{
                      backgroundColor: sortBy === 'achievement' ? '#FFB300' : 'transparent',
                      color: sortBy === 'achievement' ? 'white' : '#22211A'
                    }}
                  >
                    <span>達成率</span>
                    {sortBy === 'achievement' && (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setFilterYear('')
                  setFilterMonth('')
                  setFilterWeek('')
                  setFilterVenue('')
                }}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors flex items-center space-x-2"
                style={{ borderColor: '#22211A' }}
              >
                <X className="w-4 h-4" style={{ color: '#22211A' }} />
                <span className="text-sm" style={{ color: '#22211A' }}>フィルタークリア</span>
              </button>
            </div>
          </div>

          {eventsList.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.5 }} />
              <p style={{ color: '#22211A' }}>登録されているイベントデータはありません</p>
            </div>
          ) : getSortedAndFilteredEvents().length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.5 }} />
              <p style={{ color: '#22211A' }}>検索条件に一致するイベントが見つかりません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getSortedAndFilteredEvents().map((event) => (
                <div
                  key={event.id}
                  className="p-4 bg-background/50 rounded-xl border border-border/50"
                  style={{ borderColor: 'rgba(34, 33, 26, 0.2)' }}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div
                          className="flex items-center space-x-4 mb-2 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
                          onClick={() => toggleEventExpansion(event.id)}
                        >
                          <div className="flex items-center">
                            {expandedEvents.has(event.id) ? (
                              <ChevronDown className="w-5 h-5" style={{ color: '#FFB300' }} />
                            ) : (
                              <ChevronRight className="w-5 h-5" style={{ color: '#FFB300' }} />
                            )}
                            <Calendar className="w-5 h-5 ml-2" style={{ color: '#FFB300' }} />
                          </div>
                          <div>
                            <span className="font-medium text-lg" style={{ color: '#22211A' }}>
                              {event.venue} ({event.agency_name})
                            </span>
                            <div className="text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
                              {new Date(event.start_date).toLocaleDateString('ja-JP')} ～ {new Date(event.end_date).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        </div>

                        {expandedEvents.has(event.id) && (
                          <div className="ml-8 mt-3">
                            <div className="text-sm mb-3" style={{ color: '#22211A', opacity: 0.7 }}>
                              作成日: {new Date(event.created_at).toLocaleDateString('ja-JP')} {new Date(event.created_at).toLocaleTimeString('ja-JP')}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>目標HS合計</div>
                                <div style={{ color: '#22211A' }}>{event.target_hs_total || 0}件</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>実績HS合計</div>
                                <div style={{ color: '#22211A' }}>{event.actual_hs_total || 0}件</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>au MNP</div>
                                <div style={{ color: '#22211A' }}>目標:{event.target_au_mnp || 0} 実績:{event.actual_au_mnp || 0}</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>UQ MNP</div>
                                <div style={{ color: '#22211A' }}>目標:{event.target_uq_mnp || 0} 実績:{event.actual_uq_mnp || 0}</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>au 新規</div>
                                <div style={{ color: '#22211A' }}>目標:{event.target_au_new || 0} 実績:{event.actual_au_new || 0}</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>UQ 新規</div>
                                <div style={{ color: '#22211A' }}>目標:{event.target_uq_new || 0} 実績:{event.actual_uq_new || 0}</div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>達成状況</div>
                                <div style={{
                                  color: (event.actual_hs_total || 0) >= (event.target_hs_total || 0) ? '#4abf79' : '#ef4444'
                                }}>
                                  {(event.actual_hs_total || 0) >= (event.target_hs_total || 0) ? '達成' : '未達成'}
                                </div>
                              </div>
                              <div className="bg-gray-100 p-2 rounded">
                                <div className="font-semibold" style={{ color: '#22211A' }}>期間</div>
                                <div style={{ color: '#22211A' }}>{event.year}年{event.month}月 第{event.week_number}週</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center ml-4">
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={deletingEvent === event.id}
                          className="px-3 py-2 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-white text-sm"
                          style={{ backgroundColor: '#ef4444' }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {deletingEvent === event.id ? '削除中...' : '削除'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 border border-border/50 shadow-elegant" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center" style={{ color: '#22211A' }}>
            <Clock className="w-5 h-5 mr-2" style={{ color: '#FFB300' }} />
            承認待ちリスト
          </h2>

          {requests.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.5 }} />
              <p style={{ color: '#22211A' }}>承認待ちのリクエストはありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-background/50 rounded-xl border border-border/50"
                  style={{ borderColor: 'rgba(34, 33, 26, 0.2)' }}
                >
                  <div className="flex items-center space-x-1">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Users className="w-5 h-5" style={{ color: '#22211A' }} />
                        <span className="font-medium" style={{ color: '#22211A' }}>
                          {request.profiles.display_name}
                        </span>
                        <span className="text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
                          ({request.profiles.email})
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg" style={{
                          backgroundColor: request.requested_role === 'admin' ? 'rgba(255, 179, 0, 0.1)' : 'rgba(34, 33, 26, 0.1)',
                          color: request.requested_role === 'admin' ? '#FFB300' : '#22211A'
                        }}>
                          {request.requested_role === 'admin' ? '管理者' : 'ユーザー'}申請
                        </span>
                        <span style={{ color: '#22211A', opacity: 0.7 }}>
                          申請日: {new Date(request.requested_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApproval(request.id, request.user_id, request.requested_role, true)}
                        disabled={processing === request.id}
                        className="px-4 py-2 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-white"
                        style={{ backgroundColor: '#4abf79' }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        承認
                      </button>
                      <button
                        onClick={() => handleApproval(request.id, request.user_id, request.requested_role, false)}
                        disabled={processing === request.id}
                        className="px-4 py-2 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-white"
                        style={{ backgroundColor: '#ef4444' }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        拒否
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 mx-4 max-w-md w-full" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFB300' }}>
                <Shield className="w-8 h-8" style={{ color: '#FFFFFF' }} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#22211A' }}>認証情報の変更</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#22211A', opacity: 0.7 }}>
              本当にパスワードを変更しますか？
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-lg font-bold transition-all hover:opacity-80"
                style={{ backgroundColor: '#9E9E9E', color: '#FFFFFF' }}
              >
                キャンセル
              </button>
              <button
                onClick={confirmSaveAdminCredentials}
                className="flex-1 py-3 rounded-lg font-bold transition-all hover:opacity-90"
                style={{ backgroundColor: '#FFB300', color: '#FFFFFF' }}
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}