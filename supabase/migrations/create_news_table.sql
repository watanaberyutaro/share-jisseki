-- ニューステーブルの作成
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  display_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーの有効化
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 誰でも有効なニュースを読み取れる
CREATE POLICY "Anyone can read active news"
  ON news
  FOR SELECT
  USING (display_until >= NOW());

-- 認証済みユーザーは全てのニュースを読み取れる（管理者用）
CREATE POLICY "Authenticated users can read all news"
  ON news
  FOR SELECT
  TO authenticated
  USING (true);

-- 認証済みユーザーはニュースを作成できる
CREATE POLICY "Authenticated users can create news"
  ON news
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 認証済みユーザーはニュースを更新できる
CREATE POLICY "Authenticated users can update news"
  ON news
  FOR UPDATE
  TO authenticated
  USING (true);

-- 認証済みユーザーはニュースを削除できる
CREATE POLICY "Authenticated users can delete news"
  ON news
  FOR DELETE
  TO authenticated
  USING (true);
