-- オーナーアカウントのセットアップと確認用SQL

-- 1. まず、オーナーアカウントが存在するか確認
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.display_name,
  p.role,
  p.status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'harukadmla@gmail.com';

-- 2. オーナーアカウントが存在しない場合は、まずSupabaseダッシュボードで
-- Authentication > Usersから手動でユーザーを作成するか、
-- アプリケーションのサインアップページから登録してください。
-- Email: harukadmla@gmail.com
-- Password: Pw321321

-- 3. アカウントが作成されたら、以下のコマンドを実行してオーナー権限を付与
SELECT public.setup_owner_account();

-- 4. 確認：オーナーアカウントのプロファイルを再度確認
SELECT 
  u.id,
  u.email,
  p.display_name,
  p.role,
  p.status,
  p.approved_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'harukadmla@gmail.com';

-- 5. もしプロファイルが存在しない場合、手動で作成
-- (auth.usersにレコードがある場合のみ実行)
/*
INSERT INTO public.profiles (
  id, 
  email, 
  display_name, 
  role, 
  status, 
  requested_role,
  approved_at
)
SELECT 
  id,
  'harukadmla@gmail.com',
  'オーナー',
  'owner',
  'approved',
  'owner',
  NOW()
FROM auth.users 
WHERE email = 'harukadmla@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'owner',
  status = 'approved',
  display_name = 'オーナー',
  approved_at = NOW();
*/

-- 6. すべてのプロファイルを確認
SELECT * FROM public.profiles ORDER BY created_at DESC;