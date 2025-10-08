'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/navigation-context'
import { User, LogOut } from 'lucide-react'
import { removeSession } from '@/lib/supabase/sessions'

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

    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

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
        <div className="flex items-center space-x-1 md:space-x-6 ml-1 md:ml-8">
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

        {/* User Info and Logout - Right */}
        <div className="flex items-center space-x-1 md:space-x-6 mr-1 md:mr-8">
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
    </div>
  )
}