'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { MagneticDots } from '@/components/MagneticDots'
import { LoadingAnimation } from '@/components/loading-animation'
import { KNOWLEDGE_TYPES, CARRIERS } from '@/types/knowledge'
import type { KnowledgePost, KnowledgeGenre } from '@/types/knowledge'

export default function KnowledgeEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [post, setPost] = useState<KnowledgePost | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [knowledgeType, setKnowledgeType] = useState('')
  const [genreId, setGenreId] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [relatedCarrier, setRelatedCarrier] = useState<string[]>([])
  const [relatedPlan, setRelatedPlan] = useState('')
  const [relatedVenue, setRelatedVenue] = useState('')
  const [genres, setGenres] = useState<KnowledgeGenre[]>([])
  const [newGenreName, setNewGenreName] = useState('')
  const [showNewGenre, setShowNewGenre] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [displayedTitle, setDisplayedTitle] = useState('')
  const fullTitle = 'ナレッジ編集'

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= fullTitle.length) {
        setDisplayedTitle(fullTitle.slice(0, i))
        i++
      } else {
        clearInterval(interval)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const userName = localStorage.getItem('userName') || localStorage.getItem('userRole') || ''
    const role     = localStorage.getItem('userRole') || ''

    const init = async () => {
      const [postRes, genresRes] = await Promise.all([
        fetch(`/api/knowledge/${id}`),
        fetch('/api/knowledge/genres'),
      ])

      if (!postRes.ok) { router.push('/knowledge'); return }
      const postData = await postRes.json()
      const genreData = genresRes.ok ? await genresRes.json() : { genres: [] }

      const fetchedPost: KnowledgePost = postData.post

      if (fetchedPost.author_name !== userName && role !== 'admin') {
        router.push(`/knowledge/${id}`)
        return
      }

      setCurrentUserId(userName)
      setPost(fetchedPost)
      setAuthorized(true)
      setTitle(fetchedPost.title || '')
      setBodyText(fetchedPost.body || '')
      setKnowledgeType(fetchedPost.knowledge_type || '')
      setGenreId(fetchedPost.genre_id || '')
      setTags((fetchedPost.tags || []).map(t => t.name))
      setRelatedCarrier(fetchedPost.related_carrier || [])
      setRelatedPlan(fetchedPost.related_plan || '')
      setRelatedVenue(fetchedPost.related_venue || '')
      setGenres(genreData.genres || [])
      setLoading(false)
    }

    init()
  }, [id, router])

  function addTag() {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function toggleCarrier(carrier: string) {
    setRelatedCarrier(prev =>
      prev.includes(carrier) ? prev.filter(c => c !== carrier) : [...prev, carrier]
    )
  }

  async function addNewGenre() {
    if (!newGenreName.trim()) return
    try {
      const res = await fetch('/api/knowledge/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGenreName.trim(), user_name: currentUserId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'ジャンルの作成に失敗しました'); return }
      setGenres(prev => [...prev, data.genre])
      setGenreId(data.genre.id)
      setNewGenreName('')
      setShowNewGenre(false)
    } catch {
      setError('ジャンルの作成に失敗しました')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !knowledgeType) { setError('タイトルと種別は必須です'); return }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          bodyText,
          knowledge_type: knowledgeType,
          genre_id: genreId || null,
          tag_names: tags,
          related_carrier: relatedCarrier,
          related_plan: relatedPlan,
          related_venue: relatedVenue,
          user_name: currentUserId,
          user_role: localStorage.getItem('userRole') || 'user',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '更新に失敗しました'); return }
      router.push(`/knowledge/${id}`)
    } catch {
      setError('更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4" style={{ paddingTop: '5rem' }}>
        <MagneticDots />
        <LoadingAnimation />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div
      className="max-w-3xl mx-auto px-2 sm:px-4 lg:px-8 py-2 md:py-6 pb-32 md:pb-6"
      style={{ paddingTop: '5rem' }}
    >
      <MagneticDots />
      <div className="fade-in">
        {/* ヘッダー */}
        <div className="mb-4 md:mb-6 flex items-center gap-3">
          <Link href={`/knowledge/${id}`} className="p-2 rounded-lg" style={{ color: '#22211A' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold" style={{ color: '#22211A' }}>
              {displayedTitle}
            </h1>
            {post && (
              <p className="text-sm mt-0.5" style={{ color: '#22211A', opacity: 0.5 }}>
                {post.title}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className="glass rounded-lg border p-6 space-y-5"
            style={{
              borderColor: '#22211A',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)',
            }}
          >
            {error && (
              <div className="p-3 rounded-lg text-sm font-bold" style={{ backgroundColor: '#FEE2E2', color: '#C2410C' }}>
                {error}
              </div>
            )}

            {/* タイトル */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>
                タイトル <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
                required
              />
            </div>

            {/* 種別・ジャンル */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>
                  ナレッジ種別 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={knowledgeType}
                  onChange={e => setKnowledgeType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent"
                  style={{ borderColor: '#22211A44', color: '#22211A' }}
                  required
                >
                  <option value="">選択してください</option>
                  {KNOWLEDGE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>
                  ジャンル
                </label>
                {showNewGenre ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGenreName}
                      onChange={e => setNewGenreName(e.target.value)}
                      placeholder="新しいジャンル名"
                      className="flex-1 px-3 py-2 rounded-lg border text-sm bg-transparent"
                      style={{ borderColor: '#22211A44', color: '#22211A' }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewGenre() } }}
                    />
                    <button type="button" onClick={addNewGenre} className="px-3 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}>追加</button>
                    <button type="button" onClick={() => setShowNewGenre(false)} className="px-3 py-2 rounded-lg text-sm" style={{ color: '#22211A' }}><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={genreId}
                      onChange={e => setGenreId(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border text-sm bg-transparent"
                      style={{ borderColor: '#22211A44', color: '#22211A' }}
                    >
                      <option value="">選択してください</option>
                      {genres.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowNewGenre(true)} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#22211A44', color: '#22211A' }}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 本文 */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>本文</label>
              <textarea
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent resize-y"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              />
            </div>

            {/* タグ */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>タグ</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="タグを入力してEnter"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm bg-transparent"
                  style={{ borderColor: '#22211A44', color: '#22211A' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                />
                <button type="button" onClick={addTag} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#22211A44', color: '#22211A' }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(34,33,26,0.08)', color: '#22211A' }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 関連キャリア */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>関連キャリア</label>
              <div className="flex flex-wrap gap-2">
                {CARRIERS.map(carrier => (
                  <button
                    key={carrier}
                    type="button"
                    onClick={() => toggleCarrier(carrier)}
                    className="px-3 py-1.5 rounded-lg border text-sm font-bold"
                    style={{
                      borderColor: relatedCarrier.includes(carrier) ? '#22211A' : '#22211A44',
                      backgroundColor: relatedCarrier.includes(carrier) ? '#22211A' : 'transparent',
                      color: relatedCarrier.includes(carrier) ? '#DCEDC8' : '#22211A',
                    }}
                  >
                    {carrier}
                  </button>
                ))}
              </div>
            </div>

            {/* 関連プラン・会場 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>関連プラン</label>
                <input
                  type="text"
                  value={relatedPlan}
                  onChange={e => setRelatedPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent"
                  style={{ borderColor: '#22211A44', color: '#22211A' }}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#22211A' }}>関連会場</label>
                <input
                  type="text"
                  value={relatedVenue}
                  onChange={e => setRelatedVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent"
                  style={{ borderColor: '#22211A44', color: '#22211A' }}
                />
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="flex justify-end gap-3 pt-2">
              <Link
                href={`/knowledge/${id}`}
                className="px-4 py-2 rounded-lg border text-sm font-bold"
                style={{ borderColor: '#22211A44', color: '#22211A' }}
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: '#22211A', color: '#DCEDC8' }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                更新する
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
