import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 認証が必要なパス（ホームページも含む）
  const protectedPaths = ['/', '/input', '/view', '/analytics', '/admin']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname === path || 
    (path !== '/' && request.nextUrl.pathname.startsWith(path))
  )

  // 認証ページ（承認ページも含む）
  const authPaths = ['/auth/login', '/auth/signup', '/auth/approve', '/auth/callback']
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // APIルートは保護から除外
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // 未認証でprotectedパスにアクセスした場合（APIルートを除く）
  if (!user && isProtectedPath && !isApiRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 認証済みで認証ページにアクセスした場合のリダイレクトを無効化
  // ユーザーが明示的にログインページにアクセスできるようにする
  // if (user && isAuthPath) {
  //   return NextResponse.redirect(new URL('/', request.url))
  // }

  // 管理者ページへのアクセス制御
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin' || profile.status !== 'approved') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}