-- Add order_type column to support both MNP and Regular new contracts
-- This extends the ID calculation to cover all HS new (au/uq new) contracts

-- Add order_type column
ALTER TABLE mnp_id_contracts
ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'MNP'
CHECK (order_type IN ('MNP', 'REGULAR'));

-- Add index for order_type
CREATE INDEX IF NOT EXISTS idx_mnp_id_contracts_order_type
  ON mnp_id_contracts(order_type);

-- Add comment to clarify the table now handles both MNP and Regular new contracts
COMMENT ON TABLE mnp_id_contracts IS 'HS新規（au新規・UQ新規）のID契約データ。MNP新規と通常新規の両方を含む。';
COMMENT ON COLUMN mnp_id_contracts.order_type IS 'オーダー種別: MNP = MNP新規（係数×3）, REGULAR = 通常新規（係数×1）';
