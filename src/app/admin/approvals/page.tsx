'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, User, CheckCircle, XCircle, Clock, Mail } from 'lucide-react'
import { LoadingAnimation } from '@/components/loading-animation'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadApprovals()
  }, [])

  const checkAuthAndLoadApprovals = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/auth/login')
      return
    }

    console.log('Current user ID:', session.user.id)

    // オーナー/管理者権限チェック
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    console.log('Current user profile:', profile, 'Error:', profileError)

    if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
      console.log('Not authorized, redirecting to home')
      router.push('/')
      return
    }

    // 承認待ちユーザーを取得（デバッグ情報を追加）
    console.log('Fetching pending users...')
    const { data: pendingUsers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    console.log('Pending users result:', pendingUsers, 'Error:', error)

    if (error) {
      console.error('Error fetching pending users:', error)
      // エラーが発生した場合でも画面は表示する
      setApprovals([])
    } else {
      setApprovals(pendingUsers || [])
    }
    setLoading(false)
  }

  const handleApprove = async (userId: string, requestedRole: string) => {
    setProcessing(userId)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'approved',
        role: requestedRole,
        approved_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (!error) {
      setApprovals(prev => prev.filter(a => a.id !== userId))
    }
    setProcessing(null)
  }

  const handleReject = async (userId: string) => {
    setProcessing(userId)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        approved_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (!error) {
      setApprovals(prev => prev.filter(a => a.id !== userId))
    }
    setProcessing(null)
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">承認待ちユーザー管理</h1>
          <p className="text-muted-foreground">新規登録ユーザーの承認/拒否を行います</p>
        </div>

        {approvals.length === 0 ? (
          <div className="bg-card rounded-xl p-12 text-center border border-border">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">承認待ちのユーザーはいません</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {approvals.map((user) => (
              <div key={user.id} className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <User className="w-5 h-5 text-primary mr-2" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {user.display_name || 'ユーザー'}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        {user.email}
                      </div>
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        申請権限: {user.requested_role === 'admin' ? '管理者' : 'ユーザー'}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        申請日時: {new Date(user.created_at).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(user.id, user.requested_role)}
                      disabled={processing === user.id}
                      className="flex items-center px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                    >
                      {processing === user.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-success-foreground" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          承認
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={processing === user.id}
                      className="flex items-center px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
                    >
                      {processing === user.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive-foreground" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          拒否
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}