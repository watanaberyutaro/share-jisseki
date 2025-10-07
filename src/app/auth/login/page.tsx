'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(`ログインに失敗しました: ${error.message}`)
        return
      }

      if (!data.user) {
        setError('ユーザーデータが取得できませんでした')
        return
      }

      // プロファイルの確認
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // プロファイルが存在しない場合は作成
        const isOwner = email === 'harukadmla@gmail.com'
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            display_name: isOwner ? 'オーナー' : 'ユーザー',
            role: isOwner ? 'owner' : 'user',
            status: isOwner ? 'approved' : 'pending',
            requested_role: isOwner ? 'owner' : 'user',
            approved_at: isOwner ? new Date().toISOString() : null
          })
        
        if (createError) {
          setError('プロファイルの作成に失敗しました')
          return
        }

        // オーナー以外は承認待ち
        if (!isOwner) {
          setError('アカウントが作成されました。管理者の承認をお待ちください。')
          await supabase.auth.signOut()
          return
        }
      } else if (profileError) {
        setError('プロファイルの取得に失敗しました')
        return
      } else if (profile && profile.status !== 'approved') {
        await supabase.auth.signOut()
        setError('アカウントはまだ承認されていません。管理者の承認をお待ちください。')
        return
      }

      // ログイン成功 - ページ全体をリロード
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 border border-border/50 shadow-elegant">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">ログイン</h1>
            <p className="text-muted-foreground mt-2">
              アカウントにログインしてください
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="email@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちでない方は{' '}
              <Link
                href="/auth/signup"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                新規登録
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/setup-owner"
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              初回セットアップ（オーナーアカウント作成）
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}