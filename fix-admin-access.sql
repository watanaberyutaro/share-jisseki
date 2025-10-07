-- 管理者が全てのプロファイルにアクセスできるようにRLSポリシーを修正
-- このSQLをSupabaseのSQL Editorで実行してください

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 新しいポリシーを作成
-- 1. 自分のプロファイルは誰でも管理可能
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL
  USING (auth.uid() = id);

-- 2. オーナーと管理者は全てのプロファイルを参照可能
CREATE POLICY "Owners and admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 
      FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('owner', 'admin') 
      AND admin_profile.status = 'approved'
    )
  );

-- 3. オーナーと管理者は全てのプロファイルを更新可能
CREATE POLICY "Owners and admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 
      FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('owner', 'admin') 
      AND admin_profile.status = 'approved'
    )
  );

-- 4. 承認待ちユーザーをより簡単に取得できるビューを作成
CREATE OR REPLACE VIEW pending_users_view AS
SELECT 
  p.*,
  au.email as auth_email,
  au.created_at as auth_created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;

-- 5. ビューに対するRLSポリシー
ALTER VIEW pending_users_view SET (security_invoker = true);

-- 6. 確認クエリ - 承認待ちユーザーの確認
SELECT 
  id,
  email,
  display_name,
  role,
  status,
  requested_role,
  created_at
FROM profiles 
WHERE status = 'pending'
ORDER BY created_at DESC;