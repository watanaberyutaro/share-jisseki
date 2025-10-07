-- 一時的に認証なしでid_calculation_dataテーブルにアクセスできるようにする
-- ⚠️ 警告: これは開発・テスト用です。本番環境では使用しないでください。

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "管理者は全てのID計算データにアクセス可能" ON id_calculation_data;
DROP POLICY IF EXISTS "作成者は自分のID計算データを読み取り可能" ON id_calculation_data;

-- 一時的に全員がアクセス可能なポリシーを作成
CREATE POLICY "一時的に全員がID計算データにアクセス可能"
ON id_calculation_data
FOR ALL
TO public  -- publicロールで誰でもアクセス可能に
USING (true)  -- 常にtrue = 制限なし
WITH CHECK (true);  -- 常にtrue = 制限なし

-- 代替案：RLSを完全に無効化する場合（より簡単だが、セキュリティリスクが高い）
-- ALTER TABLE id_calculation_data DISABLE ROW LEVEL SECURITY;

-- created_byカラムをNULL許可にする（認証なしでも保存できるように）
ALTER TABLE id_calculation_data
ALTER COLUMN created_by DROP NOT NULL;