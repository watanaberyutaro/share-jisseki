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

  // キャッシュを回避するため、タイムスタンプをクエリに追加
  const timestamp = Date.now()
  console.log('[getDraft] キャッシュバスター:', timestamp)

  const { data, error } = await supabase
    .from('performance_drafts')
    .select('*')
    .eq('user_name', userName)
    .maybeSingle() // singleの代わりにmaybeSingleを使用（0件でもエラーにならない）

  if (error) {
    console.error('[getDraft] エラー:', error)
    return null
  }

  if (!data) {
    console.log('[getDraft] Draftが存在しません')
    return null
  }

  console.log('[getDraft] 取得成功:', data.updated_at)
  console.log('[getDraft] データキー数:', Object.keys(data.draft_data || {}).length)
  return data?.draft_data || null
}

/**
 * Draftを保存（新規作成 or 更新）
 */
export async function saveDraft(userName: string, draftData: any): Promise<boolean> {
  const supabase = createClient()

  console.log('[saveDraft] 保存開始:', userName)
  console.log('[saveDraft] データキー数:', Object.keys(draftData).length)

  const dataToSave = {
    user_name: userName,
    draft_data: draftData,
    updated_at: new Date().toISOString()
  }

  // UPSERT（存在すれば更新、なければ挿入）
  const { data, error } = await supabase
    .from('performance_drafts')
    .upsert(dataToSave, {
      onConflict: 'user_name'
    })
    .select()

  if (error) {
    console.error('[saveDraft] エラー:', error)
    console.error('[saveDraft] エラー詳細:', JSON.stringify(error, null, 2))
    return false
  }

  console.log('[saveDraft] 保存成功')
  console.log('[saveDraft] 保存確認データ:', data)

  // 保存後、すぐに読み取って確認
  const { data: verifyData, error: verifyError } = await supabase
    .from('performance_drafts')
    .select('*')
    .eq('user_name', userName)
    .maybeSingle()

  if (verifyError) {
    console.error('[saveDraft] 検証エラー:', verifyError)
  } else if (verifyData) {
    console.log('[saveDraft] 検証成功 - Supabaseに正しく保存されています')
    console.log('[saveDraft] 検証データ更新日時:', verifyData.updated_at)
  } else {
    console.warn('[saveDraft] 検証失敗 - データが見つかりません')
  }

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
export async function migrateDraftToSupabase(userName: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const draftKey = `draft_performance_form_${userName}`
  const localDraft = localStorage.getItem(draftKey)

  if (!localDraft) {
    console.log('[migrateDraftToSupabase] localStorageにDraftが存在しません')
    return false
  }

  try {
    const draftData = JSON.parse(localDraft)
    console.log('[migrateDraftToSupabase] localStorageのDraftを移行します:', draftKey)
    console.log('[migrateDraftToSupabase] データサイズ:', localDraft.length, '文字')

    const success = await saveDraft(userName, draftData)

    if (success) {
      console.log('[migrateDraftToSupabase] Supabase保存成功 - 検証のため100ms待機')

      // 確実に保存されるまで少し待機
      await new Promise(resolve => setTimeout(resolve, 100))

      // もう一度確認
      const supabase = createClient()
      const { data: verifyData } = await supabase
        .from('performance_drafts')
        .select('user_name')
        .eq('user_name', userName)
        .maybeSingle()

      if (verifyData) {
        console.log('[migrateDraftToSupabase] 検証OK - localStorageから削除します')
        localStorage.removeItem(draftKey)
        console.log('[migrateDraftToSupabase] 移行完了')
        return true
      } else {
        console.warn('[migrateDraftToSupabase] 検証NG - localStorageを保持します')
        return false
      }
    } else {
      console.error('[migrateDraftToSupabase] Supabase保存失敗')
      return false
    }
  } catch (error) {
    console.error('[migrateDraftToSupabase] エラー:', error)
    return false
  }
}
