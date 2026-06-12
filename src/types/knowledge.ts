export const KNOWLEDGE_TYPES = [
  '現場ノウハウ',
  'キャリアルール',
  'サポートセンター確認',
  '会場情報',
  '成功事例',
  '失敗事例',
  'トーク集',
] as const

export type KnowledgeType = typeof KNOWLEDGE_TYPES[number]

export const KNOWLEDGE_STATUSES = {
  unverified:   { label: '未確認',  icon: '⚠️', color: '#B45309', bg: '#FEF3C7' },
  under_review: { label: '確認中',  icon: '🔍', color: '#1D4ED8', bg: '#DBEAFE' },
  verified:     { label: '認証済み', icon: '✅', color: '#15803D', bg: '#DCFCE7' },
  returned:     { label: '差戻し',  icon: '↩️', color: '#C2410C', bg: '#FEE2E2' },
  expired:      { label: '失効',   icon: '❌', color: '#6B7280', bg: '#F3F4F6' },
} as const

export type KnowledgeStatus = keyof typeof KNOWLEDGE_STATUSES

export const CARRIERS = [
  'au', 'UQモバイル', 'povo', 'Y!mobile', 'SoftBank', 'docomo', 'ahamo', 'その他',
] as const

export const KNOWLEDGE_TYPE_COLORS: Record<string, string> = {
  '現場ノウハウ':        '#4abf79',
  'キャリアルール':      '#3b82f6',
  'サポートセンター確認': '#8b5cf6',
  '会場情報':           '#f59e0b',
  '成功事例':           '#10b981',
  '失敗事例':           '#ef4444',
  'トーク集':           '#ec4899',
}

export interface KnowledgeGenre {
  id: string
  name: string
  created_at: string
}

export interface KnowledgeTag {
  id: string
  name: string
}

export interface KnowledgeAuthor {
  id: string
  display_name: string
  email: string
}

export interface KnowledgeFile {
  id: string
  post_id: string
  file_url: string
  file_name: string
  file_type: string
  file_size: number
  purpose: 'post_attachment' | 'evidence'
  uploaded_by: string
  created_at: string
}

export interface KnowledgeComment {
  id: string
  post_id: string
  user_id: string
  body: string
  user_name?: string
  created_at: string
  updated_at: string
  author?: KnowledgeAuthor
}

export interface KnowledgePost {
  id: string
  title: string
  body: string
  knowledge_type: string
  genre_id: string | null
  genre?: KnowledgeGenre | null
  status: KnowledgeStatus
  author_id?: string | null
  author_name?: string
  author?: KnowledgeAuthor | null
  related_carrier: string[]
  related_plan: string
  related_venue: string
  tags: KnowledgeTag[]
  view_count: number
  helpful_count: number
  favorite_count: number
  verified_by?: string | null
  verified_by_name?: string
  verified_at: string | null
  verifier?: KnowledgeAuthor | null
  verification_method: string
  verification_comment: string
  files?: KnowledgeFile[]
  comments?: KnowledgeComment[]
  is_helpful?: boolean
  is_favorite?: boolean
  created_at: string
  updated_at: string
}
