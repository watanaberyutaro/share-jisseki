'use client'

import { useState } from 'react'
import { MagneticDots } from '@/components/MagneticDots'

export default function SimpleTestPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testEnvVars = () => {
    setLoading(true)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setResult(`
環境変数テスト:
NEXT_PUBLIC_SUPABASE_URL: ${url || '未設定'}
NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? `設定済み (${key.substring(0, 20)}...)` : '未設定'}
`)
    } catch (err) {
      setResult(`エラー: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testSupabaseImport = async () => {
    setLoading(true)
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setResult('エラー: 環境変数が設定されていません')
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      setResult('Supabaseクライアント作成成功')

      // 簡単な接続テスト
      const { data, error } = await supabase.auth.getSession()
      
      setResult(prev => prev + `
セッション取得テスト: ${error ? `エラー - ${error.message}` : '成功'}
セッション: ${JSON.stringify(data?.session?.user?.email || 'なし', null, 2)}`)

    } catch (err) {
      setResult(`エラー: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const testBasicAuth = async () => {
    setLoading(true)
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // オーナーアカウントでサインアップを試行
      const { data, error } = await supabase.auth.signUp({
        email: 'harukadmla@gmail.com',
        password: 'test123456',
        options: {
          data: {
            display_name: 'オーナー',
            requested_role: 'owner',
          }
        }
      })

      setResult(`
認証テスト結果（オーナーアカウント）:
成功: ${!error}
エラー: ${error?.message || 'なし'}
ユーザーID: ${data.user?.id || 'なし'}
メール確認必要: ${data.user && !data.session ? 'はい' : 'いいえ'}
セッション: ${data.session ? 'あり' : 'なし'}

注意: このメールアドレスでアカウントが既に存在する場合、
"User already registered" エラーが出ることがあります。
その場合は直接ログインを試してください。
`)
    } catch (err) {
      setResult(`エラー: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // オーナーアカウントでログインを試行
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'harukadmla@gmail.com',
        password: 'test123456'
      })

      setResult(`
ログインテスト結果:
成功: ${!error}
エラー: ${error?.message || 'なし'}
ユーザーID: ${data.user?.id || 'なし'}
メール: ${data.user?.email || 'なし'}
セッション: ${data.session ? 'あり' : 'なし'}
`)
    } catch (err) {
      setResult(`エラー: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <MagneticDots />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">シンプル認証テスト</h1>
        
        <div className="space-y-4">
          <button
            onClick={testEnvVars}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'テスト中...' : '1. 環境変数テスト'}
          </button>
          
          <button
            onClick={testSupabaseImport}
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'テスト中...' : '2. Supabase接続テスト'}
          </button>
          
          <button
            onClick={testBasicAuth}
            disabled={loading}
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'テスト中...' : '3. 新規登録テスト'}
          </button>
          
          <button
            onClick={testLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'テスト中...' : '4. ログインテスト'}
          </button>
        </div>
        
        {result && (
          <div className="mt-8 p-6 bg-card rounded-lg border border-border">
            <h2 className="font-semibold mb-4">テスト結果:</h2>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}