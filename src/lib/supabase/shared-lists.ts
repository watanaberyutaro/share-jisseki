import { createClient } from './client'

export type SharedListType = 'user_names' | 'staff_names' | 'venue_names' | 'agency_names'

interface SharedListItem {
  id: string
  name: string
  created_at: string
  created_by?: string
  updated_at: string
}

/**
 * 共有リストを取得
 */
export async function getSharedList(listType: SharedListType): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from(listType)
    .select('name')
    .order('name', { ascending: true })

  if (error) {
    console.error(`Error fetching ${listType}:`, error)
    return []
  }

  return data.map(item => item.name)
}

/**
 * 共有リストに項目を追加
 */
export async function addToSharedList(
  listType: SharedListType,
  name: string,
  userId?: string
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from(listType)
    .insert({
      name: name.trim(),
      created_by: userId
    })

  if (error) {
    // UNIQUEエラーの場合は既に存在するので成功扱い
    if (error.code === '23505') {
      return true
    }
    console.error(`Error adding to ${listType}:`, error)
    return false
  }

  return true
}

/**
 * 共有リストの項目を更新
 */
export async function updateSharedListItem(
  listType: SharedListType,
  oldName: string,
  newName: string
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from(listType)
    .update({ name: newName.trim() })
    .eq('name', oldName)

  if (error) {
    console.error(`Error updating ${listType}:`, error)
    return false
  }

  return true
}

/**
 * 共有リストから項目を削除
 */
export async function deleteFromSharedList(
  listType: SharedListType,
  name: string
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from(listType)
    .delete()
    .eq('name', name)

  if (error) {
    console.error(`Error deleting from ${listType}:`, error)
    return false
  }

  return true
}

/**
 * localStorageからSupabaseへデータを移行
 */
export async function migrateLocalStorageToSupabase(
  listType: SharedListType,
  localStorageKey: string
): Promise<void> {
  // localStorageからデータを取得
  const localData = localStorage.getItem(localStorageKey)
  if (!localData) return

  try {
    const items: string[] = JSON.parse(localData)

    // Supabaseに追加
    for (const item of items) {
      await addToSharedList(listType, item)
    }

    console.log(`Migrated ${items.length} items from localStorage to ${listType}`)
  } catch (error) {
    console.error('Error migrating localStorage data:', error)
  }
}
