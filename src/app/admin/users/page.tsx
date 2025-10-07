'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, User, Crown, Clock, CheckCircle, XCircle } from 'lucide-react'
import { LoadingAnimation } from '@/components/loading-animation'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadUsers()
  }, [])

  const checkAuthAndLoadUsers = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    // 現在のユーザー情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'owner' && profile?.role !== 'admin') {
      router.push('/')
      return
    }

    setCurrentUser(profile)

    // 全ユーザーを取得
    const { data: allUsers, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && allUsers) {
      setUsers(allUsers)
    }
    setLoading(false)
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
      <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
        <LoadingAnimation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">ユーザー管理</h1>
          <p className="text-muted-foreground">
            システムに登録されているユーザーの一覧です（現在のユーザー: {currentUser?.display_name || currentUser?.email}）
          </p>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <div key={user.id} className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {getRoleIcon(user.role)}
                    <h3 className="text-lg font-semibold text-foreground ml-2">
                      {user.display_name || 'ユーザー'}
                    </h3>
                    <div className="ml-2 flex items-center">
                      {getStatusIcon(user.status)}
                      <span className="ml-1 text-sm text-muted-foreground">
                        {user.status === 'approved' ? '承認済み' : 
                         user.status === 'pending' ? '承認待ち' : '拒否済み'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>メール: {user.email}</div>
                    <div>ロール: {
                      user.role === 'owner' ? 'オーナー' : 
                      user.role === 'admin' ? '管理者' : 'ユーザー'
                    }</div>
                    <div>申請ロール: {
                      user.requested_role === 'admin' ? '管理者' : 'ユーザー'
                    }</div>
                    <div>作成日時: {new Date(user.created_at).toLocaleString('ja-JP')}</div>
                    {user.approved_at && (
                      <div>承認日時: {new Date(user.approved_at).toLocaleString('ja-JP')}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="bg-card rounded-xl p-12 text-center border border-border">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">ユーザーが見つかりません</p>
          </div>
        )}

        <div className="mt-8 bg-card rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4">統計情報</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">
                {users.length}
              </div>
              <div className="text-sm text-muted-foreground">総ユーザー数</div>
            </div>
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.status === 'approved').length}
              </div>
              <div className="text-sm text-muted-foreground">承認済み</div>
            </div>
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">承認待ち</div>
            </div>
            <div className="bg-background/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'admin' || u.role === 'owner').length}
              </div>
              <div className="text-sm text-muted-foreground">管理者</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}