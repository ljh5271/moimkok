import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rememberAdminKey } from '../utils/adminKeys.js'

/*
 * 데이터 저장소. 실제 데이터는 Supabase에 있고, 여기 reducer는 "불러온 행사 캐시" 역할만 한다.
 * 화면은 아래 훅들로만 데이터에 접근한다. DB는 RPC 함수로만 호출한다 (supabase/schema.sql).
 *
 * 화면이 쓰는 event 모양 (DB의 snake_case를 여기서 camelCase로 바꾼다. 관리키는 들어 있지 않다)
 * event = {
 *   id, name, description,
 *   dates: ["2026-10-07", ...], startTime: "18:00", endTime: "22:00", slotMinutes: 30,
 *   responses: [{ name, slots: ["2026-10-07T18:00", ...], updatedAt }],
 *   confirmed: { date: "2026-10-07", startTime: "19:00", endTime: "21:00", confirmedAt } | null,
 *   createdAt,
 * }
 */

const EventStoreContext = createContext(null)

// ── DB ↔ 화면 변환 ─────────────────────────────
function toResponse(row) {
  return { name: row.name, slots: row.slots ?? [], updatedAt: row.updated_at }
}

function toConfirmed(c) {
  if (!c) return null
  return { date: c.date, startTime: c.start_time, endTime: c.end_time, confirmedAt: c.confirmed_at }
}

function toEvent(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    dates: row.dates,
    startTime: row.start_time,
    endTime: row.end_time,
    slotMinutes: row.slot_minutes,
    createdAt: row.created_at,
    confirmed: toConfirmed(row.confirmed),
    responses: (row.responses ?? []).map(toResponse),
  }
}

// ── RPC 호출 ───────────────────────────────────
export class StoreError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code // 'config' | 'notFound' | 'invalid' | 'network' | 'badKey'
  }
}

async function rpc(fn, args) {
  if (!supabase) throw new StoreError('Supabase 설정이 없어요.', 'config')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const code = error.code === 'P0002' ? 'notFound' : ['22023', '23514'].includes(error.code) ? 'invalid' : 'network'
    throw new StoreError(error.message, code)
  }
  return data
}

// ── 캐시 ──────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'PUT_EVENT':
      return { ...state, events: { ...state.events, [action.event.id]: action.event } }

    case 'PUT_RESPONSE': {
      const event = state.events[action.eventId]
      if (!event) return state
      const exists = event.responses.some((r) => r.name === action.response.name)
      const responses = exists
        ? event.responses.map((r) => (r.name === action.response.name ? action.response : r))
        : [...event.responses, action.response]
      return { ...state, events: { ...state.events, [event.id]: { ...event, responses } } }
    }

    default:
      return state
  }
}

export function EventStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { events: {} })

  /** 행사 만들기 → { event, adminKey }. 실패하면 StoreError를 던진다. */
  const createEvent = useCallback(async ({ name, description, dates, startTime, endTime }) => {
    const data = await rpc('create_event', {
      p_name: name,
      p_description: description,
      p_dates: dates,
      p_start_time: startTime,
      p_end_time: endTime,
    })
    // 방금 보낸 값으로 캐시를 채워 생성 완료 화면이 추가 요청 없이 바로 뜨게 한다
    const event = {
      id: data.id,
      name: name.trim(),
      description: description.trim(),
      dates: [...new Set(dates)].sort(),
      startTime,
      endTime,
      slotMinutes: 30,
      createdAt: new Date().toISOString(),
      confirmed: null,
      responses: [],
    }
    dispatch({ type: 'PUT_EVENT', event })
    rememberAdminKey(data.id, data.admin_key)
    return { event, adminKey: data.admin_key }
  }, [])

  /** 응답 저장 (같은 이름이면 덮어쓰기). 실패하면 StoreError를 던진다. */
  const saveResponse = useCallback(async (eventId, name, slots) => {
    const data = await rpc('save_response', { p_event_id: eventId, p_name: name, p_slots: [...slots] })
    const response = toResponse(data)
    dispatch({ type: 'PUT_RESPONSE', eventId, response })
    return response
  }, [])

  const fetchEvent = useCallback(async (eventId) => {
    const data = await rpc('get_event', { p_event_id: eventId })
    if (!data) return null
    const event = toEvent(data)
    dispatch({ type: 'PUT_EVENT', event })
    return event
  }, [])

  const fetchAdminEvent = useCallback(async (eventId, adminKey) => {
    const data = await rpc('get_admin_event', { p_event_id: eventId, p_admin_key: adminKey ?? '' })
    if (!data) return null
    const event = toEvent(data)
    dispatch({ type: 'PUT_EVENT', event })
    return event
  }, [])

  /** 일정 확정 (다시 부르면 변경). 관리키가 틀리면 StoreError('badKey') */
  const confirmEvent = useCallback(async (eventId, adminKey, { date, startTime, endTime }) => {
    const data = await rpc('confirm_event', {
      p_event_id: eventId,
      p_admin_key: adminKey ?? '',
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
    })
    if (!data) throw new StoreError('관리키가 올바르지 않아요.', 'badKey')
    const event = toEvent(data)
    dispatch({ type: 'PUT_EVENT', event })
    return event
  }, [])

  /** 확정 취소. 관리키가 틀리면 StoreError('badKey') */
  const cancelConfirm = useCallback(async (eventId, adminKey) => {
    const data = await rpc('cancel_confirm', { p_event_id: eventId, p_admin_key: adminKey ?? '' })
    if (!data) throw new StoreError('관리키가 올바르지 않아요.', 'badKey')
    const event = toEvent(data)
    dispatch({ type: 'PUT_EVENT', event })
    return event
  }, [])

  const value = useMemo(
    () => ({ state, createEvent, saveResponse, fetchEvent, fetchAdminEvent, confirmEvent, cancelConfirm }),
    [state, createEvent, saveResponse, fetchEvent, fetchAdminEvent, confirmEvent, cancelConfirm],
  )

  return <EventStoreContext.Provider value={value}>{children}</EventStoreContext.Provider>
}

export function useEventStore() {
  const ctx = useContext(EventStoreContext)
  if (!ctx) throw new Error('useEventStore는 EventStoreProvider 안에서만 사용할 수 있어요.')
  return ctx
}

/**
 * 행사 하나 불러오기 (참여자용, 관리키 없이).
 * 캐시에 있으면 바로 보여주고, 화면에 들어올 때마다 최신 응답을 다시 받아온다.
 * → { event, status: 'loading' | 'ready' | 'notFound' | 'error', reload }
 */
export function useEvent(eventId) {
  const { state, fetchEvent } = useEventStore()
  const cached = state.events[eventId] ?? null
  const [result, setResult] = useState({ id: eventId, status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setResult({ id: eventId, status: 'loading' })
    fetchEvent(eventId)
      .then((event) => !cancelled && setResult({ id: eventId, status: event ? 'ready' : 'notFound' }))
      .catch(() => !cancelled && setResult({ id: eventId, status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [eventId, attempt, fetchEvent])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const fetched = result.id === eventId ? result.status : 'loading'
  // 캐시가 있으면 새로 받아오는 동안·실패해도 화면을 유지한다. 행사가 지워졌다면 notFound가 우선.
  const status = fetched === 'notFound' ? 'notFound' : cached ? 'ready' : fetched
  return { event: status === 'ready' ? cached : null, status, reload }
}

/**
 * 운영진 화면용. 관리키가 맞을 때만 행사를 받아온다.
 * → { event, status: 'loading' | 'ready' | 'badKey' | 'notFound' | 'error', reload }
 */
export function useAdminEvent(eventId, adminKey) {
  const { state, fetchEvent, fetchAdminEvent } = useEventStore()
  const [result, setResult] = useState({ key: `${eventId}:${adminKey}`, status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const resultKey = `${eventId}:${adminKey}`

  useEffect(() => {
    let cancelled = false
    setResult({ key: resultKey, status: 'loading' })
    ;(async () => {
      const event = await fetchAdminEvent(eventId, adminKey)
      if (event) return 'ready'
      // 키가 틀린 건지 행사가 없는 건지 구분
      const exists = await fetchEvent(eventId)
      return exists ? 'badKey' : 'notFound'
    })()
      .then((status) => !cancelled && setResult({ key: resultKey, status }))
      .catch(() => !cancelled && setResult({ key: resultKey, status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [eventId, adminKey, resultKey, attempt, fetchEvent, fetchAdminEvent])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const status = result.key === resultKey ? result.status : 'loading'
  return { event: status === 'ready' ? (state.events[eventId] ?? null) : null, status, reload }
}
