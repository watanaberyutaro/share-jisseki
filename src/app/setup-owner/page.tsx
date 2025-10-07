'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crown, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'

export default function SetupOwnerPage() {
  const [email, setEmail] = useState('harukadmla@gmail.com')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    // パスワード確認
    if (password !== confirmPassword) {
      setResult({ type: 'error', message: 'パスワードが一致しません' })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setResult({ type: 'error', message: 'パスワードは6文字以上で入力してください' })
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      // 1. アカウント作成
      console.log('オーナーアカウント作成中...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: 'オーナー',
            requested_role: 'owner',
          }
        }
      })

      if (error) {
        if (error.message.includes('User already registered')) {
          // 既に登録済みの場合はログインを試行
          console.log('既に登録済み。ログインを試行中...')
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (loginError) {
            setResult({ 
              type: 'error', 
              message: `ログインに失敗しました: ${loginError.message}`
            })
            return
          }

          // ログイン成功 - プロファイルを確認/作成
          await handleProfileSetup(loginData.user.id)
          
        } else {
          throw error
        }
      } else if (data.user) {
        // 新規作成成功 - プロファイルを作成
        console.log('新規アカウント作成成功')
        await handleProfileSetup(data.user.id)
      }

    } catch (err) {
      console.error('セットアップエラー:', err)
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'セットアップに失敗しました'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSetup = async (userId: string) => {
    try {
      const supabase = createClient()
      console.log('プロファイル設定中...')

      // プロファイルを作成/更新
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          display_name: 'オーナー',
          role: 'owner',
          status: 'approved',
          requested_role: 'owner',
          approved_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error('プロファイル作成エラー:', error)
        setResult({
          type: 'error',
          message: `プロファイル作成に失敗: ${error.message}`
        })
      } else {
        console.log('プロファイル作成成功:', data)
        setResult({
          type: 'success',
          message: 'オーナーアカウントのセットアップが完了しました！ログイン画面に移動してログインしてください。'
        })
      }
    } catch (err) {
      console.error('プロファイルセットアップエラー:', err)
      setResult({
        type: 'error',
        message: 'プロファイルのセットアップに失敗しました'
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <MagneticDots />
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 border border-border/50 shadow-elegant">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">オーナーアカウントセットアップ</h1>
            <p className="text-muted-foreground mt-2">
              初期オーナーアカウントを作成します
            </p>
          </div>

          {result && (
            <div className={`mb-6 p-4 rounded-xl ${
              result.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              <div className="flex items-start space-x-2">
                {result.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                )}
                <div className={`text-sm ${
                  result.type === 'success' ? 'text-green-700' : 'text-destructive'
                }`}>
                  <p>{result.message}</p>
                  {result.message.includes('39 seconds') && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-blue-700 font-medium">代替方法:</p>
                      <p className="text-blue-600 text-xs mt-1">
                        レート制限を回避するため、Supabaseダッシュボードから直接ユーザーを作成できます：<br/>
                        Dashboard → Authentication → Users → "Add user" ボタン
                      </p>
                      <a 
                        href="https://supabase.com/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-blue-600 underline hover:text-blue-800"
                      >
                        Supabaseダッシュボードを開く
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-6">
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                パスワード確認
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-yellow-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  セットアップ中...
                </span>
              ) : (
                'オーナーアカウントを作成'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/auth/login"
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              既にアカウントがある場合はログイン
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}