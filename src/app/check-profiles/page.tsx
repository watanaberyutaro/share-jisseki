'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Crown, Shield, Clock, CheckCircle, XCircle } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'

export default function CheckProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [authUsers, setAuthUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkData()
  }, [])

  const checkData = async () => {
    try {
      const supabase = createClient()
      // 現在のセッション確認
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setCurrentUser(session.user)
      }

      // プロファイルテーブルを確認（RLSを無視してサービスロールで確認）
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Profiles error:', profilesError)
        setError(`プロファイル取得エラー: ${profilesError.message}`)
      } else {
        setProfiles(profilesData || [])
      }

    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const createOwnerProfile = async () => {
    if (!currentUser) {
      setError('ログインが必要です')
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          email: currentUser.email,
          display_name: 'オーナー',
          role: 'owner',
          status: 'approved',
          requested_role: 'owner',
          approved_at: new Date().toISOString()
        })
        .select()

      if (error) {
        setError(`プロファイル作成エラー: ${error.message}`)
      } else {
        setError(null)
        checkData() // データを再読み込み
        alert('オーナープロファイルを作成しました！')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プロファイル作成に失敗しました')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />
      default: return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <MagneticDots />
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">プロファイル確認・修復</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 現在のユーザー情報 */}
        <div className="bg-card rounded-lg p-6 mb-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">現在のセッション</h2>
          {currentUser ? (
            <div className="space-y-2">
              <p><strong>ユーザーID:</strong> {currentUser.id}</p>
              <p><strong>メール:</strong> {currentUser.email}</p>
              <p><strong>作成日:</strong> {new Date(currentUser.created_at).toLocaleString('ja-JP')}</p>
              
              <button
                onClick={createOwnerProfile}
                className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                🚑 オーナープロファイルを強制作成
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground">ログインしていません</p>
          )}
        </div>

        {/* プロファイル一覧 */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">プロファイル一覧 ({profiles.length}件)</h2>
          
          {profiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">プロファイルが存在しません</p>
              {currentUser && (
                <p className="text-sm text-orange-600">
                  上の「オーナープロファイルを強制作成」ボタンをクリックしてオーナープロファイルを作成してください。
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(profile.role)}
                      <h3 className="font-semibold">{profile.display_name || 'ユーザー'}</h3>
                      {getStatusIcon(profile.status)}
                      <span className="text-sm text-muted-foreground">
                        ({profile.status === 'approved' ? '承認済み' : 
                          profile.status === 'pending' ? '承認待ち' : '拒否済み'})
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>ID:</strong> {profile.id}</div>
                    <div><strong>メール:</strong> {profile.email}</div>
                    <div><strong>ロール:</strong> {profile.role}</div>
                    <div><strong>申請ロール:</strong> {profile.requested_role}</div>
                    <div><strong>作成日:</strong> {new Date(profile.created_at).toLocaleString('ja-JP')}</div>
                    {profile.approved_at && (
                      <div><strong>承認日:</strong> {new Date(profile.approved_at).toLocaleString('ja-JP')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 space-x-4">
          <button
            onClick={checkData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 データを再読み込み
          </button>
          
          <a
            href="/admin/approvals"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📋 承認管理画面へ
          </a>
          
          <a
            href="/auth/login"
            className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            🔐 ログイン画面へ
          </a>
        </div>
      </div>
    </div>
  )
}