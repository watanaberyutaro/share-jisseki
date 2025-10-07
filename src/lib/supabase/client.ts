import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// シングルトンパターンでクライアントを管理
let supabaseClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  // 既存のクライアントがあればそれを返す
  if (supabaseClient) {
    return supabaseClient
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      console.error('Supabase環境変数が設定されていません:', { url: !!url, anonKey: !!anonKey })
      throw new Error('Supabase環境変数が設定されていません')
    }

    // 開発環境でのみログを出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Supabaseクライアント作成中:', { url: url.substring(0, 30) + '...', anonKey: anonKey.substring(0, 20) + '...' })
    }

    supabaseClient = createBrowserClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'x-application-name': 'event-performance-analyzer'
        },
      },
      db: {
        schema: 'public'
      }
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Supabaseクライアント作成完了')
    }
    
    return supabaseClient
  } catch (error) {
    console.error('Supabaseクライアント作成エラー:', error)
    throw error
  }
}