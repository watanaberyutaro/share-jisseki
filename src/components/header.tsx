'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/navigation-context'
import { User, LogOut, Bell } from 'lucide-react'
import { removeSession } from '@/lib/supabase/sessions'
import { getActiveNews, type News } from '@/lib/supabase/news'

interface HeaderProps {
  isLoginPage?: boolean
}

export function Header({ isLoginPage = false }: HeaderProps) {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [news, setNews] = useState<News[]>([])
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)
  const { isCollapsed } = useNavigation()

  const handleLogout = async () => {
    console.log('[Header] ログアウト前のユーザー名:', localStorage.getItem('userName'))
    console.log('[Header] LocalStorageの全キー:', Object.keys(localStorage))

    const userName = localStorage.getItem('userName')

    // セッションを削除
    if (userName) {
      await removeSession(userName)
    }

    // Draft データは保持するため、userRoleとuserNameのみ削除
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')

    console.log('[Header] ログアウト後のLocalStorageの全キー:', Object.keys(localStorage))
    router.push('/login')
  }

  useEffect(() => {
    setIsMounted(true)
    const role = localStorage.getItem('userRole')
    const name = localStorage.getItem('userName')
    setUserRole(role || '')
    setUserName(name || '')

    // モバイル判定とリサイズ処理
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // ニュースを読み込み
    loadNews()
    const newsInterval = setInterval(loadNews, 30000)

    return () => {
      clearInterval(timer)
      clearInterval(newsInterval)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  useEffect(() => {
    if (news.length === 0) return
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % news.length)
    }, 15000)
    return () => clearInterval(interval)
  }, [news.length])

  const loadNews = async () => {
    const activeNews = await getActiveNews()
    setNews(activeNews)
  }

  const navigationWidth = isCollapsed ? '4rem' : '16rem'

  return (
    <div
      className="fixed top-0 z-50 transition-all duration-300 backdrop-blur-lg border-b"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(16px)',
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
        marginLeft: isMobile ? '0' : navigationWidth,
        width: isMobile ? '100%' : `calc(100% - ${navigationWidth})`
      }}
    >
      <div className="w-full py-2 md:py-3 px-2 md:px-4 flex justify-between items-center">
        {/* Date and Time - Left */}
        <div className="flex items-center space-x-1 md:space-x-6 ml-1 md:ml-8 flex-shrink-0">
          {/* Date */}
          <div className="flex items-center space-x-1">
            <span className="text-xs md:text-lg font-semibold drop-shadow-sm" style={{ color: '#FFFFFF' }}>
              {isMounted ? `${currentTime.getFullYear()}/${(currentTime.getMonth() + 1).toString().padStart(2, '0')}/${currentTime.getDate().toString().padStart(2, '0')}` : '--/--/--'}
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center space-x-1">
            <span className="text-xs md:text-lg font-semibold tabular-nums drop-shadow-sm" style={{ color: '#FFFFFF' }}>
              {isMounted ? `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}:${currentTime.getSeconds().toString().padStart(2, '0')}` : '--:--:--'}
            </span>
          </div>
        </div>

        {/* News Ticker - Center */}
        {!isLoginPage && news.length > 0 && (
          <div className="flex-1 flex items-center gap-2 overflow-hidden mx-4">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Bell className="w-4 md:w-5 h-4 md:h-5 drop-shadow-sm" style={{ color: '#FFFFFF' }} />
              <span className="text-xs md:text-lg font-semibold drop-shadow-sm" style={{ color: '#FFFFFF' }}>お知らせ</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-scroll-left whitespace-nowrap inline-block">
                <span className="text-xs md:text-lg font-semibold drop-shadow-sm" style={{ color: '#FFFFFF' }}>
                  {news[currentNewsIndex]?.content}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User Info and Logout - Right */}
        <div className="flex items-center space-x-1 md:space-x-6 mr-1 md:mr-8 flex-shrink-0">
          {isLoginPage ? (
            <div className="flex items-center">
              <User className="w-5 md:w-6 h-5 md:h-6 drop-shadow-sm" style={{ color: '#FFFFFF' }} />
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-1 md:space-x-2">
                <User className="w-4 md:w-6 h-4 md:h-6 drop-shadow-sm" style={{ color: '#FFFFFF' }} />
                <span className="text-xs md:text-lg font-semibold drop-shadow-sm hidden sm:inline" style={{ color: '#FFFFFF' }}>
                  {userRole === 'admin' ? '管理者' : userName || 'ユーザー'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-1 md:py-2 rounded-lg transition-all"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.35)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                }}
              >
                <LogOut className="w-4 md:w-5 h-4 md:h-5 drop-shadow-sm" style={{ color: '#FFFFFF' }} />
                <span className="text-xs md:text-sm font-semibold drop-shadow-sm hidden sm:inline" style={{ color: '#FFFFFF' }}>
                  ログアウト
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-scroll-left {
          animation: scroll-left 15s linear infinite;
        }
      `}</style>
    </div>
  )
}