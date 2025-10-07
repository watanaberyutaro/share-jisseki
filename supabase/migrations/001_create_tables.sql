-- eventsテーブルの作成
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL,
  team TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- performancesテーブルの作成
CREATE TABLE IF NOT EXISTS performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- au MNP
  au_mnp_sp1 INTEGER DEFAULT 0,
  au_mnp_sp2 INTEGER DEFAULT 0,
  au_mnp_sim INTEGER DEFAULT 0,
  
  -- UQ MNP
  uq_mnp_sp1 INTEGER DEFAULT 0,
  uq_mnp_sp2 INTEGER DEFAULT 0,
  uq_mnp_sim INTEGER DEFAULT 0,
  
  -- au HS
  au_hs_sp1 INTEGER DEFAULT 0,
  au_hs_sp2 INTEGER DEFAULT 0,
  au_hs_sim INTEGER DEFAULT 0,
  
  -- UQ HS
  uq_hs_sp1 INTEGER DEFAULT 0,
  uq_hs_sp2 INTEGER DEFAULT 0,
  uq_hs_sim INTEGER DEFAULT 0,
  
  -- Cell UP
  cell_up_sp1 INTEGER DEFAULT 0,
  cell_up_sp2 INTEGER DEFAULT 0,
  cell_up_sim INTEGER DEFAULT 0,
  
  -- その他
  credit_card INTEGER DEFAULT 0,
  gold_card INTEGER DEFAULT 0,
  ji_bank_account INTEGER DEFAULT 0,
  warranty INTEGER DEFAULT 0,
  ott INTEGER DEFAULT 0,
  electricity INTEGER DEFAULT 0,
  gas INTEGER DEFAULT 0,
  network_count INTEGER DEFAULT 0,
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- eventsテーブルのトリガー
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- performancesテーブルのトリガー
CREATE TRIGGER update_performances_updated_at
  BEFORE UPDATE ON performances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- インデックスの作成
CREATE INDEX idx_performances_event_id ON performances(event_id);
CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_performances_created_at ON performances(created_at DESC);