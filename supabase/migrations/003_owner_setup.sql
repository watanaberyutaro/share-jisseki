-- オーナーアカウント専用のロールを追加
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('owner', 'admin', 'user', 'pending'));

-- 承認申請通知用のテーブルを作成
CREATE TABLE IF NOT EXISTS approval_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  action TEXT CHECK (action IN ('approve', 'reject')),
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- RLSを有効化
ALTER TABLE approval_notifications ENABLE ROW LEVEL SECURITY;

-- 承認通知のRLSポリシー
CREATE POLICY "Public can verify approval tokens" 
  ON approval_notifications FOR SELECT 
  USING (true);

CREATE POLICY "Public can update approval tokens" 
  ON approval_notifications FOR UPDATE 
  USING (true);

-- オーナー設定関数
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
    -- プロファイルを更新
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
      'owner',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'owner',
      status = 'approved',
      display_name = 'オーナー',
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

-- オーナーのみがアクセスできるビュー
CREATE OR REPLACE VIEW owner_pending_approvals AS
SELECT 
  ar.*,
  p.email,
  p.display_name
FROM approval_requests ar
JOIN profiles p ON ar.user_id = p.id
WHERE ar.status = 'pending';

-- 承認トークンによる承認処理
CREATE OR REPLACE FUNCTION public.process_approval_by_token(
  token_param TEXT,
  action_param TEXT
)
RETURNS json AS $$
DECLARE
  notification_record RECORD;
  result json;
BEGIN
  -- トークンの検証
  SELECT * INTO notification_record
  FROM approval_notifications
  WHERE token = token_param
    AND used = FALSE
    AND expires_at > NOW();
    
  IF notification_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'トークンが無効または期限切れです'
    );
  END IF;
  
  -- 承認処理
  IF action_param = 'approve' THEN
    -- 承認申請を承認
    UPDATE approval_requests
    SET status = 'approved',
        reviewed_at = NOW()
    WHERE id = notification_record.request_id;
    
    -- プロファイルを更新
    UPDATE profiles p
    SET status = 'approved',
        role = ar.requested_role,
        approved_at = NOW()
    FROM approval_requests ar
    WHERE ar.id = notification_record.request_id
      AND p.id = ar.user_id;
      
    result := json_build_object(
      'success', true,
      'message', 'アカウントを承認しました'
    );
  ELSE
    -- 承認申請を拒否
    UPDATE approval_requests
    SET status = 'rejected',
        reviewed_at = NOW()
    WHERE id = notification_record.request_id;
    
    -- プロファイルを更新
    UPDATE profiles p
    SET status = 'rejected'
    FROM approval_requests ar
    WHERE ar.id = notification_record.request_id
      AND p.id = ar.user_id;
      
    result := json_build_object(
      'success', true,
      'message', 'アカウント申請を拒否しました'
    );
  END IF;
  
  -- トークンを使用済みにする
  UPDATE approval_notifications
  SET used = TRUE
  WHERE id = notification_record.id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_approval_notifications_token ON approval_notifications(token);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_expires_at ON approval_notifications(expires_at);