export const SLOT_MINUTES = 30

const DOW = ['일', '월', '화', '수', '목', '금', '토']

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "18:00"~"20:00" → ["18:00", "18:30", "19:00", "19:30"] (끝 시각은 포함하지 않음) */
export function buildTimeSlots(start, end, step = SLOT_MINUTES) {
  const slots = []
  for (let t = toMinutes(start); t < toMinutes(end); t += step) {
    slots.push(fromMinutes(t))
  }
  return slots
}

/** 셀렉트 박스용 시각 목록: 00:00 ~ 24:00 */
export function timeOptions(step = SLOT_MINUTES) {
  const options = []
  for (let t = 0; t <= 24 * 60; t += step) options.push(fromMinutes(t))
  return options
}

/** 응답 저장 키: "2026-10-07T18:00" */
export function slotKey(date, time) {
  return `${date}T${time}`
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "2026-10-07" → { md: "10/7", dow: "화", dowIndex: 2 } */
export function formatDateShort(iso) {
  const d = parseISODate(iso)
  return { md: `${d.getMonth() + 1}/${d.getDate()}`, dow: DOW[d.getDay()], dowIndex: d.getDay() }
}

/** "2026-10-07" → "10월 7일 (화)" */
export function formatDateLong(iso) {
  const d = parseISODate(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`
}

/** "18:30" → "오후 6:30", "24:00" → "자정" */
export function formatTime(hhmm) {
  const total = toMinutes(hhmm)
  if (total === 24 * 60) return '자정'
  const h = Math.floor(total / 60)
  const m = total % 60
  const period = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${period} ${h12}시` : `${period} ${h12}:${String(m).padStart(2, '0')}`
}

/** 그리드 왼쪽 시각 라벨: 정시만 "18시" */
export function hourLabel(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return m === 0 ? `${h}시` : ''
}
