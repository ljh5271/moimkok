// 이 기기에서 만들거나 투표한 모임 목록. 로그인이 없어서 브라우저(localStorage)에 기억한다.
// { [eventId]: { name, voterName?, created?, updatedAt } }
// 다른 기기·시크릿 창에서는 비어 있고, 브라우저 데이터를 지우면 사라진다.
// 시크릿 창·저장소 차단 환경에서는 읽기/쓰기가 실패할 수 있어 항상 try/catch로 감싼다.
const STORAGE_KEY = 'moimkok:myEvents'

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // 저장 못 해도 지금 화면은 동작하므로 무시
  }
}

/** 모임 정보를 기억하거나 덧붙인다. 최근에 쓴 모임이 목록 위로 온다. */
export function rememberEvent(eventId, patch) {
  const all = readAll()
  all[eventId] = { ...all[eventId], ...patch, updatedAt: new Date().toISOString() }
  writeAll(all)
}

export function forgetEvent(eventId) {
  const all = readAll()
  delete all[eventId]
  writeAll(all)
}

export function getMyEvent(eventId) {
  return readAll()[eventId] ?? null
}

/** 최근 순 목록 → [{ id, name, voterName, created, updatedAt }] */
export function listMyEvents() {
  return Object.entries(readAll())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

/** 이 기기에서 가장 최근에 투표할 때 쓴 이름 (새 모임 투표 화면에 미리 채우기용) */
export function lastVoterName() {
  return listMyEvents().find((e) => e.voterName)?.voterName ?? ''
}
