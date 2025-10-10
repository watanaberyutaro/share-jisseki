import { createClient } from './client'

export interface News {
  id: string
  title: string
  content: string
  display_until: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 有効なニュース一覧を取得（表示期限内のもの）
 */
export async function getActiveNews(): Promise<News[]> {
  const supabase = createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .gte('display_until', now)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getActiveNews] エラー:', error)
    return []
  }

  console.log('[getActiveNews] 取得したニュース:', data)
  return data || []
}

/**
 * 全ニュース一覧を取得（管理者用）
 */
export async function getAllNews(): Promise<News[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllNews] エラー:', error)
    return []
  }

  return data || []
}

/**
 * ニュースを作成
 */
export async function createNews(title: string, content: string, displayUntil: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // 日付文字列をタイムスタンプに変換（時刻を23:59:59に設定）
  const displayUntilDate = new Date(displayUntil)
  displayUntilDate.setHours(23, 59, 59, 999)

  const { error } = await supabase
    .from('news')
    .insert({
      title,
      content,
      display_until: displayUntilDate.toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('[createNews] エラー:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * ニュースを更新
 */
export async function updateNews(id: string, title: string, content: string, displayUntil: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // 日付文字列をタイムスタンプに変換（時刻を23:59:59に設定）
  const displayUntilDate = new Date(displayUntil)
  displayUntilDate.setHours(23, 59, 59, 999)

  const { error } = await supabase
    .from('news')
    .update({
      title,
      content,
      display_until: displayUntilDate.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('[updateNews] エラー:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * ニュースの表示/非表示を切り替え
 */
export async function toggleNewsActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('news')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('[toggleNewsActive] エラー:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * ニュースを削除
 */
export async function deleteNews(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('news')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteNews] エラー:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
