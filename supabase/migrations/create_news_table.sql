-- ニューステーブルの作成
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  display_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーの有効化
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 誰でも全てのニュースを読み取れる
CREATE POLICY "Anyone can read news"
  ON news
  FOR SELECT
  USING (true);

-- 誰でもニュースを作成できる
CREATE POLICY "Anyone can create news"
  ON news
  FOR INSERT
  WITH CHECK (true);

-- 誰でもニュースを更新できる
CREATE POLICY "Anyone can update news"
  ON news
  FOR UPDATE
  USING (true);

-- 誰でもニュースを削除できる
CREATE POLICY "Anyone can delete news"
  ON news
  FOR DELETE
  USING (true);
