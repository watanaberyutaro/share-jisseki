-- RLSを完全に無効化して、誰でもアクセス可能にする
-- ⚠️ 警告: これは開発・テスト用です。本番環境では絶対に使用しないでください。

-- 既存のすべてのポリシーを削除
DROP POLICY IF EXISTS "管理者は全てのID計算データにアクセス可能" ON id_calculation_data;
DROP POLICY IF EXISTS "作成者は自分のID計算データを読み取り可能" ON id_calculation_data;
DROP POLICY IF EXISTS "一時的に全員がID計算データにアクセス可能" ON id_calculation_data;

-- RLSを完全に無効化
ALTER TABLE id_calculation_data DISABLE ROW LEVEL SECURITY;

-- 確認用: テーブルのRLS状態を表示
SELECT
    tablename,
    rowsecurity
FROM
    pg_tables
WHERE
    schemaname = 'public'
    AND tablename = 'id_calculation_data';