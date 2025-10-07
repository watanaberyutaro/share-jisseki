-- イベント写真保存用テーブルの作成
CREATE TABLE IF NOT EXISTS event_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  upload_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_upload_order ON event_photos(event_id, upload_order);

-- RLSを無効化
ALTER TABLE event_photos DISABLE ROW LEVEL SECURITY;

-- 更新トリガー
CREATE TRIGGER update_event_photos_updated_at
  BEFORE UPDATE ON event_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Supabase Storage用のバケットを作成（SQL実行後にSupabaseダッシュボードで手動作成が必要）
-- バケット名: 'event-photos'
-- public: true (読み取り専用)
-- ファイル制限: 10MB
-- 対応形式: image/jpeg, image/png, image/webp