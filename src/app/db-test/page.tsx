'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MagneticDots } from '@/components/MagneticDots'

export default function DatabaseTestPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testProfilesTable = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // プロファイルテーブルの存在確認
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5)

      setResult(`
プロファイルテーブルテスト:
成功: ${!error}
エラー: ${error?.message || 'なし'}
データ数: ${data?.length || 0}
データ: ${JSON.stringify(data, null, 2)}
`)
    } catch (err) {
      setResult(`エラー: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const createProfilesTable = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // SQLでテーブル作成を試行（実際にはSupabaseのSQL Editorで実行する必要があります）
      setResult(`
プロファイルテーブル作成SQL:

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'pending',
  requested_role TEXT DEFAULT 'user',
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- RLS (Row Level Security) の設定
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ポリシーの設定
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

注意: このSQLはSupabaseのSQL Editorで実行してください
`)
    } catch (err) {
      setResult(`エラー: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const testInsertProfile = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // 現在のユーザーセッションを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        setResult('ログインしてからテストしてください')
        return
      }

      // テストプロファイル挿入
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          display_name: 'テストユーザー',
          role: 'user',
          status: 'pending',
          requested_role: 'user'
        })
        .select()

      setResult(`
プロファイル挿入テスト:
成功: ${!error}
エラー: ${error?.message || 'なし'}
挿入データ: ${JSON.stringify(data, null, 2)}
`)
    } catch (err) {
      setResult(`エラー: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const testAuthUser = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      setResult(`
認証ユーザー情報:
セッション存在: ${!!session}
エラー: ${error?.message || 'なし'}
ユーザーID: ${session?.user?.id || 'なし'}
メール: ${session?.user?.email || 'なし'}
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">データベーステスト</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={testAuthUser}
            disabled={loading}
            className="py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'テスト中...' : '認証ユーザー確認'}
          </button>
          
          <button
            onClick={testProfilesTable}
            disabled={loading}
            className="py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'テスト中...' : 'プロファイルテーブル確認'}
          </button>
          
          <button
            onClick={createProfilesTable}
            disabled={loading}
            className="py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'SQL表示中...' : 'テーブル作成SQL表示'}
          </button>
          
          <button
            onClick={testInsertProfile}
            disabled={loading}
            className="py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'テスト中...' : 'プロファイル挿入テスト'}
          </button>
        </div>
        
        {result && (
          <div className="mt-8 p-6 bg-card rounded-lg border border-border">
            <h2 className="font-semibold mb-4">テスト結果:</h2>
            <pre className="whitespace-pre-wrap text-sm overflow-x-auto">{result}</pre>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-yellow-100 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold mb-2">手順:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>まず「認証ユーザー確認」でログイン状態を確認</li>
            <li>「プロファイルテーブル確認」でテーブルの存在確認</li>
            <li>テーブルが存在しない場合は「テーブル作成SQL表示」でSQLを取得し、SupabaseのSQL Editorで実行</li>
            <li>「プロファイル挿入テスト」でデータ挿入をテスト</li>
          </ol>
        </div>
      </div>
    </div>
  )
}