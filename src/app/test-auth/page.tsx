'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MagneticDots } from '@/components/MagneticDots'

export default function TestAuthPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('test123456')

  const testConnection = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // Supabaseの接続をテスト
      const { data, error } = await supabase.auth.getSession()
      setResult({
        type: 'connection',
        success: !error,
        data: data,
        error: error?.message
      })
    } catch (err) {
      setResult({
        type: 'connection',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testSignUp = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: 'テストユーザー',
            requested_role: 'user',
          }
        }
      })
      setResult({
        type: 'signup',
        success: !error,
        data: data,
        error: error?.message
      })
    } catch (err) {
      setResult({
        type: 'signup',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testSignIn = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      setResult({
        type: 'signin',
        success: !error,
        data: data,
        error: error?.message
      })
    } catch (err) {
      setResult({
        type: 'signin',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testProfiles = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5)
      
      setResult({
        type: 'profiles',
        success: !error,
        data: data,
        error: error?.message
      })
    } catch (err) {
      setResult({
        type: 'profiles',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      setResult({
        type: 'signout',
        success: !error,
        error: error?.message
      })
    } catch (err) {
      setResult({
        type: 'signout',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <MagneticDots />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">認証システムテスト</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4">テスト項目</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
            </div>
            
            <div className="space-y-2 mt-6">
              <button
                onClick={testConnection}
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                接続テスト
              </button>
              
              <button
                onClick={testSignUp}
                disabled={loading}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                新規登録テスト
              </button>
              
              <button
                onClick={testSignIn}
                disabled={loading}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                ログインテスト
              </button>
              
              <button
                onClick={testProfiles}
                disabled={loading}
                className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                プロファイルテスト
              </button>
              
              <button
                onClick={signOut}
                disabled={loading}
                className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                ログアウト
              </button>
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4">テスト結果</h2>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {result && !loading && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
                  <div className="font-semibold">
                    {result.type.toUpperCase()} - {result.success ? '成功' : '失敗'}
                  </div>
                  {result.error && (
                    <div className="text-sm mt-2 text-red-700">
                      エラー: {result.error}
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="font-semibold mb-2">詳細データ:</div>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-100 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold mb-2">環境情報</h3>
          <div className="text-sm space-y-1">
            <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
            <div>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}