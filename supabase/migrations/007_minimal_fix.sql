-- 最小限の修正でエラーを解決

-- 既存のビューを削除
DROP VIEW IF EXISTS event_summary CASCADE;
DROP VIEW IF EXISTS daily_performance_summary CASCADE;

-- eventsテーブルに必要なカラムを追加（存在しない場合のみ）
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS agency_name TEXT DEFAULT 'Unknown Agency',
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  ADD COLUMN IF NOT EXISTS month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1;

-- performancesテーブルに必要なカラムを追加（存在しない場合のみ）
ALTER TABLE performances
  ADD COLUMN IF NOT EXISTS target_hs_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_au_mnp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_uq_mnp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_au_new INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_uq_new INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operation_details TEXT,
  ADD COLUMN IF NOT EXISTS preparation_details TEXT,
  ADD COLUMN IF NOT EXISTS promotion_method TEXT,
  ADD COLUMN IF NOT EXISTS success_case_1 TEXT,
  ADD COLUMN IF NOT EXISTS success_case_2 TEXT,
  ADD COLUMN IF NOT EXISTS challenges_and_solutions TEXT;

-- staff_performancesテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS staff_performances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    day_number INTEGER DEFAULT 1,
    
    -- 新規ID系
    au_mnp_sp1 INTEGER DEFAULT 0,
    au_mnp_sp2 INTEGER DEFAULT 0,
    au_mnp_sim INTEGER DEFAULT 0,
    uq_mnp_sp1 INTEGER DEFAULT 0,
    uq_mnp_sp2 INTEGER DEFAULT 0,
    uq_mnp_sim INTEGER DEFAULT 0,
    au_hs_sp1 INTEGER DEFAULT 0,
    au_hs_sp2 INTEGER DEFAULT 0,
    au_hs_sim INTEGER DEFAULT 0,
    uq_hs_sp1 INTEGER DEFAULT 0,
    uq_hs_sp2 INTEGER DEFAULT 0,
    uq_hs_sim INTEGER DEFAULT 0,
    cell_up_sp1 INTEGER DEFAULT 0,
    cell_up_sp2 INTEGER DEFAULT 0,
    cell_up_sim INTEGER DEFAULT 0,
    
    -- LTV系
    credit_card INTEGER DEFAULT 0,
    gold_card INTEGER DEFAULT 0,
    ji_bank_account INTEGER DEFAULT 0,
    warranty INTEGER DEFAULT 0,
    ott INTEGER DEFAULT 0,
    electricity INTEGER DEFAULT 0,
    gas INTEGER DEFAULT 0,
    network_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 計算カラムを追加（存在しない場合のみ）
ALTER TABLE staff_performances 
  ADD COLUMN IF NOT EXISTS hs_total INTEGER GENERATED ALWAYS AS (
    au_mnp_sp1 + au_mnp_sp2 + au_mnp_sim +
    uq_mnp_sp1 + uq_mnp_sp2 + uq_mnp_sim +
    au_hs_sp1 + au_hs_sp2 + au_hs_sim +
    uq_hs_sp1 + uq_hs_sp2 + uq_hs_sim +
    cell_up_sp1 + cell_up_sp2 + cell_up_sim
  ) STORED;

ALTER TABLE staff_performances 
  ADD COLUMN IF NOT EXISTS ltv_total INTEGER GENERATED ALWAYS AS (
    credit_card + gold_card + ji_bank_account + 
    warranty + ott + electricity + gas
  ) STORED;

-- NULL値を更新
UPDATE events 
SET 
    agency_name = COALESCE(agency_name, 'Unknown Agency'),
    start_date = COALESCE(start_date, CURRENT_DATE),
    end_date = COALESCE(end_date, CURRENT_DATE),
    year = COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
    month = COALESCE(month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER),
    week_number = COALESCE(week_number, 1)
WHERE 
    agency_name IS NULL OR agency_name = '' OR
    start_date IS NULL OR 
    end_date IS NULL OR 
    year IS NULL OR 
    month IS NULL OR 
    week_number IS NULL;

-- 簡単なビューを作成
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
        (SELECT SUM(COALESCE(hs_total, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_hs_total,
    COALESCE(
        (SELECT SUM(COALESCE(au_mnp_sp1, 0) + COALESCE(au_mnp_sp2, 0) + COALESCE(au_mnp_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_au_mnp,
    COALESCE(
        (SELECT SUM(COALESCE(uq_mnp_sp1, 0) + COALESCE(uq_mnp_sp2, 0) + COALESCE(uq_mnp_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_uq_mnp,
    COALESCE(
        (SELECT SUM(COALESCE(au_hs_sp1, 0) + COALESCE(au_hs_sp2, 0) + COALESCE(au_hs_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_au_new,
    COALESCE(
        (SELECT SUM(COALESCE(uq_hs_sp1, 0) + COALESCE(uq_hs_sp2, 0) + COALESCE(uq_hs_sim, 0)) FROM staff_performances WHERE event_id = e.id),
        0
    ) as actual_uq_new,
    e.created_at
FROM events e
LEFT JOIN performances p ON p.event_id = e.id
ORDER BY e.created_at DESC;

-- RLSを無効化
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE performances DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performances DISABLE ROW LEVEL SECURITY;