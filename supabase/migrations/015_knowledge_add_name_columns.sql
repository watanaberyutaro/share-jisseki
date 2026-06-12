-- localStorage認証に対応するためテキスト列を追加

-- 投稿者名
ALTER TABLE knowledge_posts    ADD COLUMN IF NOT EXISTS author_name     TEXT DEFAULT '';
-- 認証者名
ALTER TABLE knowledge_posts    ADD COLUMN IF NOT EXISTS verified_by_name TEXT DEFAULT '';

-- コメント投稿者名
ALTER TABLE knowledge_comments ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';

-- 参考になった・お気に入り・閲覧履歴をuser_nameで管理
ALTER TABLE knowledge_helpfuls  ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE knowledge_favorites ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE knowledge_views     ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';

-- helpfuls/favoritesのユニーク制約をuser_nameベースに追加
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_helpfuls_post_username
  ON knowledge_helpfuls(post_id, user_name);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_favorites_post_username
  ON knowledge_favorites(post_id, user_name);
