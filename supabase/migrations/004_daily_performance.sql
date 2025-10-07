-- eventsテーブルからname列を削除
ALTER TABLE events DROP COLUMN IF EXISTS name;

-- staff_performancesテーブルを日別実績に対応
ALTER TABLE staff_performances 
  ADD COLUMN IF NOT EXISTS day_number INTEGER NOT NULL DEFAULT 1;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_staff_performances_day ON staff_performances(event_id, day_number);

-- ビューを作成（年月週でイベントを検索しやすくする）
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
  p.target_hs_total,
  p.target_au_mnp,
  p.target_uq_mnp,
  p.target_au_new,
  p.target_uq_new,
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
  e.created_at,
  e.updated_at
FROM events e
LEFT JOIN performances p ON p.event_id = e.id;

-- 日別集計ビュー
CREATE OR REPLACE VIEW daily_performance_summary AS
SELECT 
  sp.event_id,
  sp.day_number,
  sp.staff_name,
  sp.hs_total,
  sp.ltv_total,
  sp.au_mnp_sp1 + sp.au_mnp_sp2 + sp.au_mnp_sim as au_mnp_total,
  sp.uq_mnp_sp1 + sp.uq_mnp_sp2 + sp.uq_mnp_sim as uq_mnp_total,
  sp.au_hs_sp1 + sp.au_hs_sp2 + sp.au_hs_sim as au_new_total,
  sp.uq_hs_sp1 + sp.uq_hs_sp2 + sp.uq_hs_sim as uq_new_total,
  e.year,
  e.month,
  e.week_number,
  e.venue,
  e.agency_name
FROM staff_performances sp
JOIN events e ON e.id = sp.event_id;