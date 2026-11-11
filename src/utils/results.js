import { buildTimeSlots, fromMinutes, slotKey, toMinutes } from './time.js'

/**
 * 응답 집계. 화면 그리드와 같은 인덱스(날짜 d, 시간 t)로 계산한다.
 *
 * → {
 *   times: ["18:00", ...],
 *   names: ["이주호", ...]                 // 응답자 전체 (응답 순서)
 *   available: Set<name>[][]               // available[d][t] = 그 칸에 가능한 사람
 *   maxCount: number                       // 한 칸의 최대 가능 인원
 * }
 */
export function tally(event) {
  const times = buildTimeSlots(event.startTime, event.endTime, event.slotMinutes)
  const names = event.responses.map((r) => r.name)
  const index = new Map()
  event.dates.forEach((date, d) => times.forEach((time, t) => index.set(slotKey(date, time), [d, t])))

  const available = event.dates.map(() => times.map(() => new Set()))
  for (const r of event.responses) {
    for (const key of r.slots) {
      const pos = index.get(key)
      if (pos) available[pos[0]][pos[1]].add(r.name)
    }
  }

  let maxCount = 0
  for (const col of available) for (const cell of col) maxCount = Math.max(maxCount, cell.size)

  return { times, names, available, maxCount }
}

/** 한 날짜(d)의 t0~t1 칸 모두 가능한 사람 (교집합) */
export function availableForRange(result, d, t0, t1) {
  const [a, b] = t0 <= t1 ? [t0, t1] : [t1, t0]
  let common = null
  for (let t = a; t <= b; t++) {
    const cell = result.available[d][t]
    common = common === null ? new Set(cell) : new Set([...common].filter((n) => cell.has(n)))
    if (common.size === 0) break
  }
  return result.names.filter((n) => common?.has(n))
}

/** 선택 범위(d, t0, t1)를 확정용 시각으로 변환. 끝 시각은 마지막 칸 + 30분 */
export function rangeToTimes(result, slotMinutes, t0, t1) {
  const [a, b] = t0 <= t1 ? [t0, t1] : [t1, t0]
  return {
    startTime: result.times[a],
    endTime: fromMinutes(toMinutes(result.times[b]) + slotMinutes),
  }
}

/**
 * 추천 시간: "구간 전체에 계속 가능한 사람 수"가 많은 연속 구간.
 *
 * 각 날짜에서 양쪽으로 더 늘리면 가능 인원이 줄어드는(= 더 늘릴 수 없는) 구간만 후보로 모은다.
 * 정렬: 가능 인원 많은 순 → 긴 순 → 이른 날짜·시각 순.
 * 더 높은 순위 후보와 겹치면서 길이도 같거나 짧은 구간은 뺀다 (인원도 적고 길지도 않아 고를 이유가 없음).
 * 겹쳐도 더 긴 구간은 "인원은 조금 적지만 더 길게"라는 대안이라 남긴다.
 */
export function recommendRanges(result, limit = 3) {
  const candidates = []
  result.available.forEach((col, d) => {
    const n = col.length
    for (let i = 0; i < n; i++) {
      let common = new Set(col[i])
      if (common.size === 0) continue
      for (let j = i; j < n; j++) {
        if (j > i) common = new Set([...common].filter((x) => col[j].has(x)))
        if (common.size === 0) break
        const nextSize = j + 1 < n ? [...common].filter((x) => col[j + 1].has(x)).length : -1
        if (nextSize === common.size) continue // 오른쪽으로 더 늘릴 수 있음
        // 왼쪽으로 늘려도 같은 인원이면 i에서 시작하는 구간은 최대가 아님
        const leftSize = i > 0 ? [...common].filter((x) => col[i - 1].has(x)).length : -1
        if (leftSize !== common.size) {
          candidates.push({ d, t0: i, t1: j, count: common.size })
        }
      }
    }
  })

  candidates.sort((a, b) => b.count - a.count || b.t1 - b.t0 - (a.t1 - a.t0) || a.d - b.d || a.t0 - b.t0)

  const picked = []
  for (const c of candidates) {
    const redundant = picked.some(
      (p) => p.d === c.d && c.t0 <= p.t1 && p.t0 <= c.t1 && c.t1 - c.t0 <= p.t1 - p.t0,
    )
    if (!redundant) picked.push(c)
    if (picked.length === limit) break
  }
  return picked
}

/**
 * 내가 고른 칸들을 날짜별 연속 구간으로 묶는다.
 * ["2026-12-04T19:00", "2026-12-04T19:30", "2026-12-05T18:00"]
 *   → [{ date: "2026-12-04", startTime: "19:00", endTime: "20:00" }, { date: "2026-12-05", startTime: "18:00", endTime: "18:30" }]
 */
export function groupSlots(slots, slotMinutes = 30) {
  const ranges = []
  for (const key of [...slots].sort()) {
    const date = key.slice(0, 10)
    const start = toMinutes(key.slice(11, 16))
    const last = ranges[ranges.length - 1]
    if (last && last.date === date && toMinutes(last.endTime) === start) {
      last.endTime = fromMinutes(start + slotMinutes)
    } else {
      ranges.push({ date, startTime: fromMinutes(start), endTime: fromMinutes(start + slotMinutes) })
    }
  }
  return ranges
}
