// 一般ユーザー（三浦）向けの閲覧制限ルール。
// 管理者(role='admin')は全機能アクセス可。一般ユーザー(role='user')は閲覧ページのみ・
// 閲覧できるデータは下記の年月のみに制限する。
export const VIEWER_YEAR = 2026
export const VIEWER_MONTH = 9

// 閲覧制限対象のユーザーか（＝一般ユーザー）。
export function isViewerRole(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('userRole') === 'user'
}

// そのイベント（年・月）が現在のユーザーに閲覧可能か。
// 管理者は常にtrue、一般ユーザーは指定年月のみtrue。
export function isEventViewable(year?: number, month?: number): boolean {
  if (!isViewerRole()) return true
  return year === VIEWER_YEAR && month === VIEWER_MONTH
}

// 一般ユーザーがアクセス可能なパスか（閲覧ページとログインのみ）。
export function isPathAllowedForViewer(pathname: string): boolean {
  return pathname === '/view' || pathname.startsWith('/view/') || pathname === '/login'
}
