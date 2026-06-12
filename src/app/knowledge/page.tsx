'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, Eye, ThumbsUp, Calendar, User, Tag, BookOpen, Star } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'
import { LoadingAnimation } from '@/components/loading-animation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TYPES,
  KNOWLEDGE_TYPE_COLORS,
} from '@/types/knowledge'
import type { KnowledgePost, KnowledgeGenre } from '@/types/knowledge'

export default function KnowledgePage() {
  const [posts, setPosts] = useState<KnowledgePost[]>([])
  const [total, setTotal] = useState(0)
  const [genres, setGenres] = useState<KnowledgeGenre[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [sort, setSort] = useState('created_at_desc')
  const [page, setPage] = useState(1)
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [displayedDescription, setDisplayedDescription] = useState('')

  const fullTitle = 'ナレッジ一覧'
  const fullDescription = '現場ノウハウ・キャリアルールを蓄積・共有'

  useEffect(() => {
    let titleIndex = 0
    let descIndex = 0
    let titleComplete = false

    const interval = setInterval(() => {
      if (!titleComplete) {
        if (titleIndex <= fullTitle.length) {
          setDisplayedTitle(fullTitle.slice(0, titleIndex))
          titleIndex++
        } else {
          titleComplete = true
        }
      } else {
        if (descIndex <= fullDescription.length) {
          setDisplayedDescription(fullDescription.slice(0, descIndex))
          descIndex++
        } else {
          clearInterval(interval)
        }
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  const fetchGenres = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge/genres')
      if (res.ok) {
        const data = await res.json()
        setGenres(data.genres || [])
      }
    } catch {}
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('knowledge_type', filterType)
      if (filterGenre) params.set('genre_id', filterGenre)
      params.set('sort', sort)
      params.set('page', String(page))

      const res = await fetch(`/api/knowledge?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        setTotal(data.total || 0)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus, filterType, filterGenre, sort, page])

  useEffect(() => { fetchGenres() }, [fetchGenres])

  useEffect(() => {
    const timer = setTimeout(fetchPosts, 300)
    return () => clearTimeout(timer)
  }, [fetchPosts])

  const totalPages = Math.ceil(total / 10)

  return (
    <div
      className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6 pb-32 md:pb-6"
      style={{ paddingTop: '5rem' }}
    >
      <MagneticDots />
      <div className="fade-in">
        {/* ヘッダー */}
        <div className="mb-4 md:mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2" style={{ color: '#22211A' }}>
              {displayedTitle}
            </h1>
            <p
              className="text-sm md:text-lg leading-relaxed min-h-[24px] md:min-h-[32px]"
              style={{ color: '#22211A' }}
            >
              {displayedDescription}
              {displayedDescription && <span className="animate-cursor-blink">|</span>}
            </p>
          </div>
          <Link
            href="/knowledge/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新規作成</span>
          </Link>
        </div>

        {/* フィルター */}
        <div
          className="glass rounded-lg border p-4 mb-4"
          style={{
            borderColor: '#22211A',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)',
          }}
        >
          <div className="flex flex-col gap-3">
            {/* 検索バー */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: '#22211A', opacity: 0.5 }}
              />
              <input
                type="text"
                placeholder="タイトル・本文で検索..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm bg-transparent"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              />
            </div>

            {/* フィルター行 */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="px-3 py-1.5 rounded-lg border text-sm bg-transparent flex-1 min-w-[120px]"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              >
                <option value="">全ステータス</option>
                {Object.entries(KNOWLEDGE_STATUSES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value); setPage(1) }}
                className="px-3 py-1.5 rounded-lg border text-sm bg-transparent flex-1 min-w-[120px]"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              >
                <option value="">全種別</option>
                {KNOWLEDGE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filterGenre}
                onChange={e => { setFilterGenre(e.target.value); setPage(1) }}
                className="px-3 py-1.5 rounded-lg border text-sm bg-transparent flex-1 min-w-[120px]"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              >
                <option value="">全ジャンル</option>
                {genres.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm bg-transparent flex-1 min-w-[120px]"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              >
                <option value="created_at_desc">新しい順</option>
                <option value="created_at_asc">古い順</option>
                <option value="helpful_count_desc">参考になった順</option>
                <option value="view_count_desc">閲覧数順</option>
              </select>
            </div>
          </div>
        </div>

        {/* 件数 */}
        <div className="mb-3 text-sm" style={{ color: '#22211A', opacity: 0.6 }}>
          {total}件のナレッジ
        </div>

        {/* 一覧 */}
        {loading ? (
          <LoadingAnimation />
        ) : posts.length === 0 ? (
          <div
            className="glass rounded-lg border p-16 text-center"
            style={{
              borderColor: '#22211A',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: '#22211A', opacity: 0.3 }} />
            <p className="font-bold mb-1" style={{ color: '#22211A', opacity: 0.5 }}>
              ナレッジがまだありません
            </p>
            <p className="text-sm" style={{ color: '#22211A', opacity: 0.4 }}>
              最初のナレッジを作成してみましょう
            </p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: '0.8rem' }}>
            {posts.map(post => (
              <KnowledgeCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border text-sm font-bold disabled:opacity-30"
              style={{ borderColor: '#22211A', color: '#22211A' }}
            >
              前へ
            </button>
            <span className="px-4 py-2 text-sm" style={{ color: '#22211A' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg border text-sm font-bold disabled:opacity-30"
              style={{ borderColor: '#22211A', color: '#22211A' }}
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function KnowledgeCard({ post }: { post: KnowledgePost }) {
  const statusInfo = KNOWLEDGE_STATUSES[post.status as keyof typeof KNOWLEDGE_STATUSES]
  const typeColor = KNOWLEDGE_TYPE_COLORS[post.knowledge_type] || '#6B7280'

  return (
    <Link href={`/knowledge/${post.id}`}>
      <div
        className="glass rounded-lg border px-3 py-2 cursor-pointer"
        style={{
          borderColor: '#22211A',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          {/* 左側：メインコンテンツ */}
          <div className="flex-1 min-w-0">
            {/* バッジ行 */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: statusInfo?.bg || '#F3F4F6',
                  color: statusInfo?.color || '#6B7280',
                }}
              >
                {statusInfo?.icon} {statusInfo?.label}
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: typeColor + '20', color: typeColor }}
              >
                {post.knowledge_type}
              </span>
              {post.genre && (
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: '#22211A', opacity: 0.6, backgroundColor: 'rgba(34,33,26,0.06)' }}>
                  {post.genre.name}
                </span>
              )}
            </div>

            {/* タイトル */}
            <h3 className="font-bold text-sm mb-1 line-clamp-1" style={{ color: '#22211A' }}>
              {post.title}
            </h3>

            {/* タグ */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 4).map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: 'rgba(34,33,26,0.06)', color: '#22211A' }}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag.name}
                  </span>
                ))}
                {post.tags.length > 4 && (
                  <span className="text-xs" style={{ color: '#22211A', opacity: 0.4 }}>
                    +{post.tags.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 右側：メタ情報 */}
          <div
            className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 text-xs flex-shrink-0"
            style={{ color: '#22211A', opacity: 0.55 }}
          >
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{post.author_name || '不明'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {post.created_at
                  ? format(new Date(post.created_at), 'MM/dd', { locale: ja })
                  : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {post.view_count}
              </span>
              <span className="flex items-center gap-0.5">
                <ThumbsUp className="w-3 h-3" />
                {post.helpful_count}
              </span>
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3" />
                {post.favorite_count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
