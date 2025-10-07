-- 共有リストデータを保存するテーブル

-- ユーザー名リスト
CREATE TABLE IF NOT EXISTS user_names (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- スタッフ名リスト
CREATE TABLE IF NOT EXISTS staff_names (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 会場名リスト
CREATE TABLE IF NOT EXISTS venue_names (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 代理店名リスト
CREATE TABLE IF NOT EXISTS agency_names (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLSポリシー: 全ユーザーが読み取り可能
ALTER TABLE user_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_names ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "Anyone can read user_names" ON user_names FOR SELECT USING (true);
CREATE POLICY "Anyone can read staff_names" ON staff_names FOR SELECT USING (true);
CREATE POLICY "Anyone can read venue_names" ON venue_names FOR SELECT USING (true);
CREATE POLICY "Anyone can read agency_names" ON agency_names FOR SELECT USING (true);

-- 誰でも追加可能
CREATE POLICY "Anyone can insert user_names" ON user_names FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert staff_names" ON staff_names FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert venue_names" ON venue_names FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert agency_names" ON agency_names FOR INSERT WITH CHECK (true);

-- 誰でも更新可能
CREATE POLICY "Anyone can update user_names" ON user_names FOR UPDATE USING (true);
CREATE POLICY "Anyone can update staff_names" ON staff_names FOR UPDATE USING (true);
CREATE POLICY "Anyone can update venue_names" ON venue_names FOR UPDATE USING (true);
CREATE POLICY "Anyone can update agency_names" ON agency_names FOR UPDATE USING (true);

-- 誰でも削除可能
CREATE POLICY "Anyone can delete user_names" ON user_names FOR DELETE USING (true);
CREATE POLICY "Anyone can delete staff_names" ON staff_names FOR DELETE USING (true);
CREATE POLICY "Anyone can delete venue_names" ON venue_names FOR DELETE USING (true);
CREATE POLICY "Anyone can delete agency_names" ON agency_names FOR DELETE USING (true);

-- インデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_user_names_name ON user_names(name);
CREATE INDEX IF NOT EXISTS idx_staff_names_name ON staff_names(name);
CREATE INDEX IF NOT EXISTS idx_venue_names_name ON venue_names(name);
CREATE INDEX IF NOT EXISTS idx_agency_names_name ON agency_names(name);

-- 更新日時を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER update_user_names_updated_at BEFORE UPDATE ON user_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_names_updated_at BEFORE UPDATE ON staff_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venue_names_updated_at BEFORE UPDATE ON venue_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agency_names_updated_at BEFORE UPDATE ON agency_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
