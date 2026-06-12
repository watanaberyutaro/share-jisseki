-- 014: ナレッジベース機能

-- ジャンルテーブル（動的に追加可能）
CREATE TABLE IF NOT EXISTS knowledge_genres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ナレッジ投稿テーブル
CREATE TABLE IF NOT EXISTS knowledge_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  knowledge_type TEXT NOT NULL,
  genre_id UUID REFERENCES knowledge_genres(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'unverified',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_carrier TEXT[] DEFAULT '{}',
  related_plan TEXT DEFAULT '',
  related_venue TEXT DEFAULT '',
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verification_method TEXT DEFAULT '',
  verification_comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- タグテーブル
CREATE TABLE IF NOT EXISTS knowledge_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 投稿↔タグ中間テーブル
CREATE TABLE IF NOT EXISTS knowledge_post_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES knowledge_posts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES knowledge_tags(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(post_id, tag_id)
);

-- コメントテーブル
CREATE TABLE IF NOT EXISTS knowledge_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES knowledge_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ファイルテーブル
CREATE TABLE IF NOT EXISTS knowledge_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES knowledge_posts(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  purpose TEXT NOT NULL DEFAULT 'post_attachment',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- お気に入りテーブル
CREATE TABLE IF NOT EXISTS knowledge_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES knowledge_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 参考になったテーブル
CREATE TABLE IF NOT EXISTS knowledge_helpfuls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES knowledge_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 編集履歴テーブル
CREATE TABLE IF NOT EXISTS knowledge_edit_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES knowledge_posts(id) ON DELETE CASCADE NOT NULL,
  edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 閲覧履歴テーブル
CREATE TABLE IF NOT EXISTS knowledge_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES knowledge_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_posts_updated_at
  BEFORE UPDATE ON knowledge_posts
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER knowledge_comments_updated_at
  BEFORE UPDATE ON knowledge_comments
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_updated_at();

-- RLS有効化（APIはservice roleでバイパス・詳細制御はコード側）
ALTER TABLE knowledge_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_helpfuls ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edit_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_views ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザー全操作許可（アクセス制御はAPIルートで実施）
CREATE POLICY "authenticated_knowledge_genres"        ON knowledge_genres        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_posts"         ON knowledge_posts         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_tags"          ON knowledge_tags          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_post_tags"     ON knowledge_post_tags     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_comments"      ON knowledge_comments      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_files"         ON knowledge_files         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_favorites"     ON knowledge_favorites     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_helpfuls"      ON knowledge_helpfuls      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_edit_histories" ON knowledge_edit_histories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_knowledge_views"         ON knowledge_views         FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 初期ジャンルデータ投入
INSERT INTO knowledge_genres (name) VALUES
  ('端末・ガジェット'),
  ('料金プラン'),
  ('MNP・乗り換え'),
  ('新規契約'),
  ('機種変更'),
  ('オプション'),
  ('アクセサリー'),
  ('会場・イベント'),
  ('その他')
ON CONFLICT (name) DO NOTHING;
