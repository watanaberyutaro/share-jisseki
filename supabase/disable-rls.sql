-- すべてのテーブルのRLSを無効化
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE performances DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performances DISABLE ROW LEVEL SECURITY;
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Enable all operations for all users" ON events;
DROP POLICY IF EXISTS "Enable read for all users" ON events;
DROP POLICY IF EXISTS "Enable insert for all users" ON events;
DROP POLICY IF EXISTS "Enable update for all users" ON events;
DROP POLICY IF EXISTS "Enable delete for all users" ON events;

DROP POLICY IF EXISTS "Enable all operations for all users" ON profiles;
DROP POLICY IF EXISTS "Enable read for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for all users" ON profiles;
DROP POLICY IF EXISTS "Enable update for all users" ON profiles;
DROP POLICY IF EXISTS "Enable delete for all users" ON profiles;

DROP POLICY IF EXISTS "Enable all operations for all users" ON performances;
DROP POLICY IF EXISTS "Enable read for all users" ON performances;
DROP POLICY IF EXISTS "Enable insert for all users" ON performances;
DROP POLICY IF EXISTS "Enable update for all users" ON performances;
DROP POLICY IF EXISTS "Enable delete for all users" ON performances;

DROP POLICY IF EXISTS "Enable all operations for all users" ON staff_performances;
DROP POLICY IF EXISTS "Enable read for all users" ON staff_performances;
DROP POLICY IF EXISTS "Enable insert for all users" ON staff_performances;
DROP POLICY IF EXISTS "Enable update for all users" ON staff_performances;
DROP POLICY IF EXISTS "Enable delete for all users" ON staff_performances;

DROP POLICY IF EXISTS "Enable all operations for all users" ON photos;
DROP POLICY IF EXISTS "Enable read for all users" ON photos;
DROP POLICY IF EXISTS "Enable insert for all users" ON photos;
DROP POLICY IF EXISTS "Enable update for all users" ON photos;
DROP POLICY IF EXISTS "Enable delete for all users" ON photos;

-- 確認用クエリ
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('events', 'profiles', 'performances', 'staff_performances', 'photos');