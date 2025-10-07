-- RLS（Row Level Security）を無効化
-- 開発中はRLSを無効にして、後で必要に応じて有効化してください

ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE performances DISABLE ROW LEVEL SECURITY;

-- または、全てのユーザーに対してアクセスを許可するポリシーを作成
-- CREATE POLICY "Enable all access for all users" ON events
--   FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
-- 
-- CREATE POLICY "Enable all access for all users" ON performances
--   FOR ALL TO PUBLIC USING (true) WITH CHECK (true);