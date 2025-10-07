'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function ApprovePageContent() {
  const [processing, setProcessing] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const processApproval = async () => {
      const supabase = createClient()
      const token = searchParams.get('token')
      const action = searchParams.get('action')

      if (!token || !action) {
        setResult({
          success: false,
          message: '無効なリンクです'
        })
        setProcessing(false)
        return
      }

      try {
        // トークンを使って承認処理を実行
        const { data, error } = await supabase.rpc('process_approval_by_token', {
          token_param: token,
          action_param: action
        })

        if (error) throw error

        setResult(data)
      } catch (error) {
        console.error('Approval processing error:', error)
        setResult({
          success: false,
          message: 'エラーが発生しました'
        })
      } finally {
        setProcessing(false)
      }
    }

    processApproval()
  }, [searchParams])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-foreground">処理中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 border border-border/50 shadow-elegant">
          <div className="text-center">
            <div className={`w-16 h-16 ${
              result?.success ? 'bg-success/10' : 'bg-destructive/10'
            } rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              {result?.success ? (
                <CheckCircle className="w-8 h-8 text-success" />
              ) : (
                <XCircle className="w-8 h-8 text-destructive" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {result?.success ? '処理完了' : '処理失敗'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {result?.message}
            </p>
            
            {result?.success && (
              <div className="p-4 bg-muted/30 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchParams.get('action') === 'approve' 
                    ? 'ユーザーがログインできるようになりました'
                    : 'ユーザーの申請は拒否されました'}
                </p>
              </div>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              ホームへ戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-foreground">読み込み中...</p>
        </div>
      </div>
    }>
      <ApprovePageContent />
    </Suspense>
  )
}