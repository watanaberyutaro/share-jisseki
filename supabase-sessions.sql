-- ユーザーセッション管理テーブル
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ユーザー名とデバイスIDの組み合わせをUNIQUEに
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_user_device_key
  ON user_sessions(user_name, device_id);

-- ユーザー名でのインデックス（検索高速化）
CREATE INDEX IF NOT EXISTS user_sessions_user_name_idx
  ON user_sessions(user_name);

-- RLSを有効化
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "Anyone can read user_sessions"
  ON user_sessions FOR SELECT
  USING (true);

-- 誰でも挿入可能
CREATE POLICY "Anyone can insert user_sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (true);

-- 誰でも更新可能
CREATE POLICY "Anyone can update user_sessions"
  ON user_sessions FOR UPDATE
  USING (true);

-- 誰でも削除可能
CREATE POLICY "Anyone can delete user_sessions"
  ON user_sessions FOR DELETE
  USING (true);

-- last_activeを自動更新する関数
CREATE OR REPLACE FUNCTION update_last_active_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- last_activeを自動更新するトリガー
CREATE TRIGGER update_user_sessions_last_active BEFORE UPDATE
    ON user_sessions FOR EACH ROW
    EXECUTE FUNCTION update_last_active_column();
