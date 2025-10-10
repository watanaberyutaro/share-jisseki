import { createClient } from './client'

/**
 * デバイスIDを生成または取得
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'

  let deviceId = localStorage.getItem('deviceId')

  if (!deviceId) {
    // UUIDv4を生成
    deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    localStorage.setItem('deviceId', deviceId)
    console.log('[getDeviceId] 新しいデバイスIDを生成:', deviceId)
  }

  return deviceId
}

/**
 * ユーザーのアクティブセッション数を取得
 */
export async function getActiveSessionCount(userName: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('user_name', userName)

  if (error) {
    console.error('[getActiveSessionCount] エラー:', error)
    return 0
  }

  return data?.length || 0
}

/**
 * ユーザーのセッションを登録または更新
 */
export async function registerSession(userName: string): Promise<{ success: boolean; message?: string }> {
  const supabase = createClient()
  const deviceId = getDeviceId()

  console.log('[registerSession] セッション登録開始:', { userName, deviceId })

  // 既存のセッション数を確認
  const { data: existingSessions, error: fetchError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_name', userName)

  if (fetchError) {
    console.error('[registerSession] セッション取得エラー:', fetchError)
    return { success: false, message: 'セッション情報の取得に失敗しました' }
  }

  console.log('[registerSession] 既存セッション数:', existingSessions?.length || 0)

  // 現在のデバイスのセッションが既に存在するか確認
  const currentDeviceSession = existingSessions?.find(s => s.device_id === deviceId)

  if (currentDeviceSession) {
    // 既存セッションを更新（UPSERTを使用）
    console.log('[registerSession] 既存セッションを更新')
    const { error: updateError } = await supabase
      .from('user_sessions')
      .upsert({
        id: currentDeviceSession.id,
        user_name: userName,
        device_id: deviceId,
        last_active: new Date().toISOString()
      })

    if (updateError) {
      console.error('[registerSession] セッション更新エラー:', updateError)
      // 更新エラーでも継続（致命的ではない）
      console.warn('[registerSession] 更新失敗しましたが処理を継続します')
    } else {
      console.log('[registerSession] セッション更新成功')
    }

    return { success: true }
  }

  // 新規セッション
  const activeSessionCount = existingSessions?.length || 0

  if (activeSessionCount >= 3) {
    console.warn('[registerSession] デバイス数上限に達しています')

    return {
      success: false,
      message: 'このユーザー名は既に3台のデバイスで使用されています'
    }
  }

  // 新規セッションを登録
  const { error: insertError } = await supabase
    .from('user_sessions')
    .insert({
      user_name: userName,
      device_id: deviceId,
      last_active: new Date().toISOString()
    })

  if (insertError) {
    // UNIQUE制約エラーの場合は既に登録済み
    if (insertError.code === '23505') {
      console.log('[registerSession] 既に登録済み - 更新します')
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('user_name', userName)
        .eq('device_id', deviceId)

      if (updateError) {
        console.error('[registerSession] セッション更新エラー:', updateError)
        return { success: false, message: 'セッションの更新に失敗しました' }
      }

      return { success: true }
    }

    console.error('[registerSession] セッション登録エラー:', insertError)
    return { success: false, message: 'セッションの登録に失敗しました' }
  }

  console.log('[registerSession] セッション登録成功')
  return { success: true }
}

/**
 * セッションを削除（ログアウト時）
 */
export async function removeSession(userName: string): Promise<void> {
  const supabase = createClient()
  const deviceId = getDeviceId()

  console.log('[removeSession] セッション削除:', { userName, deviceId })

  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_name', userName)
    .eq('device_id', deviceId)

  if (error) {
    console.error('[removeSession] セッション削除エラー:', error)
  } else {
    console.log('[removeSession] セッション削除成功')
  }
}

/**
 * 古いセッションをクリーンアップ（30分以上非アクティブ）
 */
export async function cleanupOldSessions(): Promise<void> {
  const supabase = createClient()

  const thirtyMinutesAgo = new Date()
  thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)

  console.log('[cleanupOldSessions] 古いセッションをクリーンアップ (30分以上非アクティブ)')

  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .lt('last_active', thirtyMinutesAgo.toISOString())

  if (error) {
    console.error('[cleanupOldSessions] クリーンアップエラー:', error)
  } else {
    console.log('[cleanupOldSessions] クリーンアップ成功')
  }
}

/**
 * セッションのハートビート（アクティビティ更新）
 */
export async function updateSessionActivity(userName: string): Promise<void> {
  const supabase = createClient()
  const deviceId = getDeviceId()

  const { error } = await supabase
    .from('user_sessions')
    .update({ last_active: new Date().toISOString() })
    .eq('user_name', userName)
    .eq('device_id', deviceId)

  if (error) {
    console.error('[updateSessionActivity] アクティビティ更新エラー:', error)
  }
}
