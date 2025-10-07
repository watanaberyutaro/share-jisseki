-- オーナーアカウントを直接データベースから作成するSQL
-- このSQLをSupabaseのSQL Editorで実行してください
-- 注意: このクエリは既にauth.usersにユーザーが存在する場合のみ動作します

-- 1. まず現在のauth.usersテーブルの状況を確認
SELECT 
  id, 
  email, 
  created_at,
  email_confirmed_at,
  phone_confirmed_at
FROM auth.users 
WHERE email = 'harukadmla@gmail.com'
ORDER BY created_at DESC;

-- 2. 上記クエリでユーザーが見つかった場合、以下を実行してプロファイルを作成
-- （ユーザーIDは上記の結果から取得してください）

-- 例: INSERT INTO profiles (id, email, display_name, role, status, requested_role, approved_at)
-- VALUES (
--   'ここにユーザーIDを入力',  -- 上記クエリの結果から取得したid
--   'harukadmla@gmail.com',
--   'オーナー',
--   'owner',
--   'approved',
--   'owner',
--   NOW()
-- );

-- 3. もしauth.usersにユーザーが存在しない場合、
--    Supabaseの管理画面から直接ユーザーを作成することもできます：
--    Dashboard > Authentication > Users > "Add user" ボタン

-- 4. プロファイルが正常に作成されたかを確認
-- SELECT * FROM profiles WHERE email = 'harukadmla@gmail.com';