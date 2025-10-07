import { createClient } from './client'

export interface PerformanceDraft {
  id: string
  user_name: string
  draft_data: any
  created_at: string
  updated_at: string
}

/**
 * ユーザーのDraftを取得
 */
export async function getDraft(userName: string): Promise<any | null> {
  const supabase = createClient()

  console.log('[getDraft] 取得開始:', userName)

  const { data, error } = await supabase
    .from('performance_drafts')
    .select('*')
    .eq('user_name', userName)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // データが存在しない場合
      console.log('[getDraft] Draftが存在しません')
      return null
    }
    console.error('[getDraft] エラー:', error)
    return null
  }

  console.log('[getDraft] 取得成功:', data?.updated_at)
  return data?.draft_data || null
}

/**
 * Draftを保存（新規作成 or 更新）
 */
export async function saveDraft(userName: string, draftData: any): Promise<boolean> {
  const supabase = createClient()

  console.log('[saveDraft] 保存開始:', userName)

  // UPSERT（存在すれば更新、なければ挿入）
  const { error } = await supabase
    .from('performance_drafts')
    .upsert({
      user_name: userName,
      draft_data: draftData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_name'
    })

  if (error) {
    console.error('[saveDraft] エラー:', error)
    return false
  }

  console.log('[saveDraft] 保存成功')
  return true
}

/**
 * Draftを削除
 */
export async function deleteDraft(userName: string): Promise<boolean> {
  const supabase = createClient()

  console.log('[deleteDraft] 削除開始:', userName)

  const { error } = await supabase
    .from('performance_drafts')
    .delete()
    .eq('user_name', userName)

  if (error) {
    console.error('[deleteDraft] エラー:', error)
    return false
  }

  console.log('[deleteDraft] 削除成功')
  return true
}

/**
 * localStorageからSupabaseへDraftを移行
 */
export async function migrateDraftToSupabase(userName: string): Promise<void> {
  if (typeof window === 'undefined') return

  const draftKey = `draft_performance_form_${userName}`
  const localDraft = localStorage.getItem(draftKey)

  if (!localDraft) {
    console.log('[migrateDraftToSupabase] localStorageにDraftが存在しません')
    return
  }

  try {
    const draftData = JSON.parse(localDraft)
    console.log('[migrateDraftToSupabase] localStorageのDraftを移行します')

    const success = await saveDraft(userName, draftData)

    if (success) {
      // 移行成功後、localStorageから削除
      localStorage.removeItem(draftKey)
      console.log('[migrateDraftToSupabase] 移行成功。localStorageから削除しました')
    }
  } catch (error) {
    console.error('[migrateDraftToSupabase] エラー:', error)
  }
}
