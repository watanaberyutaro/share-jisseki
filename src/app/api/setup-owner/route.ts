import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// このエンドポイントは開発環境でのみ使用
// 本番環境では無効化してください
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is disabled in production' }, { status: 403 })
  }

  const supabase = await createClient()
  
  try {
    // 1. オーナーアカウントが存在するか確認
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'harukadmla@gmail.com')
      .single()

    if (existingUser) {
      // 既存のアカウントをオーナーに更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'owner',
          status: 'approved',
          display_name: 'オーナー',
          approved_at: new Date().toISOString()
        })
        .eq('email', 'harukadmla@gmail.com')

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ 
        message: '既存のアカウントをオーナー権限に更新しました',
        profile: existingUser
      })
    }

    // 2. setup_owner_account関数を実行
    const { data, error } = await supabase.rpc('setup_owner_account')

    if (error) {
      // アカウントが存在しない場合のメッセージ
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ 
          message: 'オーナーアカウントが見つかりません。先に /auth/signup からアカウントを作成してください。',
          signupUrl: '/auth/signup',
          credentials: {
            email: 'harukadmla@gmail.com',
            password: 'Pw321321',
            displayName: 'オーナー'
          }
        }, { status: 404 })
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 3. 設定後のプロファイルを確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'harukadmla@gmail.com')
      .single()

    return NextResponse.json({
      message: 'オーナーアカウントが正常に設定されました',
      profile,
      loginUrl: '/auth/login'
    })

  } catch (error) {
    console.error('Owner setup error:', error)
    return NextResponse.json({ 
      error: 'オーナーアカウントの設定中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}