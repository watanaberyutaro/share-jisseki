'use client'

import { useState, useEffect } from 'react'
import { getAllNews, createNews, updateNews, deleteNews, type News } from '@/lib/supabase/news'
import { Bell, Plus, Edit2, Trash2, Save, X } from 'lucide-react'

export function NewsManager() {
  const [newsList, setNewsList] = useState<News[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    display_until: ''
  })

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    const news = await getAllNews()
    setNewsList(news)
  }

  const handleCreate = async () => {
    if (!formData.content || !formData.display_until) {
      alert('内容と表示期限を入力してください')
      return
    }

    const result = await createNews(formData.title, formData.content, formData.display_until)
    if (result.success) {
      setFormData({ title: '', content: '', display_until: '' })
      setIsAdding(false)
      loadNews()
    } else {
      alert('ニュースの作成に失敗しました: ' + result.error)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!formData.content || !formData.display_until) {
      alert('内容と表示期限を入力してください')
      return
    }

    const result = await updateNews(id, formData.title, formData.content, formData.display_until)
    if (result.success) {
      setFormData({ title: '', content: '', display_until: '' })
      setEditingId(null)
      loadNews()
    } else {
      alert('ニュースの更新に失敗しました: ' + result.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このニュースを削除しますか？')) return

    const result = await deleteNews(id)
    if (result.success) {
      loadNews()
    } else {
      alert('ニュースの削除に失敗しました: ' + result.error)
    }
  }

  const startEdit = (news: News) => {
    setEditingId(news.id)
    setFormData({
      title: news.title,
      content: news.content,
      display_until: news.display_until.split('T')[0]
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ title: '', content: '', display_until: '' })
  }

  return (
    <div className="glass rounded-lg border p-6" style={{ borderColor: '#22211A', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6" style={{ color: '#22211A' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#22211A' }}>ニュース管理</h2>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold hover:opacity-90"
            style={{ backgroundColor: '#4abf79', color: '#FFFFFF' }}
          >
            <Plus className="w-5 h-5" />
            新規作成
          </button>
        )}
      </div>

      {/* 新規作成フォーム */}
      {isAdding && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
          <h3 className="font-bold mb-4" style={{ color: '#22211A' }}>新しいニュースを作成</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                タイトル（省略可）
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: '#22211A' }}
                placeholder="タイトル"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                内容 *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: '#22211A' }}
                rows={3}
                placeholder="ニュースの内容を入力..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                表示期限 *
              </label>
              <input
                type="date"
                value={formData.display_until}
                onChange={(e) => setFormData({ ...formData, display_until: e.target.value })}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: '#22211A' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold hover:opacity-90"
                style={{ backgroundColor: '#4abf79', color: '#FFFFFF' }}
              >
                <Save className="w-4 h-4" />
                作成
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold hover:opacity-90"
                style={{ backgroundColor: '#9E9E9E', color: '#FFFFFF' }}
              >
                <X className="w-4 h-4" />
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ニュース一覧 */}
      <div className="space-y-3">
        {newsList.map((news) => (
          <div
            key={news.id}
            className="p-4 rounded-lg border"
            style={{ borderColor: '#22211A', backgroundColor: editingId === news.id ? '#f5f5f5' : 'white' }}
          >
            {editingId === news.id ? (
              // 編集モード
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                    タイトル（省略可）
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={{ borderColor: '#22211A' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                    内容 *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={{ borderColor: '#22211A' }}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#22211A' }}>
                    表示期限 *
                  </label>
                  <input
                    type="date"
                    value={formData.display_until}
                    onChange={(e) => setFormData({ ...formData, display_until: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={{ borderColor: '#22211A' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(news.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold hover:opacity-90"
                    style={{ backgroundColor: '#FFB300', color: '#FFFFFF' }}
                  >
                    <Save className="w-4 h-4" />
                    更新
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold hover:opacity-90"
                    style={{ backgroundColor: '#9E9E9E', color: '#FFFFFF' }}
                  >
                    <X className="w-4 h-4" />
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              // 表示モード
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {news.title && (
                    <h4 className="font-bold mb-1" style={{ color: '#22211A' }}>{news.title}</h4>
                  )}
                  <p className="mb-2" style={{ color: '#22211A' }}>{news.content}</p>
                  <div className="flex items-center gap-4 text-sm" style={{ color: '#22211A', opacity: 0.7 }}>
                    <span>表示期限: {new Date(news.display_until).toLocaleDateString('ja-JP')}</span>
                    <span>作成日: {new Date(news.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(news)}
                    className="p-2 rounded-lg hover:opacity-80"
                    style={{ backgroundColor: '#FFB300', color: '#FFFFFF' }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(news.id)}
                    className="p-2 rounded-lg hover:opacity-80"
                    style={{ backgroundColor: '#ff4444', color: '#FFFFFF' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {newsList.length === 0 && !isAdding && (
          <div className="text-center py-8" style={{ color: '#22211A', opacity: 0.6 }}>
            ニュースはまだありません
          </div>
        )}
      </div>
    </div>
  )
}
