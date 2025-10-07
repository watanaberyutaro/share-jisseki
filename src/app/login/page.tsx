'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Shield, Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | null>(null)
  const [welcomeText, setWelcomeText] = useState('')
  const [welcomeSubtext, setWelcomeSubtext] = useState('')
  const [loginTitle, setLoginTitle] = useState('')
  const [loginSubtitle, setLoginSubtitle] = useState('')
  const [showAdminAuth, setShowAdminAuth] = useState(false)
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [showUserSelect, setShowUserSelect] = useState(false)
  const [userList, setUserList] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const fullText = 'WELCOME TO SHELA'
  const fullSubtext = 'SHARE EVENT LOG ANALYZER'
  const loginTitleText = 'Click to Log in'
  const loginSubtitleText = ''

  useEffect(() => {
    // 初期ID/パスワードをlocalStorageに保存（存在しない場合のみ）
    if (!localStorage.getItem('adminId')) {
      localStorage.setItem('adminId', 'SHELA')
    }
    if (!localStorage.getItem('adminPassword')) {
      localStorage.setItem('adminPassword', 'Pw123123')
    }

    // ユーザーリストを読み込み
    const savedUsers = localStorage.getItem('userList')
    if (savedUsers) {
      setUserList(JSON.parse(savedUsers))
    }

    let welcomeTitleIndex = 0
    let welcomeSubtextIndex = 0
    let loginTitleIndex = 0
    let loginSubtitleIndex = 0
    let welcomeTitleComplete = false
    let welcomeSubtextComplete = false
    let loginTitleComplete = false

    const typingInterval = setInterval(() => {
      // Welcome title
      if (!welcomeTitleComplete) {
        if (welcomeTitleIndex <= fullText.length) {
          setWelcomeText(fullText.slice(0, welcomeTitleIndex))
          welcomeTitleIndex++
        } else {
          welcomeTitleComplete = true
        }
      }

      // Welcome subtext
      if (welcomeTitleComplete && !welcomeSubtextComplete) {
        if (welcomeSubtextIndex <= fullSubtext.length) {
          setWelcomeSubtext(fullSubtext.slice(0, welcomeSubtextIndex))
          welcomeSubtextIndex++
        } else {
          welcomeSubtextComplete = true
        }
      }

      // Login title
      if (welcomeSubtextComplete && !loginTitleComplete) {
        if (loginTitleIndex <= loginTitleText.length) {
          setLoginTitle(loginTitleText.slice(0, loginTitleIndex))
          loginTitleIndex++
        } else {
          loginTitleComplete = true
        }
      }

      // Login subtitle (empty but keep structure)
      if (loginTitleComplete) {
        if (loginSubtitleIndex <= loginSubtitleText.length) {
          setLoginSubtitle(loginSubtitleText.slice(0, loginSubtitleIndex))
          loginSubtitleIndex++
        } else {
          clearInterval(typingInterval)
        }
      }
    }, 80)

    return () => clearInterval(typingInterval)
  }, [])

  const handleLogin = (role: 'user' | 'admin') => {
    if (role === 'admin') {
      // 管理者の場合は認証モーダルを表示
      setShowAdminAuth(true)
    } else {
      // ユーザーの場合はユーザー選択モーダルを表示
      setShowUserSelect(true)
    }
  }

  const handleUserSelect = (userName: string) => {
    localStorage.setItem('userRole', 'user')
    localStorage.setItem('userName', userName)
    router.push('/')
  }

  const handleAddUser = () => {
    if (newUserName.trim()) {
      const updatedList = [...userList, newUserName.trim()]
      setUserList(updatedList)
      localStorage.setItem('userList', JSON.stringify(updatedList))
      setNewUserName('')
      setIsAddingUser(false)
    }
  }

  const handleEditUser = (oldName: string) => {
    if (editUserName.trim() && editUserName !== oldName) {
      const updatedList = userList.map(name => name === oldName ? editUserName.trim() : name)
      setUserList(updatedList)
      localStorage.setItem('userList', JSON.stringify(updatedList))
      setEditingUser(null)
      setEditUserName('')
    }
  }

  const handleDeleteUser = (userName: string) => {
    const updatedList = userList.filter(name => name !== userName)
    setUserList(updatedList)
    localStorage.setItem('userList', JSON.stringify(updatedList))
  }

  const handleAdminAuth = () => {
    const savedId = localStorage.getItem('adminId')
    const savedPassword = localStorage.getItem('adminPassword')

    if (adminId === savedId && adminPassword === savedPassword) {
      // 認証成功
      localStorage.setItem('userRole', 'admin')
      router.push('/')
    } else {
      // 認証失敗
      setAuthError('IDまたはパスワードが正しくありません')
      setTimeout(() => setAuthError(''), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <MagneticDots />

      {/* User Select Modal */}
      {showUserSelect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 mx-4 max-w-md w-full" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22211A' }}>
                <User className="w-8 h-8" style={{ color: '#DCEDC8' }} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#22211A' }}>ユーザー選択</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#22211A', opacity: 0.7 }}>
              ログインするユーザーを選択してください
            </p>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {userList.map((userName) => (
                <div key={userName} className="flex items-center gap-2">
                  {editingUser === userName ? (
                    <>
                      <input
                        type="text"
                        value={editUserName}
                        onChange={(e) => setEditUserName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditUser(userName)}
                        className="flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none"
                        style={{ borderColor: '#22211A', color: '#22211A' }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditUser(userName)}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ backgroundColor: '#4abf79', color: '#FFFFFF' }}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(null)
                          setEditUserName('')
                        }}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ backgroundColor: '#9E9E9E', color: '#FFFFFF' }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUserSelect(userName)}
                        className="flex-1 px-4 py-3 rounded-lg font-bold transition-all hover:opacity-90 text-left"
                        style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}
                      >
                        {userName}
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(userName)
                          setEditUserName(userName)
                        }}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ backgroundColor: '#FFB300', color: '#FFFFFF' }}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(userName)}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ backgroundColor: '#ff4444', color: '#FFFFFF' }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {isAddingUser ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                    className="flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none"
                    style={{ borderColor: '#22211A', color: '#22211A' }}
                    placeholder="新しいユーザー名"
                    autoFocus
                  />
                  <button
                    onClick={handleAddUser}
                    className="p-2 rounded-lg hover:opacity-80"
                    style={{ backgroundColor: '#4abf79', color: '#FFFFFF' }}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingUser(false)
                      setNewUserName('')
                    }}
                    className="p-2 rounded-lg hover:opacity-80"
                    style={{ backgroundColor: '#9E9E9E', color: '#FFFFFF' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="w-full py-3 rounded-lg font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2 border-2 border-dashed"
                  style={{ borderColor: '#22211A', color: '#22211A' }}
                >
                  <Plus className="w-5 h-5" />
                  新しいユーザーを追加
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUserSelect(false)
                  setIsAddingUser(false)
                  setNewUserName('')
                  setEditingUser(null)
                  setEditUserName('')
                }}
                className="flex-1 py-3 rounded-lg font-bold transition-all hover:opacity-80"
                style={{ backgroundColor: '#9E9E9E', color: '#FFFFFF' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Auth Modal */}
      {showAdminAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 mx-4 max-w-md w-full" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22211A' }}>
                <Shield className="w-8 h-8" style={{ color: '#DCEDC8' }} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#22211A' }}>管理者認証</h2>
            <p className="text-sm text-center mb-6" style={{ color: '#22211A', opacity: 0.7 }}>
              IDとパスワードを入力してください
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-lg text-center" style={{ backgroundColor: '#ff444420', color: '#ff4444' }}>
                <p className="text-sm font-semibold">{authError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#22211A' }}>ID</label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-opacity-100"
                  style={{ borderColor: 'rgba(34, 33, 26, 0.3)', color: '#22211A' }}
                  placeholder="IDを入力"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#22211A' }}>パスワード</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-opacity-100"
                  style={{ borderColor: 'rgba(34, 33, 26, 0.3)', color: '#22211A' }}
                  placeholder="パスワードを入力"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAdminAuth(false)
                  setAdminId('')
                  setAdminPassword('')
                  setAuthError('')
                }}
                className="flex-1 py-3 rounded-lg font-bold transition-all hover:opacity-80"
                style={{ backgroundColor: '#9E9E9E', color: '#FFFFFF' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAdminAuth}
                className="flex-1 py-3 rounded-lg font-bold transition-all hover:opacity-90"
                style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}
              >
                ログイン
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Page with Welcome Message */}
      <div className="w-full max-w-md p-4 md:p-8 relative z-10">
        {/* Welcome Message */}
        <div className="text-center mb-6 md:mb-8">
          {/* モバイル版 */}
          <h1 className="md:hidden text-2xl sm:text-3xl font-black mb-2 min-h-[32px] sm:min-h-[40px] whitespace-nowrap" style={{ color: '#22211A' }}>
            {welcomeText}
            {welcomeText && welcomeText.length < fullText.length && <span className="animate-pulse">|</span>}
          </h1>
          {/* デスクトップ版 */}
          <h1 className="hidden md:block text-5xl lg:text-6xl font-black mb-4 min-h-[72px]" style={{ color: '#22211A' }}>
            {welcomeText}
            {welcomeText && welcomeText.length < fullText.length && <span className="animate-pulse">|</span>}
          </h1>

          {/* モバイル版サブテキスト */}
          <p className="md:hidden text-xs sm:text-sm font-semibold min-h-[16px] sm:min-h-[20px]" style={{ color: '#22211A', opacity: 0.7 }}>
            {welcomeSubtext.split(' ').map((word, index, array) => {
              const wordsBeforeThis = array.slice(0, index).join(' ')
              const currentWordEnd = wordsBeforeThis ? wordsBeforeThis.length + 1 + word.length : word.length
              if (welcomeSubtext.length >= currentWordEnd) {
                return (
                  <span key={index}>
                    <span className="inline-block">{word}</span>
                    {index < array.length - 1 && ' '}
                  </span>
                )
              }
              return null
            })}
            {welcomeSubtext && welcomeSubtext.length < fullSubtext.length && <span className="animate-pulse">|</span>}
          </p>
          {/* デスクトップ版サブテキスト */}
          <p className="hidden md:block text-lg lg:text-xl font-semibold min-h-[32px]" style={{ color: '#22211A', opacity: 0.7 }}>
            {welcomeSubtext}
            {welcomeSubtext && welcomeSubtext.length < fullSubtext.length && <span className="animate-pulse">|</span>}
          </p>
        </div>

        {/* Login Section */}
        <div>
          <div className="text-center mb-6 md:mb-8">
            {/* モバイル版ログインタイトル */}
            <h2 className="md:hidden text-xl sm:text-2xl font-bold mb-1 min-h-[28px] sm:min-h-[32px]" style={{ color: '#22211A' }}>
              {loginTitle.split(' ').map((word, index, array) => {
                const wordsBeforeThis = array.slice(0, index).join(' ')
                const currentWordEnd = wordsBeforeThis ? wordsBeforeThis.length + 1 + word.length : word.length
                if (loginTitle.length >= currentWordEnd) {
                  return (
                    <span key={index}>
                      <span className="inline-block">{word}</span>
                      {index < array.length - 1 && ' '}
                    </span>
                  )
                }
                return null
              })}
              {loginTitle && loginTitle.length < loginTitleText.length && <span className="animate-pulse">|</span>}
            </h2>
            {/* デスクトップ版ログインタイトル */}
            <h2 className="hidden md:block text-3xl lg:text-4xl font-bold mb-2 min-h-[48px]" style={{ color: '#22211A' }}>
              {loginTitle}
              {loginTitle && loginTitle.length < loginTitleText.length && <span className="animate-pulse">|</span>}
            </h2>

            <p className="text-xs md:text-sm mb-2 md:mb-4 min-h-[16px] md:min-h-[24px]" style={{ color: '#22211A', opacity: 0.6 }}>
              {loginSubtitle}
              {loginSubtitle && loginSubtitle.length < loginSubtitleText.length && <span className="animate-pulse">|</span>}
            </p>
          </div>

        <div className="space-y-2">
          {/* ユーザーログイン */}
          <button
            onClick={() => handleLogin('user')}
            className="w-full py-3 md:py-4 px-4 md:px-6 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-3 md:gap-4"
            style={{
              backgroundColor: '#22211A',
              color: '#DCEDC8',
              opacity: 0.85
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.85'
            }}
          >
            <User className="w-6 md:w-8 h-6 md:h-8 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-lg md:text-xl font-bold">ユーザー</div>
              <div className="text-xs md:text-sm opacity-80 whitespace-nowrap">一般ユーザーとしてログイン</div>
            </div>
          </button>

          {/* 管理者ログイン */}
          <button
            onClick={() => handleLogin('admin')}
            className="w-full py-3 md:py-4 px-4 md:px-6 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-3 md:gap-4"
            style={{
              backgroundColor: '#22211A',
              color: '#DCEDC8',
              opacity: 0.85
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.85'
            }}
          >
            <Shield className="w-6 md:w-8 h-6 md:h-8 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-lg md:text-xl font-bold">管理者</div>
              <div className="text-xs md:text-sm opacity-80 whitespace-nowrap">管理者としてログイン</div>
            </div>
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}