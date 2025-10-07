# 認証システムセットアップガイド

## Supabaseでメール認証を設定する方法

### 方法1: メール認証を無効化する（開発環境向け）

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard でプロジェクトを開く

2. **Authentication設定を開く**
   - 左サイドバーの「Authentication」をクリック
   - 「Providers」タブを選択

3. **Email認証の設定**
   - 「Email」プロバイダーをクリック
   - 「Enable Email Confirmations」を**OFF**にする
   - 「Save」をクリック

これで、メール認証なしでユーザー登録が可能になります。

### 方法2: メール認証を有効にする（本番環境向け）

1. **Supabaseダッシュボード > Authentication > Settings**
   - 「Enable Email Confirmations」を**ON**にする

2. **SMTPサーバーを設定**（カスタムSMTP推奨）
   - Settings > Project Settings > Auth
   - 「SMTP Settings」セクションでSMTPサーバーを設定
   
   例（Gmail）:
   - Host: smtp.gmail.com
   - Port: 587
   - User: あなたのGmailアドレス
   - Pass: アプリパスワード（2段階認証必須）
   - Sender email: あなたのGmailアドレス
   - Sender name: あなたのサービス名

3. **メールテンプレートをカスタマイズ**
   - Authentication > Email Templates
   - 各テンプレートをカスタマイズ可能

## SQLマイグレーションの実行

1. **Supabaseダッシュボード > SQL Editor**
2. 以下のファイルの内容をコピー&ペースト:
   - `/supabase/migrations/002_auth_system.sql`
3. 「Run」をクリック

## 最初の管理者を設定

1. 通常通りサインアップ（/auth/signup）
2. Supabase SQL Editorで以下を実行:

```sql
-- メールアドレスを実際の管理者メールに変更してください
SELECT public.set_initial_admin('admin@example.com');
```

3. その後、そのアカウントでログイン可能

## トラブルシューティング

### メール認証が機能しない場合

1. **メール確認を無効化**
   - 開発環境では推奨
   - Authentication > Providers > Email > Enable Email Confirmations = OFF

2. **メールが届かない場合**
   - Supabaseの無料プランはメール送信数に制限あり
   - カスタムSMTPの設定を推奨

3. **「User not allowed」エラーの場合**
   - Authentication > Settings > User Signups = Enabled を確認

### データベースエラーの場合

1. **RLSポリシーの確認**
   - Table Editor > profiles > RLS Policies
   - 必要なポリシーが作成されているか確認

2. **トリガーの確認**
   - Database > Functions
   - `handle_new_user`関数が存在するか確認

## 開発用の簡易設定

開発環境では以下の設定を推奨:

1. メール認証: OFF
2. User Signups: Enabled  
3. 最初の管理者は手動でSQLで設定

本番環境では適切なメール認証とセキュリティ設定を行ってください。