-- 段階的にスキーマを修正する安全なアプローチ

-- Step 1: 既存のビューを削除
DROP VIEW IF EXISTS event_summary CASCADE;
DROP VIEW IF EXISTS daily_performance_summary CASCADE;

-- Step 2: eventsテーブルの構造を確認し、必要なカラムを追加
DO $$ 
BEGIN 
    -- agency_name カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='agency_name') THEN
        ALTER TABLE events ADD COLUMN agency_name TEXT;
    END IF;
    
    -- start_date カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='start_date') THEN
        ALTER TABLE events ADD COLUMN start_date DATE;
    END IF;
    
    -- end_date カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='end_date') THEN
        ALTER TABLE events ADD COLUMN end_date DATE;
    END IF;
    
    -- year カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='year') THEN
        ALTER TABLE events ADD COLUMN year INTEGER;
    END IF;
    
    -- month カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='month') THEN
        ALTER TABLE events ADD COLUMN month INTEGER;
    END IF;
    
    -- week_number カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='week_number') THEN
        ALTER TABLE events ADD COLUMN week_number INTEGER;
    END IF;
END $$;

-- Step 3: NULL値を持つレコードにデフォルト値を設定
UPDATE events 
SET 
    start_date = COALESCE(start_date, CURRENT_DATE),
    end_date = COALESCE(end_date, CURRENT_DATE),
    year = COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
    month = COALESCE(month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER),
    week_number = COALESCE(week_number, 1),
    agency_name = COALESCE(agency_name, 'Unknown Agency')
WHERE 
    start_date IS NULL OR 
    end_date IS NULL OR 
    year IS NULL OR 
    month IS NULL OR 
    week_number IS NULL OR 
    agency_name IS NULL OR
    agency_name = '';

-- Step 4: staff_performancesテーブルが存在することを確認
CREATE TABLE IF NOT EXISTS staff_performances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    day_number INTEGER DEFAULT 1,
    
    -- au MNP
    au_mnp_sp1 INTEGER DEFAULT 0,
    au_mnp_sp2 INTEGER DEFAULT 0,
    au_mnp_sim INTEGER DEFAULT 0,
    
    -- UQ MNP
    uq_mnp_sp1 INTEGER DEFAULT 0,
    uq_mnp_sp2 INTEGER DEFAULT 0,
    uq_mnp_sim INTEGER DEFAULT 0,
    
    -- au HS (新規)
    au_hs_sp1 INTEGER DEFAULT 0,
    au_hs_sp2 INTEGER DEFAULT 0,
    au_hs_sim INTEGER DEFAULT 0,
    
    -- UQ HS (新規)
    uq_hs_sp1 INTEGER DEFAULT 0,
    uq_hs_sp2 INTEGER DEFAULT 0,
    uq_hs_sim INTEGER DEFAULT 0,
    
    -- セルアップ
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
    
    -- NW件数
    network_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: 計算カラムを追加（存在しない場合）
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_performances' AND column_name='hs_total') THEN
        ALTER TABLE staff_performances ADD COLUMN hs_total INTEGER GENERATED ALWAYS AS (
            au_mnp_sp1 + au_mnp_sp2 + au_mnp_sim +
            uq_mnp_sp1 + uq_mnp_sp2 + uq_mnp_sim +
            au_hs_sp1 + au_hs_sp2 + au_hs_sim +
            uq_hs_sp1 + uq_hs_sp2 + uq_hs_sim +
            cell_up_sp1 + cell_up_sp2 + cell_up_sim
        ) STORED;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_performances' AND column_name='ltv_total') THEN
        ALTER TABLE staff_performances ADD COLUMN ltv_total INTEGER GENERATED ALWAYS AS (
            credit_card + gold_card + ji_bank_account + 
            warranty + ott + electricity + gas
        ) STORED;
    END IF;
END $$;

-- Step 6: performancesテーブルに必要なカラムを追加
DO $$ 
BEGIN 
    -- target_hs_total カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='target_hs_total') THEN
        ALTER TABLE performances ADD COLUMN target_hs_total INTEGER DEFAULT 0;
    END IF;
    
    -- target_au_mnp カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='target_au_mnp') THEN
        ALTER TABLE performances ADD COLUMN target_au_mnp INTEGER DEFAULT 0;
    END IF;
    
    -- target_uq_mnp カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='target_uq_mnp') THEN
        ALTER TABLE performances ADD COLUMN target_uq_mnp INTEGER DEFAULT 0;
    END IF;
    
    -- target_au_new カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='target_au_new') THEN
        ALTER TABLE performances ADD COLUMN target_au_new INTEGER DEFAULT 0;
    END IF;
    
    -- target_uq_new カラムを追加（存在しない場合）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='target_uq_new') THEN
        ALTER TABLE performances ADD COLUMN target_uq_new INTEGER DEFAULT 0;
    END IF;
    
    -- 運営詳細カラムも追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='operation_details') THEN
        ALTER TABLE performances ADD COLUMN operation_details TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='preparation_details') THEN
        ALTER TABLE performances ADD COLUMN preparation_details TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='promotion_method') THEN
        ALTER TABLE performances ADD COLUMN promotion_method TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='success_case_1') THEN
        ALTER TABLE performances ADD COLUMN success_case_1 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='success_case_2') THEN
        ALTER TABLE performances ADD COLUMN success_case_2 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performances' AND column_name='challenges_and_solutions') THEN
        ALTER TABLE performances ADD COLUMN challenges_and_solutions TEXT;
    END IF;
END $$;

-- Step 7: 新しいビューを作成
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
LEFT JOIN performances p ON p.event_id = e.id
ORDER BY e.created_at DESC;

-- Step 8: インデックスを追加
CREATE INDEX IF NOT EXISTS idx_staff_performances_event_id ON staff_performances(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_performances_day ON staff_performances(event_id, day_number);
CREATE INDEX IF NOT EXISTS idx_events_period ON events(year, month, week_number);

-- Step 9: RLS を無効化
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE performances DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performances DISABLE ROW LEVEL SECURITY;

-- Step 10: 不要な古いカラムを削除
ALTER TABLE events DROP COLUMN IF EXISTS date;
ALTER TABLE events DROP COLUMN IF EXISTS name;
ALTER TABLE events DROP COLUMN IF EXISTS team;