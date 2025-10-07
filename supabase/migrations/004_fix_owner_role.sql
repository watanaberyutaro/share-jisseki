-- requested_role制約を修正してownerロールを追加

-- 既存の制約を削除
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_requested_role_check;

-- ownerを含む新しい制約を追加
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_requested_role_check 
  CHECK (requested_role IN ('owner', 'admin', 'user'));

-- roleの制約も再確認（既に003で修正済みだが念のため）
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('owner', 'admin', 'user', 'pending'));

-- オーナーアカウントを手動で作成する関数（エラーハンドリング改善版）
CREATE OR REPLACE FUNCTION public.setup_owner_account()
RETURNS void AS $$
DECLARE
  owner_id UUID;
BEGIN
  -- オーナーアカウントのIDを取得
  SELECT id INTO owner_id 
  FROM auth.users 
  WHERE email = 'harukadmla@gmail.com'
  LIMIT 1;
  
  IF owner_id IS NOT NULL THEN
    -- プロファイルを更新または作成
    INSERT INTO public.profiles (
      id, 
      email, 
      display_name, 
      role, 
      status, 
      requested_role,
      approved_at
    ) VALUES (
      owner_id,
      'harukadmla@gmail.com',
      'オーナー',
      'owner',
      'approved',
      'owner',  -- ここをownerに設定
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'owner',
      status = 'approved',
      display_name = 'オーナー',
      requested_role = 'owner',  -- 既存レコードもownerに更新
      approved_at = NOW();
      
    -- 既存の承認申請があれば承認済みにする
    UPDATE approval_requests
    SET status = 'approved',
        reviewed_at = NOW()
    WHERE user_id = owner_id;
    
    RAISE NOTICE 'オーナーアカウントが設定されました';
  ELSE
    RAISE NOTICE 'オーナーアカウントが見つかりません。先にサインアップしてください。';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;