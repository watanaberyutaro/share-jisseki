import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 管理者権限でSupabaseクライアントを作成
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is disabled in production' }, { status: 403 })
  }

  try {
    // 1. オーナーアカウントを作成（既に存在する場合はスキップ）
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'harukadmla@gmail.com',
      password: 'Pw321321',
      email_confirm: true,
      user_metadata: {
        display_name: 'オーナー'
      }
    })

    let userId: string

    if (authError) {
      // ユーザーが既に存在する場合
      if (authError.message.includes('already exists') || authError.message.includes('duplicate')) {
        // 既存のユーザーを取得
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === 'harukadmla@gmail.com')
        
        if (!existingUser) {
          return NextResponse.json({ error: 'ユーザーの取得に失敗しました' }, { status: 500 })
        }
        
        userId = existingUser.id
        console.log('既存のユーザーを使用:', userId)
      } else {
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }
    } else {
      userId = authData.user.id
      console.log('新規ユーザーを作成:', userId)
    }

    // 2. プロファイルを作成または更新
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: 'harukadmla@gmail.com',
        display_name: 'オーナー',
        role: 'owner',
        status: 'approved',
        requested_role: 'admin', // ownerではなくadminに設定（制約回避）
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ 
        error: 'プロファイルの作成に失敗しました', 
        details: profileError.message 
      }, { status: 500 })
    }

    // 3. 承認申請レコードも作成（必要に応じて）
    await supabaseAdmin
      .from('approval_requests')
      .upsert({
        user_id: userId,
        requested_role: 'admin',
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()

    // 4. 最終的なプロファイルを確認
    const { data: finalProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      success: true,
      message: 'オーナーアカウントが正常に作成されました',
      profile: finalProfile,
      credentials: {
        email: 'harukadmla@gmail.com',
        password: 'Pw321321'
      },
      loginUrl: '/auth/login'
    })

  } catch (error) {
    console.error('Create owner error:', error)
    return NextResponse.json({ 
      error: 'オーナーアカウントの作成中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}