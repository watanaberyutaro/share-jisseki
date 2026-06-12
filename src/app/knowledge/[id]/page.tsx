'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ThumbsUp, Star, Edit, CheckCircle, MessageSquare,
  User, Calendar, Tag, Paperclip, Shield, Eye, Loader2, Send, X,
} from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'
import { LoadingAnimation } from '@/components/loading-animation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TYPE_COLORS,
} from '@/types/knowledge'
import type { KnowledgePost, KnowledgeStatus } from '@/types/knowledge'

const STATUS_LIST = [
  { key: 'unverified',   label: '未確認',  icon: '⚠️' },
  { key: 'under_review', label: '確認中',  icon: '🔍' },
  { key: 'verified',     label: '認証済み', icon: '✅' },
  { key: 'returned',     label: '差戻し',  icon: '↩️' },
  { key: 'expired',      label: '失効',   icon: '❌' },
] as const

export default function KnowledgeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [post, setPost] = useState<KnowledgePost | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [isHelpful, setIsHelpful] = useState(false)
  const [helpfulCount, setHelpfulCount] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)

  const [commentBody, setCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  const [showVerifyPanel, setShowVerifyPanel] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<KnowledgeStatus>('unverified')
  const [verifyMethod, setVerifyMethod] = useState('')
  const [verifyComment, setVerifyComment] = useState('')
  const [verifySubmitting, setVerifySubmitting] = useState(false)

  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    const userName = localStorage.getItem('userName') || localStorage.getItem('userRole') || ''
    const role     = localStorage.getItem('userRole') || ''
    setCurrentUserId(userName)
    setCurrentUserRole(role)
  }, [])

  const fetchPost = useCallback(async () => {
    setLoading(true)
    try {
      const userName = localStorage.getItem('userName') || localStorage.getItem('userRole') || ''
      const res = await fetch(`/api/knowledge/${id}?user_name=${encodeURIComponent(userName)}`)
      if (!res.ok) { router.push('/knowledge'); return }
      const data = await res.json()
      setPost(data.post)
      setIsHelpful(data.post.is_helpful || false)
      setHelpfulCount(data.post.helpful_count || 0)
      setIsFavorite(data.post.is_favorite || false)
      setFavoriteCount(data.post.favorite_count || 0)
      setVerifyStatus(data.post.status || 'unverified')
      setVerifyMethod(data.post.verification_method || '')
      setVerifyComment(data.post.verification_comment || '')
    } catch {
      router.push('/knowledge')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { fetchPost() }, [fetchPost])

  async function toggleHelpful() {
    const userName = localStorage.getItem('userName') || localStorage.getItem('userRole') || ''
    const res = await fetch(`/api/knowledge/${id}/helpful`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName }),
    })
    if (res.ok) {
      const data = await res.json()
      setIsHelpful(data.is_helpful)
      setHelpfulCount(data.helpful_count)
    }
  }

  async function toggleFavorite() {
    const userName = localStorage.getItem('userName') || localStorage.getItem('userRole') || ''
    const res = await fetch(`/api/knowledge/${id}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName }),
    })
    if (res.ok) {
      const data = await res.json()
      setIsFavorite(data.is_favorite)
      setFavoriteCount(data.favorite_count)
    }
  }

  async function submitComment() {
    if (!commentBody.trim()) return
    const userName = localStorage.getItem('userName') || localStorage.getItem('userRole') || 'unknown'
    setCommentSubmitting(true)
    try {
      const res = await fetch(`/api/knowledge/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody, user_name: userName }),
      })
      if (res.ok) {
        const data = await res.json()
        setPost(prev => prev ? {
          ...prev,
          comments: [...(prev.comments || []), data.comment],
        } : prev)
        setCommentBody('')
      }
    } finally {
      setCommentSubmitting(false)
    }
  }

  async function submitVerify() {
    setVerifySubmitting(true)
    try {
      const res = await fetch(`/api/knowledge/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: verifyStatus,
          verification_method: verifyMethod,
          verification_comment: verifyComment,
          user_name: localStorage.getItem('userName') || localStorage.getItem('userRole') || 'unknown',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPost(prev => prev ? { ...prev, ...data.post } : prev)
        setShowVerifyPanel(false)
        setActionMsg('認証情報を更新しました')
        setTimeout(() => setActionMsg(''), 3000)
      }
    } finally {
      setVerifySubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4" style={{ paddingTop: '5rem' }}>
        <MagneticDots />
        <LoadingAnimation />
      </div>
    )
  }

  if (!post) return null

  const statusInfo = KNOWLEDGE_STATUSES[post.status as keyof typeof KNOWLEDGE_STATUSES]
  const typeColor = KNOWLEDGE_TYPE_COLORS[post.knowledge_type] || '#6B7280'
  const isAuthor = currentUserId === post.author_name
  const isAdmin = currentUserRole === 'admin'

  return (
    <div
      className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6 pb-32 md:pb-6"
      style={{ paddingTop: '5rem' }}
    >
      <MagneticDots />
      <div className="fade-in space-y-4">

        {/* アクションメッセージ */}
        {actionMsg && (
          <div className="p-3 rounded-lg text-sm font-bold text-center" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            {actionMsg}
          </div>
        )}

        {/* 戻るボタン */}
        <div className="flex items-center justify-between">
          <Link href="/knowledge" className="flex items-center gap-2 text-sm font-bold" style={{ color: '#22211A' }}>
            <ArrowLeft className="w-4 h-4" />
            一覧に戻る
          </Link>
          {(isAuthor || isAdmin) && (
            <Link
              href={`/knowledge/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold"
              style={{ borderColor: '#22211A', color: '#22211A' }}
            >
              <Edit className="w-4 h-4" />
              編集
            </Link>
          )}
        </div>

        {/* メインコンテンツ */}
        <div
          className="glass rounded-lg border p-6"
          style={{
            borderColor: '#22211A',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)',
          }}
        >
          {/* バッジ */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold"
              style={{ backgroundColor: statusInfo?.bg, color: statusInfo?.color }}
            >
              {statusInfo?.icon} {statusInfo?.label}
            </span>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold"
              style={{ backgroundColor: typeColor + '20', color: typeColor }}
            >
              {post.knowledge_type}
            </span>
            {post.genre && (
              <span
                className="px-2.5 py-1 rounded-full text-sm"
                style={{ backgroundColor: 'rgba(34,33,26,0.07)', color: '#22211A' }}
              >
                {post.genre.name}
              </span>
            )}
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#22211A' }}>
            {post.title}
          </h1>

          {/* メタ情報 */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm" style={{ color: '#22211A', opacity: 0.6 }}>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.author_name || '不明'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(post.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
            </span>
            {post.updated_at !== post.created_at && (
              <span className="flex items-center gap-1 text-xs">
                更新: {format(new Date(post.updated_at), 'yyyy/MM/dd', { locale: ja })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.view_count}
            </span>
          </div>

          {/* タグ */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'rgba(34,33,26,0.07)', color: '#22211A' }}
                >
                  <Tag className="w-3 h-3" />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* 関連情報 */}
          {(post.related_carrier?.length > 0 || post.related_plan || post.related_venue) && (
            <div className="flex flex-wrap gap-3 mb-4 text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
              {post.related_carrier?.length > 0 && (
                <span>📡 {post.related_carrier.join(' / ')}</span>
              )}
              {post.related_plan && <span>📋 {post.related_plan}</span>}
              {post.related_venue && <span>📍 {post.related_venue}</span>}
            </div>
          )}

          {/* 本文 */}
          <div
            className="py-4 border-t border-b whitespace-pre-wrap text-sm leading-relaxed"
            style={{ borderColor: '#22211A22', color: '#22211A' }}
          >
            {post.body || <span style={{ opacity: 0.4 }}>（本文なし）</span>}
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={toggleHelpful}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold"
              style={{
                borderColor: isHelpful ? '#4abf79' : '#22211A44',
                backgroundColor: isHelpful ? '#DCFCE7' : 'transparent',
                color: isHelpful ? '#15803D' : '#22211A',
              }}
            >
              <ThumbsUp className="w-4 h-4" />
              参考になった {helpfulCount > 0 && <span>({helpfulCount})</span>}
            </button>
            <button
              onClick={toggleFavorite}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold"
              style={{
                borderColor: isFavorite ? '#FFB300' : '#22211A44',
                backgroundColor: isFavorite ? '#FEF3C7' : 'transparent',
                color: isFavorite ? '#B45309' : '#22211A',
              }}
            >
              <Star className="w-4 h-4" />
              お気に入り {favoriteCount > 0 && <span>({favoriteCount})</span>}
            </button>
            <button
              onClick={() => setShowVerifyPanel(!showVerifyPanel)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold ml-auto"
              style={{ borderColor: '#22211A44', color: '#22211A' }}
            >
              <Shield className="w-4 h-4" />
              認証操作
            </button>
          </div>
        </div>

        {/* 認証情報 */}
        <div
          className="glass rounded-lg border p-5"
          style={{
            borderColor: '#22211A',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}
        >
          <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#22211A' }}>
            <Shield className="w-4 h-4" />
            認証情報
          </h2>
          <div className="space-y-2 text-sm" style={{ color: '#22211A' }}>
            <div className="flex gap-3">
              <span style={{ opacity: 0.55, minWidth: 80 }}>ステータス</span>
              <span className="font-bold">
                {statusInfo?.icon} {statusInfo?.label}
              </span>
            </div>
            {post.verified_by && (
              <>
                <div className="flex gap-3">
                  <span style={{ opacity: 0.55, minWidth: 80 }}>認証者</span>
                  <span>{post.verified_by_name || post.verified_by || '-'}</span>
                </div>
                <div className="flex gap-3">
                  <span style={{ opacity: 0.55, minWidth: 80 }}>認証日</span>
                  <span>{post.verified_at ? format(new Date(post.verified_at), 'yyyy/MM/dd', { locale: ja }) : '-'}</span>
                </div>
              </>
            )}
            {post.verification_method && (
              <div className="flex gap-3">
                <span style={{ opacity: 0.55, minWidth: 80 }}>確認方法</span>
                <span>{post.verification_method}</span>
              </div>
            )}
            {post.verification_comment && (
              <div className="flex gap-3">
                <span style={{ opacity: 0.55, minWidth: 80 }}>コメント</span>
                <span className="whitespace-pre-wrap">{post.verification_comment}</span>
              </div>
            )}
          </div>
        </div>

        {/* 認証操作パネル */}
        {showVerifyPanel && (
          <div
            className="glass rounded-lg border p-5 space-y-4"
            style={{
              borderColor: '#22211A',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: '#22211A' }}>認証操作</h2>
              <button onClick={() => setShowVerifyPanel(false)}>
                <X className="w-4 h-4" style={{ color: '#22211A' }} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>ステータス変更</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_LIST.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setVerifyStatus(s.key as KnowledgeStatus)}
                    className="px-3 py-1.5 rounded-lg border text-sm font-bold"
                    style={{
                      borderColor: verifyStatus === s.key ? '#22211A' : '#22211A44',
                      backgroundColor: verifyStatus === s.key ? '#22211A' : 'transparent',
                      color: verifyStatus === s.key ? '#DCEDC8' : '#22211A',
                    }}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>確認方法</label>
              <input
                type="text"
                value={verifyMethod}
                onChange={e => setVerifyMethod(e.target.value)}
                placeholder="例：サポートセンター問い合わせ、実機確認"
                className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>認証コメント</label>
              <textarea
                value={verifyComment}
                onChange={e => setVerifyComment(e.target.value)}
                placeholder="認証に関するコメントや補足を記入..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent resize-none"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={submitVerify}
                disabled={verifySubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}
              >
                {verifySubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle className="w-4 h-4" />
                更新する
              </button>
            </div>
          </div>
        )}

        {/* 添付ファイル */}
        {post.files && post.files.length > 0 && (
          <div
            className="glass rounded-lg border p-5"
            style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
          >
            <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#22211A' }}>
              <Paperclip className="w-4 h-4" />
              添付ファイル
            </h2>
            <div className="space-y-2">
              {post.files.map(file => (
                <a
                  key={file.id}
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(34,33,26,0.05)', color: '#22211A' }}
                >
                  <Paperclip className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{file.file_name}</span>
                  {file.purpose === 'evidence' && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                      エビデンス
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* コメント */}
        <div
          className="glass rounded-lg border p-5"
          style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
        >
          <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#22211A' }}>
            <MessageSquare className="w-4 h-4" />
            コメント
            {post.comments && post.comments.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: 'rgba(34,33,26,0.1)', color: '#22211A' }}
              >
                {post.comments.length}
              </span>
            )}
          </h2>

          {/* コメント一覧 */}
          <div className="space-y-3 mb-4">
            {(!post.comments || post.comments.length === 0) && (
              <p className="text-sm text-center py-4" style={{ color: '#22211A', opacity: 0.4 }}>
                コメントはまだありません
              </p>
            )}
            {(post.comments || []).map(comment => (
              <div
                key={comment.id}
                className="p-3 rounded-lg text-sm"
                style={{ backgroundColor: 'rgba(34,33,26,0.04)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs" style={{ color: '#22211A' }}>
                    {comment.user_name || '不明'}
                  </span>
                  <span className="text-xs" style={{ color: '#22211A', opacity: 0.5 }}>
                    {format(new Date(comment.created_at), 'MM/dd HH:mm', { locale: ja })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap" style={{ color: '#22211A' }}>
                  {comment.body}
                </p>
              </div>
            ))}
          </div>

          {/* コメント投稿フォーム */}
          <div className="flex gap-2">
            <textarea
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              placeholder="コメントを入力... (質問・補足・修正依頼など)"
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg border text-sm bg-transparent resize-none"
              style={{ borderColor: '#22211A44', color: '#22211A' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  submitComment()
                }
              }}
            />
            <button
              onClick={submitComment}
              disabled={commentSubmitting || !commentBody.trim()}
              className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1"
              style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}
            >
              {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: '#22211A', opacity: 0.4 }}>
            Ctrl+Enter で送信
          </p>
        </div>

      </div>
    </div>
  )
}
