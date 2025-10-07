-- プロファイルテーブルの作成とRLS設定
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

-- オーナーと管理者が全てのプロファイルを読み取れるポリシー
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'owner') 
      AND p.status = 'approved'
    )
  );

-- オーナーと管理者が全てのプロファイルを更新できるポリシー
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'owner') 
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
  EXECUTE FUNCTION update_updated_at_column();

-- 初期オーナーアカウントを作成（必要に応じて）
-- 注意: このクエリは auth.users にユーザーが既に存在する場合のみ実行してください
-- INSERT INTO profiles (id, email, display_name, role, status, requested_role, approved_at)
-- SELECT 
--   id, 
--   email, 
--   'オーナー',
--   'owner',
--   'approved',
--   'owner',
--   NOW()
-- FROM auth.users 
-- WHERE email = 'harukadmla@gmail.com'
-- ON CONFLICT (id) DO NOTHING;