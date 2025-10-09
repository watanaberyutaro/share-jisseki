'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, FileInput, Eye, BarChart3, Camera, Settings, Calculator, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigation } from '@/contexts/navigation-context'

export function Navigation() {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed } = useNavigation()
  const [userRole, setUserRole] = useState<string>('')
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    setUserRole(role || '')
  }, [])

  const navigationItems = [
    { name: 'ダッシュボード', shortName: 'ダッシュ\nボード', href: '/dashboard', icon: Home, requireAdmin: false },
    { name: '入力', shortName: '入力', href: '/input', icon: FileInput, requireAdmin: false },
    { name: '閲覧', shortName: '閲覧', href: '/view', icon: Eye, requireAdmin: false },
    { name: '分析', shortName: '分析', href: '/analytics', icon: BarChart3, requireAdmin: false },
    { name: 'アルバム', shortName: 'アルバム', href: '/album', icon: Camera, requireAdmin: false },
    { name: '計算機', shortName: '計算機', href: '/calculator', icon: Calculator, requireAdmin: false },
    { name: '管理者', shortName: '管理者', href: '/admin', icon: Shield, requireAdmin: true },
  ]

  const handleNavClick = (e: React.MouseEvent, item: typeof navigationItems[0]) => {
    if (item.requireAdmin && userRole !== 'admin') {
      e.preventDefault()
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    } else {
      // 他のボタンがクリックされたらエラーメッセージを即座に消す
      setShowError(false)
    }
  }

  return (
    <>
      {/* Error Popup */}
      {showError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-md animate-fade-in" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ff4444' }}>
                <Shield className="w-6 h-6" style={{ color: '#FFFFFF' }} />
              </div>
            </div>
            <p className="text-lg font-bold text-center mb-2" style={{ color: '#22211A' }}>アクセス制限</p>
            <p className="text-sm text-center" style={{ color: '#22211A', opacity: 0.7 }}>
              この機能は管理者のみ利用可能です。
            </p>
          </div>
        </div>
      )}

      <nav className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} md:block hidden`} style={{ backgroundColor: '#22211A' }}>
        <div className="flex flex-col h-full">
        {/* Logo/Title with Background */}
        <div className="relative">
          <div className="py-4 px-4 flex justify-center items-center relative">
            {!isCollapsed ? (
              <Link href="/dashboard" className="block text-center">
                <h1 className="text-2xl font-black whitespace-nowrap" style={{ color: '#DCEDC8' }}>
                  SHELA
                </h1>
              </Link>
            ) : (
              <Link href="/dashboard" className="block text-center">
                <h1 className="text-sm font-black" style={{ color: '#DCEDC8' }}>
                  SHELA
                </h1>
              </Link>
            )}
          </div>
        </div>


        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto pt-8 pb-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isDisabled = item.requireAdmin && userRole !== 'admin'

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`
                    block w-full py-2 px-4 font-bold text-sm transition-all duration-200
                    flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'justify-start'}
                    ${isDisabled ? 'cursor-not-allowed' : ''}
                  `}
                  style={{
                    backgroundColor: isActive ? '#DCEDC866' : '#22211A',
                    color: '#DCEDC8',
                    opacity: isDisabled ? 0.4 : (isActive ? 1 : 0.85)
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.backgroundColor = '#DCEDC840'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.backgroundColor = isActive ? '#DCEDC866' : '#22211A'
                    }
                  }}
                >
                  <Icon className="w-6 h-6" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Collapse Button */}
        <div className={`pb-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
            style={{
              color: '#DCEDC8',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#DCEDC820'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </nav>

      {/* モバイル用ボトムナビゲーション */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t" style={{ backgroundColor: '#22211A', borderTopColor: '#DCEDC8' }}>
        <div className="flex justify-around items-center h-16">
          {navigationItems.filter(item => !item.requireAdmin).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isDisabled = item.requireAdmin && userRole !== 'admin'

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${isDisabled ? 'cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: isActive ? '#DCEDC833' : '#22211A',
                  color: '#DCEDC8',
                  opacity: isDisabled ? 0.4 : (isActive ? 1 : 0.85)
                }}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] leading-tight text-center whitespace-pre-line">{item.shortName}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}