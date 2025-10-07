'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'

export default function SimpleLoginPage() {
  const [email, setEmail] = useState('harukadmla@gmail.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`エラー: ${error.message}`)
        setLoading(false)
        return
      }

      if (data.user) {
        setMessage('ログイン成功！ページをリダイレクトします...')
        
        // 3秒後にリダイレクト
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      }
    } catch (err) {
      setMessage(`予期しないエラー: ${err}`)
      setLoading(false)
    }
  }

  const createTestAccount = async () => {
    setLoading(true)
    setMessage('テストアカウント作成中...')

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.signUp({
        email: 'harukadmla@gmail.com',
        password: 'test123456',
      })

      if (error) {
        setMessage(`アカウント作成エラー: ${error.message}`)
      } else {
        setMessage('アカウント作成成功！上記の情報でログインしてください。')
        setPassword('test123456')
      }
    } catch (err) {
      setMessage(`エラー: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <MagneticDots />
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <LogIn className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">シンプルログイン</h1>
          <p className="text-gray-600 mt-2">緊急用ログイン画面</p>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="test123456"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={createTestAccount}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
          >
            テストアカウントを作成
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>デフォルトパスワード: test123456</p>
          <p>このページは問題解決用です</p>
        </div>
      </div>
    </div>
  )
}