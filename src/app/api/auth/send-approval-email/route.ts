import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OWNER_EMAIL = 'harukadmla@gmail.com'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { userId, userEmail, displayName, requestedRole } = await request.json()

    // 承認申請を取得
    const { data: approvalRequest, error: requestError } = await supabase
      .from('approval_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    if (requestError || !approvalRequest) {
      return NextResponse.json(
        { error: '承認申請が見つかりません' },
        { status: 404 }
      )
    }

    // 承認用トークンを生成
    const approveToken = crypto.randomUUID()
    const rejectToken = crypto.randomUUID()

    // トークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('approval_notifications')
      .insert([
        {
          request_id: approvalRequest.id,
          token: approveToken,
          action: 'approve'
        },
        {
          request_id: approvalRequest.id,
          token: rejectToken,
          action: 'reject'
        }
      ])

    if (tokenError) {
      console.error('Token creation error:', tokenError)
      return NextResponse.json(
        { error: 'トークンの生成に失敗しました' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const approveUrl = `${baseUrl}/auth/approve?token=${approveToken}&action=approve`
    const rejectUrl = `${baseUrl}/auth/approve?token=${rejectToken}&action=reject`

    // メールの内容を作成（HTML形式）
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>新規アカウント申請</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; color: white; border-radius: 5px; font-weight: bold; }
          .approve { background: #10b981; }
          .reject { background: #ef4444; }
          .info { background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>新規アカウント申請のお知らせ</h1>
          </div>
          <div class="content">
            <p>オーナー様</p>
            <p>以下のユーザーから新規アカウントの申請がありました：</p>
            
            <div class="info">
              <p><strong>名前:</strong> ${displayName}</p>
              <p><strong>メールアドレス:</strong> ${userEmail}</p>
              <p><strong>申請権限:</strong> ${requestedRole === 'admin' ? '管理者' : 'ユーザー'}</p>
              <p><strong>申請日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            </div>
            
            <p>以下のボタンをクリックして、申請を承認または拒否してください：</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approveUrl}" class="button approve">承認する</a>
              <a href="${rejectUrl}" class="button reject">拒否する</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              ※このリンクは7日間有効です。<br>
              ※ボタンが機能しない場合は、以下のURLをブラウザにコピーしてください：
            </p>
            <p style="font-size: 12px; word-break: break-all;">
              承認: ${approveUrl}<br>
              拒否: ${rejectUrl}
            </p>
          </div>
          <div class="footer">
            <p>このメールは実績分析システムから自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Supabase Edge FunctionまたはResendなどのメールサービスを使用
    // ここでは簡易的にコンソールログに出力（実際の実装ではメールサービスを使用）
    console.log('Sending email to:', OWNER_EMAIL)
    console.log('Approve URL:', approveUrl)
    console.log('Reject URL:', rejectUrl)

    // 実際のメール送信（Resend APIの例）
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'system@yourdomain.com',
          to: OWNER_EMAIL,
          subject: `【承認依頼】新規アカウント申請 - ${displayName}`,
          html: emailHtml,
        }),
      })

      if (!response.ok) {
        console.error('Failed to send email via Resend')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'メール送信処理を開始しました',
      // デバッグ用（本番環境では削除）
      debug: {
        approveUrl,
        rejectUrl
      }
    })

  } catch (error) {
    console.error('Error in send-approval-email:', error)
    return NextResponse.json(
      { error: 'メール送信に失敗しました' },
      { status: 500 }
    )
  }
}