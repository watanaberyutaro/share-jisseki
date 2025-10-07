'use client'

import { useState } from 'react'
import { MagneticDots } from '@/components/MagneticDots'

export default function FixAuthPage() {
  const [copied, setCopied] = useState(false)

  const sqlScript = `-- Supabaseの認証関連の問題を修正するSQL
-- このSQLをSupabaseのSQL Editorで実行してください

-- 1. 既存の自動プロファイル作成トリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. profilesテーブルを完全にリセット
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. profilesテーブルを再作成（シンプルなバージョン）
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

-- 4. RLS (Row Level Security) を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. シンプルなRLSポリシー（無限再帰を避ける）
-- 自分のプロファイルは読み書き可能
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL
  USING (auth.uid() = id);

-- 6. updated_atカラムを自動更新するトリガー
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
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Storage（ストレージ）のバケット作成（画像アップロード用）
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 8. ストレージのRLSポリシー
CREATE POLICY "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-images' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'event-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );`

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
          <h1 className="text-3xl font-bold text-red-600 mb-4">🚨 認証システム修復</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="font-semibold text-red-800 mb-2">問題:</h2>
            <p className="text-red-700 mb-4">
              Supabaseの認証システムでエラーが発生しています:<br/>
              <code className="bg-red-100 px-2 py-1 rounded">Database error saving new user</code>
            </p>
            
            <h2 className="font-semibold text-red-800 mb-2">原因:</h2>
            <ul className="list-disc list-inside text-red-700 mb-4">
              <li>自動プロファイル作成トリガーが問題を起こしている</li>
              <li>RLSポリシーの無限再帰</li>
              <li>データベーススキーマの不整合</li>
            </ul>
            
            <h2 className="font-semibold text-red-800 mb-2">解決方法:</h2>
            <p className="text-red-700">
              以下のSQLを実行してデータベースをリセットします。
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">認証システム修復SQL</h2>
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
            <li><strong>Supabaseダッシュボードにアクセス</strong></li>
            <li><strong>左メニューから「SQL Editor」を選択</strong></li>
            <li><strong>上記のSQLを貼り付け</strong></li>
            <li><strong>「Run」ボタンをクリックして実行</strong></li>
            <li><strong>エラーがないことを確認</strong></li>
            <li><strong><code>/setup-owner</code> でオーナーアカウント作成を再試行</strong></li>
          </ol>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="font-semibold text-blue-800 mb-2">🔧 修正内容:</h2>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>問題のある自動プロファイル作成トリガーを削除</li>
            <li>profilesテーブルを完全リセット</li>
            <li>シンプルなRLSポリシーに変更（無限再帰を回避）</li>
            <li>ストレージバケットとポリシーも設定</li>
            <li>手動でのプロファイル作成に変更</li>
          </ul>
        </div>

        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="font-semibold text-green-800 mb-2">✅ 修復後の手順:</h2>
          <ol className="list-decimal list-inside space-y-1 text-green-700">
            <li>SQL実行後、<a href="/setup-owner" className="underline font-medium">オーナーセットアップページ</a>に戻る</li>
            <li>パスワードを設定してアカウント作成</li>
            <li>成功したらログイン画面からログイン</li>
            <li>管理機能が使えることを確認</li>
          </ol>
        </div>
      </div>
    </div>
  )
}