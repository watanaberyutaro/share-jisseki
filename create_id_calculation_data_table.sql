-- id_calculation_data テーブルの作成
-- 新規ID計算用データを保存するテーブル

CREATE TABLE IF NOT EXISTS id_calculation_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 算定期間
    calculation_period_start DATE NOT NULL,
    calculation_period_end DATE NOT NULL,

    -- au MNP
    au_mnp_sp1 INTEGER NOT NULL DEFAULT 0,
    au_mnp_sp2 INTEGER NOT NULL DEFAULT 0,
    au_mnp_sim INTEGER NOT NULL DEFAULT 0,

    -- UQ MNP
    uq_mnp_sp1 INTEGER NOT NULL DEFAULT 0,
    uq_mnp_sp2 INTEGER NOT NULL DEFAULT 0,
    uq_mnp_sim INTEGER NOT NULL DEFAULT 0,

    -- au HS
    au_hs_sp1 INTEGER NOT NULL DEFAULT 0,
    au_hs_sp2 INTEGER NOT NULL DEFAULT 0,
    au_hs_sim INTEGER NOT NULL DEFAULT 0,

    -- UQ HS
    uq_hs_sp1 INTEGER NOT NULL DEFAULT 0,
    uq_hs_sp2 INTEGER NOT NULL DEFAULT 0,
    uq_hs_sim INTEGER NOT NULL DEFAULT 0,

    -- セルアップ
    cellup_sp1 INTEGER NOT NULL DEFAULT 0,
    cellup_sp2 INTEGER NOT NULL DEFAULT 0,
    cellup_sim INTEGER NOT NULL DEFAULT 0,

    -- メタデータ
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE id_calculation_data ENABLE ROW LEVEL SECURITY;

-- 管理者のみが全てのデータにアクセス可能
CREATE POLICY "管理者は全てのID計算データにアクセス可能"
ON id_calculation_data
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.status = 'approved'
    )
);

-- 作成者は自分のデータのみアクセス可能（読み取りのみ）
CREATE POLICY "作成者は自分のID計算データを読み取り可能"
ON id_calculation_data
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- インデックスの作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_id_calculation_data_period
ON id_calculation_data(calculation_period_start, calculation_period_end);

CREATE INDEX IF NOT EXISTS idx_id_calculation_data_created_by
ON id_calculation_data(created_by);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_id_calculation_data_updated_at
    BEFORE UPDATE ON id_calculation_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();