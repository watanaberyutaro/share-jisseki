-- eventsテーブルの更新
ALTER TABLE events 
  DROP COLUMN IF EXISTS team,
  ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  ADD COLUMN IF NOT EXISTS month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  ADD COLUMN IF NOT EXISTS week_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS agency_name TEXT;

-- staff_performancesテーブルの作成
CREATE TABLE IF NOT EXISTS staff_performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  
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
  
  -- 計算用カラム（集計値）
  hs_total INTEGER GENERATED ALWAYS AS (
    au_mnp_sp1 + au_mnp_sp2 + au_mnp_sim +
    uq_mnp_sp1 + uq_mnp_sp2 + uq_mnp_sim +
    au_hs_sp1 + au_hs_sp2 + au_hs_sim +
    uq_hs_sp1 + uq_hs_sp2 + uq_hs_sim +
    cell_up_sp1 + cell_up_sp2 + cell_up_sim
  ) STORED,
  
  ltv_total INTEGER GENERATED ALWAYS AS (
    credit_card + gold_card + ji_bank_account + 
    warranty + ott + electricity + gas
  ) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_staff_performances_event_id ON staff_performances(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_performances_staff_name ON staff_performances(staff_name);
CREATE INDEX IF NOT EXISTS idx_events_period ON events(year, month, week_number);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);

-- 更新トリガー
CREATE TRIGGER update_staff_performances_updated_at
  BEFORE UPDATE ON staff_performances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLSを無効化
ALTER TABLE staff_performances DISABLE ROW LEVEL SECURITY;

-- 既存のperformancesテーブルも更新（目標値を追加）
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
  ADD COLUMN IF NOT EXISTS challenges_and_solutions TEXT,
  ADD COLUMN IF NOT EXISTS booth_photos JSONB;