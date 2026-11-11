import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { getAdminKey, rememberAdminKey } from '../utils/adminKeys.js'
import { forgetEvent, listMyEvents, rememberEvent } from '../utils/myEvents.js'

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
    this.code = code // 'config' | 'notFound' | 'invalid' | 'network' | 'badKey' | 'notConfigured' | 'notConfirmed'
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
  // 콜백 안에서 최신 캐시를 읽기 위한 참조 (모임 이름을 '내 모임'에 기억할 때 씀)
  const stateRef = useRef(state)
  stateRef.current = state

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
    rememberEvent(data.id, { name: event.name, created: true })
    return { event, adminKey: data.admin_key }
  }, [])

  /** 응답 저장 (같은 이름이면 덮어쓰기). 실패하면 StoreError를 던진다. */
  const saveResponse = useCallback(async (eventId, name, slots) => {
    const data = await rpc('save_response', { p_event_id: eventId, p_name: name, p_slots: [...slots] })
    const response = toResponse(data)
    dispatch({ type: 'PUT_RESPONSE', eventId, response })
    const eventName = stateRef.current.events[eventId]?.name
    rememberEvent(eventId, { voterName: response.name, ...(eventName ? { name: eventName } : {}) })
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

  /**
   * 단톡방 글 머리말 만들기 (서버 함수 /api/notice → Claude).
   * kind: 'invite'(투표 요청 글) | 'confirm'(확정 공지, 확정된 일정이 있어야 함)
   * → { parts: { emoji, title, intro }, stats }. 정보 줄·링크는 화면이 utils/noticeFormat.js로 붙인다. 실패하면 StoreError
   *   code: 'notConfigured' | 'notConfirmed' | 'badKey' | 'invalid' | 'network'
   */
  const generateNotice = useCallback(async (eventId, adminKey, { kind = 'confirm', tone, extra = '', place = '' }) => {
    let res
    try {
      res = await fetch('/api/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, adminKey: adminKey ?? '', kind, tone, extra, place }),
      })
    } catch {
      throw new StoreError('네트워크 오류', 'network')
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const code =
        {
          not_configured: 'notConfigured',
          not_confirmed: 'notConfirmed',
          bad_key: 'badKey',
          invalid: 'invalid',
        }[data.code] ?? 'network'
      throw new StoreError(data.message ?? '공지문을 만들지 못했어요.', code)
    }
    return data
  }, [])

  /**
   * AI 포스터 그림 만들기 (서버 함수 /api/poster → Gemini). 10~30초 걸린다.
   * poster: { headline, subhead, keywords, scene } (공지 머리말의 poster 필드)
   * → { mimeType, data(base64) }. 실패하면 StoreError
   *   code: 'notConfigured' | 'badKey' | 'invalid' | 'model' | 'busy' | 'noImage' | 'network'
   */
  const generatePoster = useCallback(async (eventId, adminKey, poster) => {
    let res
    try {
      res = await fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, adminKey: adminKey ?? '', ...poster }),
      })
    } catch {
      throw new StoreError('네트워크 오류', 'network')
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const code =
        {
          not_configured: 'notConfigured',
          bad_key: 'badKey',
          invalid: 'invalid',
          model: 'model',
          busy: 'busy',
          no_image: 'noImage',
        }[data.code] ?? 'network'
      throw new StoreError(data.message ?? '포스터를 그리지 못했어요.', code)
    }
    return data
  }, [])

  const value = useMemo(
    () => ({
      state,
      createEvent,
      saveResponse,
      fetchEvent,
      fetchAdminEvent,
      confirmEvent,
      cancelConfirm,
      generateNotice,
      generatePoster,
    }),
    [state, createEvent, saveResponse, fetchEvent, fetchAdminEvent, confirmEvent, cancelConfirm, generateNotice, generatePoster],
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

/**
 * 홈의 "내 모임" 목록. 이 기기에서 만들거나 투표한 모임을 서버에서 다시 불러온다.
 * → { items, status: 'loading' | 'ready' }
 *   items: [{ id, name, voterName, created, adminKey, event: event | null, status: 'loading' | 'ready' | 'error' }]
 * 서버에서 지워진 모임(notFound)은 목록과 기기 기억에서 함께 뺀다.
 */
export function useMyEvents() {
  const { state, fetchEvent } = useEventStore()
  const [saved] = useState(() => listMyEvents())
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    let cancelled = false
    for (const item of saved) {
      fetchEvent(item.id)
        .then((event) => {
          if (cancelled) return
          if (!event) forgetEvent(item.id)
          setStatuses((s) => ({ ...s, [item.id]: event ? 'ready' : 'notFound' }))
        })
        .catch(() => !cancelled && setStatuses((s) => ({ ...s, [item.id]: 'error' })))
    }
    return () => {
      cancelled = true
    }
  }, [saved, fetchEvent])

  const items = saved
    .filter((item) => statuses[item.id] !== 'notFound')
    .map((item) => {
      const event = state.events[item.id] ?? null
      return {
        ...item,
        adminKey: item.created ? getAdminKey(item.id) : null,
        event,
        status: event ? 'ready' : (statuses[item.id] ?? 'loading'),
      }
    })

  return { items, status: saved.every((i) => statuses[i.id]) ? 'ready' : 'loading' }
}
