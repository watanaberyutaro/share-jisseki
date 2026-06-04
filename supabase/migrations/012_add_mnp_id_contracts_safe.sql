-- Add MNP ID Score Calculation Feature
-- Applied to events from 2026-06-02 onwards

-- Create MNP ID Contracts table
CREATE TABLE IF NOT EXISTS mnp_id_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_performance_id UUID NOT NULL REFERENCES staff_performances(id) ON DELETE CASCADE,

  carrier TEXT NOT NULL CHECK (carrier IN ('au', 'uq')),
  plan_type TEXT NOT NULL CHECK (plan_type IN (
    'MANEKATSU_2',
    'VALUE_LINK',
    'KOMIKOMI',
    'U12_U18_SENIOR_MINI',
    'TOKUTOKU'
  )),
  device_type TEXT NOT NULL CHECK (device_type IN (
    'DEVICE',
    'SIM_ONLY'
  )),
  special_device BOOLEAN NOT NULL DEFAULT false,
  count INTEGER NOT NULL DEFAULT 0,
  excluded_count INTEGER NOT NULL DEFAULT 0,
  id_score_per_contract NUMERIC NOT NULL DEFAULT 0,
  total_id_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mnp_id_contracts_staff_performance
  ON mnp_id_contracts(staff_performance_id);

CREATE INDEX IF NOT EXISTS idx_mnp_id_contracts_carrier
  ON mnp_id_contracts(carrier);

-- Create trigger for updating updated_at
CREATE TRIGGER update_mnp_id_contracts_updated_at
  BEFORE UPDATE ON mnp_id_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get event start date
CREATE OR REPLACE FUNCTION get_event_start_date(p_staff_performance_id UUID)
RETURNS DATE AS $$
  SELECT e.start_date
  FROM staff_performances sp
  JOIN events e ON e.id = sp.event_id
  WHERE sp.id = p_staff_performance_id
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- View for staff ID score summary
CREATE OR REPLACE VIEW staff_id_score_summary AS
SELECT
  sp.id as staff_performance_id,
  sp.event_id,
  sp.staff_name,
  sp.day_number,
  e.start_date,
  COALESCE(sp.au_mnp_sp1, 0) + COALESCE(sp.au_mnp_sp2, 0) + COALESCE(sp.au_mnp_sim, 0) as au_mnp_count,
  COALESCE(sp.uq_mnp_sp1, 0) + COALESCE(sp.uq_mnp_sp2, 0) + COALESCE(sp.uq_mnp_sim, 0) as uq_mnp_count,
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id AND carrier = 'au'
      ), 0)
    ELSE 0
  END as au_mnp_id_score,
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id AND carrier = 'uq'
      ), 0)
    ELSE 0
  END as uq_mnp_id_score,
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id
      ), 0)
    ELSE 0
  END as total_id_score,
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(count - excluded_count)
        FROM mnp_id_contracts
        WHERE staff_performance_id = sp.id
      ), 0)
    ELSE 0
  END as effective_count,
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

-- View for event ID score summary
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
  (e.end_date - e.start_date + 1) as event_days,
  COALESCE((
    SELECT SUM(au_mnp_count + uq_mnp_count)
    FROM staff_id_score_summary
    WHERE event_id = e.id
  ), 0) as total_mnp_count,
  CASE
    WHEN e.start_date >= '2026-06-02' THEN
      COALESCE((
        SELECT SUM(total_id_score)
        FROM staff_id_score_summary
        WHERE event_id = e.id
      ), 0)
    ELSE 0
  END as total_id_score,
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
