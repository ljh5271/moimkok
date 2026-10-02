import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import { randomId } from '../utils/id.js'
import { SLOT_MINUTES } from '../utils/time.js'

/*
 * 메모리 전용 저장소. 새로고침하면 사라진다.
 * 3주차에 Supabase로 바꿀 때 createEvent / saveResponse 안쪽만 교체하면 되도록
 * 화면에서는 아래 훅들만 사용한다.
 *
 * event = {
 *   id, adminKey, name, description,
 *   dates: ["2026-10-07", ...], startTime: "18:00", endTime: "22:00", slotMinutes: 30,
 *   responses: [{ name, slots: ["2026-10-07T18:00", ...], updatedAt }],
 *   createdAt,
 * }
 */

const EventStoreContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'CREATE_EVENT':
      return { ...state, events: { ...state.events, [action.event.id]: action.event } }

    case 'SAVE_RESPONSE': {
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

  const createEvent = useCallback(({ name, description, dates, startTime, endTime }) => {
    const event = {
      id: randomId(8),
      adminKey: randomId(16),
      name,
      description,
      dates: [...dates].sort(),
      startTime,
      endTime,
      slotMinutes: SLOT_MINUTES,
      responses: [],
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'CREATE_EVENT', event })
    return event
  }, [])

  const saveResponse = useCallback((eventId, name, slots) => {
    dispatch({
      type: 'SAVE_RESPONSE',
      eventId,
      response: { name, slots: [...slots].sort(), updatedAt: new Date().toISOString() },
    })
  }, [])

  const value = useMemo(() => ({ state, createEvent, saveResponse }), [state, createEvent, saveResponse])

  return <EventStoreContext.Provider value={value}>{children}</EventStoreContext.Provider>
}

export function useEventStore() {
  const ctx = useContext(EventStoreContext)
  if (!ctx) throw new Error('useEventStore는 EventStoreProvider 안에서만 사용할 수 있어요.')
  return ctx
}

export function useEvent(eventId) {
  const { state } = useEventStore()
  return state.events[eventId] ?? null
}
