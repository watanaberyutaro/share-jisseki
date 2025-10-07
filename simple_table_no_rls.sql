-- 既存のテーブルを削除して再作成（データは失われます）
DROP TABLE IF EXISTS id_calculation_data CASCADE;

-- シンプルなテーブル作成（RLSなし）
CREATE TABLE id_calculation_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    calculation_period_start DATE,
    calculation_period_end DATE,
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
    cellup_sp1 INTEGER DEFAULT 0,
    cellup_sp2 INTEGER DEFAULT 0,
    cellup_sim INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSは無効のまま（デフォルト）
-- ALTER TABLE id_calculation_data DISABLE ROW LEVEL SECURITY;

-- テーブル作成確認
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'id_calculation_data'
ORDER BY
    ordinal_position;