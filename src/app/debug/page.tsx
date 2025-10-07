'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MagneticDots } from '@/components/MagneticDots'

export default function DebugPage() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      }
      setLoading(false)
    }
    checkAuth()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <MagneticDots />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">認証デバッグ情報</h1>
        
        <div className="space-y-6">
          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">セッション情報</h2>
            {session ? (
              <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify({
                  user_id: session.user?.id,
                  email: session.user?.email,
                  expires_at: session.expires_at,
                  access_token: session.access_token ? '存在する' : '存在しない'
                }, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">セッションがありません</p>
            )}
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">プロファイル情報</h2>
            {profile ? (
              <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify(profile, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">プロファイルがありません</p>
            )}
          </div>

          <div className="flex gap-4">
            {session && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                ログアウト
              </button>
            )}
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              ログイン画面へ
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              ホームへ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}