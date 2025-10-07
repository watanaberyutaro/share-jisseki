-- 一時保存（Draft）用テーブル
CREATE TABLE IF NOT EXISTS performance_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  draft_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ユーザー名ごとに1つのDraftのみ保持するため、UNIQUE制約を追加
CREATE UNIQUE INDEX IF NOT EXISTS performance_drafts_user_name_key
  ON performance_drafts(user_name);

-- RLSを有効化
ALTER TABLE performance_drafts ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "Anyone can read performance_drafts"
  ON performance_drafts FOR SELECT
  USING (true);

-- 誰でも挿入可能
CREATE POLICY "Anyone can insert performance_drafts"
  ON performance_drafts FOR INSERT
  WITH CHECK (true);

-- 誰でも更新可能
CREATE POLICY "Anyone can update performance_drafts"
  ON performance_drafts FOR UPDATE
  USING (true);

-- 誰でも削除可能
CREATE POLICY "Anyone can delete performance_drafts"
  ON performance_drafts FOR DELETE
  USING (true);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_performance_drafts_updated_at BEFORE UPDATE
    ON performance_drafts FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
