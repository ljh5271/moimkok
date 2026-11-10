// 행사를 만든 기기에만 관리키를 기억해 둔다. { [eventId]: adminKey }
// 새로고침해도 생성 완료 화면에서 관리 링크를 다시 보여주기 위한 용도.
// 시크릿 창·저장소 차단 환경에서는 읽기/쓰기가 실패할 수 있어 항상 try/catch로 감싼다.
const STORAGE_KEY = 'moimkok:adminKeys'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

export function rememberAdminKey(eventId, adminKey) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [eventId]: adminKey }))
  } catch {
    // 저장 실패해도 이번 화면에서는 메모리 상태로 보여주므로 무시
  }
}

export function getAdminKey(eventId) {
  return readAll()[eventId] ?? null
}
