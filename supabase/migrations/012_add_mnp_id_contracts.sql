-- MNP新規ID点数計算機能の追加
-- 2026年6月2日以降の実績に適用

-- MNP ID契約明細テーブルを作成
CREATE TABLE IF NOT EXISTS mnp_id_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_performance_id UUID NOT NULL REFERENCES staff_performances(id) ON DELETE CASCADE,

  -- キャリア区分（au/uq）
  carrier TEXT NOT NULL CHECK (carrier IN ('au', 'uq')),

  -- プラン区分
  plan_type TEXT NOT NULL CHECK (plan_type IN (
    'MANEKATSU_2',           -- マネ活2 / 使い放題MAX+マネ活2
    'VALUE_LINK',            -- バリューリンク / 使い放題MAX+
    'KOMIKOMI',              -- コミコミ / コミコミバリュー
    'U12_U18_SENIOR_MINI',   -- U12 / U18 / シニア / スマホミニ
    'TOKUTOKU'               -- トクトク / トクトク2
  )),

  -- 端末区分
  device_type TEXT NOT NULL CHECK (device_type IN (
    'DEVICE',     -- 端末あり
    'SIM_ONLY'    -- SIM
  )),

  -- 特定機種フラグ（Galaxy S26系、Xperia 1 VIIIなど）
  special_device BOOLEAN NOT NULL DEFAULT false,

  -- 件数
  count INTEGER NOT NULL DEFAULT 0,

  -- 除外件数（解約新規など）
  excluded_count INTEGER NOT NULL DEFAULT 0,

  -- 計算結果：1件あたりID点数
  -- 計算式: 1 + (plan_base_point * device_coefficient * 3) + special_device_bonus
  id_score_per_contract NUMERIC NOT NULL DEFAULT 0,

  -- 計算結果：合計ID点数
  -- 計算式: id_score_per_contract * (count - excluded_count)
  total_id_score NUMERIC NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_mnp_id_contracts_staff_performance
  ON mnp_id_contracts(staff_performance_id);

CREATE INDEX IF NOT EXISTS idx_mnp_id_contracts_carrier
  ON mnp_id_contracts(carrier);

-- 更新日時を自動更新するトリガー
CREATE TRIGGER update_mnp_id_contracts_updated_at
  BEFORE UPDATE ON mnp_id_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- イベント日付を取得する関数（2026-06-02以降の判定用）
CREATE OR REPLACE FUNCTION get_event_start_date(p_staff_performance_id UUID)
RETURNS DATE AS $$
  SELECT e.start_date
  FROM staff_performances sp
  JOIN events e ON e.id = sp.event_id
  WHERE sp.id = p_staff_performance_id
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- スタッフ実績のID点数集計ビュー（2026-06-02以降のみ）
CREATE OR REPLACE VIEW staff_id_score_summary AS
SELECT
  sp.id as staff_performance_id,
  sp.event_id,
  sp.staff_name,
  sp.day_number,
  e.start_date,

  -- au MNP件数（既存フィールドから計算）
  COALESCE(sp.au_mnp_sp1, 0) + COALESCE(sp.au_mnp_sp2, 0) + COALESCE(sp.au_mnp_sim, 0) as au_mnp_count,

  -- UQ MNP件数（既存フィールドから計算）
  COALESCE(sp.uq_mnp_sp1, 0) + COALESCE(sp.uq_mnp_sp2, 0) + COALESCE(sp.uq_mnp_sim, 0) as uq_mnp_count,

  -- au MNP ID点数（2026-06-02以降のみ集計）
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id AND carrier = 'au'
      ), 0)
    ELSE 0
  END as au_mnp_id_score,

  -- UQ MNP ID点数（2026-06-02以降のみ集計）
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id AND carrier = 'uq'
      ), 0)
    ELSE 0
  END as uq_mnp_id_score,

  -- 合計ID点数
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id
      ), 0)
    ELSE 0
  END as total_id_score,

  -- 有効件数
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(count - excluded_count)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id
      ), 0)
    ELSE 0
  END as effective_count,

  -- 除外件数
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(excluded_count)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id
      ), 0)
    ELSE 0
  END as total_excluded_count

FROM staff_performances sp
JOIN events e ON e.id = sp.event_id;

-- イベント全体のID点数集計ビュー
CREATE OR REPLACE VIEW event_id_score_summary AS
SELECT
  e.id as event_id,
  e.venue,
  e.agency_name,
  e.start_date,
  e.end_date,
  e.year,
  e.month,
  e.week_number,

  -- イベント日数
  (e.end_date - e.start_date + 1) as event_days,

  -- 合計MNP件数
  COALESCE((
    SELECT SUM(au_mnp_count + uq_mnp_count)
    FROM staff_id_score_summary
    WHERE event_id = e.id
  ), 0) as total_mnp_count,

  -- 合計ID点数
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM staff_id_score_summary
        WHERE event_id = e.id
      ), 0)
    ELSE 0
  END as total_id_score,

  -- 日平均ID点数
  CASE
    WHEN e.start_date >= '2026-06-02' AND (e.end_date - e.start_date + 1) > 0 THEN
      COALESCE((
        SELECT SUM(total_id_score) / (e.end_date - e.start_date + 1)
        FROM staff_id_score_summary
        WHERE event_id = e.id
      ), 0)
    ELSE 0
  END as daily_avg_id_score

FROM events e;
