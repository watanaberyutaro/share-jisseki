-- まず既存のテーブルを削除（存在する場合）
DROP TABLE IF EXISTS approval_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ユーザープロファイルテーブル
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('admin', 'user', 'pending')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
  requested_role TEXT CHECK (requested_role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- ユーザー承認申請テーブル
CREATE TABLE approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- approved_byの外部キー制約を追加
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_approved_by_fkey 
  FOREIGN KEY (approved_by) 
  REFERENCES profiles(id);

-- RLS (Row Level Security) を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own requests" ON approval_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON approval_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON approval_requests;

-- プロファイルのRLSポリシー
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'approved'
    )
  );

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = role AND status = status); -- roleとstatusは変更不可

-- 公開アクセス用のポリシー（サインアップ時に必要）
CREATE POLICY "Public profiles can be created during signup" 
  ON profiles FOR INSERT 
  WITH CHECK (true);

-- 承認申請のRLSポリシー
CREATE POLICY "Users can view their own requests" 
  ON approval_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" 
  ON approval_requests FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update requests" 
  ON approval_requests FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'approved'
    )
  );

-- 公開アクセス用のポリシー（サインアップ時に必要）
CREATE POLICY "Public requests can be created during signup" 
  ON approval_requests FOR INSERT 
  WITH CHECK (true);

-- プロファイル作成時のトリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, status, requested_role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pending',
    'pending', 
    COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user')
  );
  
  -- 承認申請を自動作成
  INSERT INTO public.approval_requests (user_id, requested_role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- トリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 最初の管理者を設定するための関数（初期設定用）
CREATE OR REPLACE FUNCTION public.set_initial_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin', 
      status = 'approved',
      approved_at = NOW()
  WHERE email = user_email;
  
  -- 承認申請も更新
  UPDATE public.approval_requests
  SET status = 'approved',
      reviewed_at = NOW()
  WHERE user_id = (SELECT id FROM public.profiles WHERE email = user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_id ON approval_requests(user_id);