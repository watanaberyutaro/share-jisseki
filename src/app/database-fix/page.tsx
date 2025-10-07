'use client'

import { useState } from 'react'
import { MagneticDots } from '@/components/MagneticDots'

export default function DatabaseFixPage() {
  const [copied, setCopied] = useState(false)

  const sqlScript = `-- プロファイルテーブルの作成とRLS設定
-- このSQLをSupabaseのSQL Editorで実行してください

-- まず既存のテーブルとポリシーを削除（存在する場合）
DROP TABLE IF EXISTS profiles CASCADE;

-- プロファイルテーブルを作成
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_role TEXT DEFAULT 'user' CHECK (requested_role IN ('user', 'admin', 'owner')),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- RLS (Row Level Security) を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーが自分のプロファイルを読み取れるポリシー
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 全てのユーザーが自分のプロファイルを挿入できるポリシー
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 全てのユーザーが自分のプロファイルを更新できるポリシー
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- オーナーと管理者が全てのプロファイルを読み取れるポリシー（無限再帰を避ける）
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    id = auth.uid() OR 
    auth.uid() IN (
      SELECT p.id FROM profiles p 
      WHERE p.role IN ('admin', 'owner') 
      AND p.status = 'approved'
    )
  );

-- オーナーと管理者が全てのプロファイルを更新できるポリシー（無限再帰を避ける）
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    id = auth.uid() OR 
    auth.uid() IN (
      SELECT p.id FROM profiles p 
      WHERE p.role IN ('admin', 'owner') 
      AND p.status = 'approved'
    )
  );

-- updated_atカラムを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <MagneticDots />
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-4">🚨 データベース修復が必要</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="font-semibold text-red-800 mb-2">問題:</h2>
            <p className="text-red-700 mb-4">
              プロファイルテーブルのRLS（Row Level Security）ポリシーで無限再帰エラーが発生しています。<br/>
              <code className="bg-red-100 px-2 py-1 rounded">infinite recursion detected in policy for relation "profiles"</code>
            </p>
            
            <h2 className="font-semibold text-red-800 mb-2">解決方法:</h2>
            <p className="text-red-700">
              以下のSQLをSupabaseのSQL Editorで実行してください。
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">データベース修復SQL</h2>
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? '✅ コピー済み' : '📋 SQLをコピー'}
            </button>
          </div>

          <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{sqlScript}</code>
          </pre>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="font-semibold text-yellow-800 mb-4">📋 実行手順:</h2>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>
              <strong>Supabaseダッシュボードにアクセス</strong>
              <br/>
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                https://supabase.com/dashboard
              </a>
            </li>
            <li><strong>プロジェクトを選択</strong></li>
            <li><strong>左メニューから「SQL Editor」を選択</strong></li>
            <li><strong>上記のSQLを貼り付け</strong></li>
            <li><strong>「Run」ボタンをクリックして実行</strong></li>
            <li><strong>エラーがないことを確認</strong></li>
            <li><strong>このページを閉じてログインを再試行</strong></li>
          </ol>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="font-semibold text-blue-800 mb-2">💡 修正内容:</h2>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>既存のprofilesテーブルを削除して再作成</li>
            <li>無限再帰を避けるためのRLSポリシーに修正</li>
            <li>適切な制約とトリガーの追加</li>
            <li>オーナー・管理者権限の正しい設定</li>
          </ul>
        </div>
      </div>
    </div>
  )
}