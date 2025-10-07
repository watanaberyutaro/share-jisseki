-- まず、必要なカラムがeventsテーブルに存在することを確認し、作成
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS month INTEGER,
  ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- デフォルト値を設定（既存レコードがある場合）
UPDATE events 
SET 
  start_date = COALESCE(start_date, CURRENT_DATE),
  end_date = COALESCE(end_date, CURRENT_DATE),
  year = COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
  month = COALESCE(month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER),
  week_number = COALESCE(week_number, 1),
  agency_name = COALESCE(agency_name, 'Unknown')
WHERE start_date IS NULL OR end_date IS NULL OR year IS NULL OR month IS NULL OR week_number IS NULL OR agency_name IS NULL;

-- NOT NULL制約を追加
ALTER TABLE events 
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL,
  ALTER COLUMN year SET NOT NULL,
  ALTER COLUMN month SET NOT NULL,
  ALTER COLUMN week_number SET NOT NULL;

-- ビューを修正（計算カラムを直接使用する）
DROP VIEW IF EXISTS event_summary CASCADE;
CREATE OR REPLACE VIEW event_summary AS
SELECT 
  e.id,
  e.venue,
  e.agency_name,
  e.start_date,
  e.end_date,
  e.year,
  e.month,
  e.week_number,
  CONCAT(e.year, '年', e.month, '月第', e.week_number, '週') as period_display,
  (e.end_date - e.start_date + 1) as event_days,
  COALESCE(p.target_hs_total, 0) as target_hs_total,
  COALESCE(
    (SELECT SUM(hs_total) FROM staff_performances WHERE event_id = e.id),
    0
  ) as actual_hs_total,
  COALESCE(
    (SELECT SUM(au_mnp_sp1 + au_mnp_sp2 + au_mnp_sim) FROM staff_performances WHERE event_id = e.id),
    0
  ) as actual_au_mnp,
  COALESCE(
    (SELECT SUM(uq_mnp_sp1 + uq_mnp_sp2 + uq_mnp_sim) FROM staff_performances WHERE event_id = e.id),
    0
  ) as actual_uq_mnp,
  COALESCE(
    (SELECT SUM(au_hs_sp1 + au_hs_sp2 + au_hs_sim) FROM staff_performances WHERE event_id = e.id),
    0
  ) as actual_au_new,
  COALESCE(
    (SELECT SUM(uq_hs_sp1 + uq_hs_sp2 + uq_hs_sim) FROM staff_performances WHERE event_id = e.id),
    0
  ) as actual_uq_new,
  e.created_at
FROM events e
LEFT JOIN performances p ON p.event_id = e.id;

-- eventsテーブルの古いカラムを削除
ALTER TABLE events DROP COLUMN IF EXISTS date;

-- RLS設定の確認
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE performances DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performances DISABLE ROW LEVEL SECURITY;