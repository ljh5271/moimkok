import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from '../components/DatePicker.jsx'
import TimeRangeSelect from '../components/TimeRangeSelect.jsx'
import BottomCTA from '../components/BottomCTA.jsx'
import { btnPrimary, card, errorText, input, label, pageTitle, sectionTitle, textarea } from '../components/styles.js'
import { useEventStore } from '../store/EventStore.jsx'
import { buildTimeSlots, formatDateShort, toMinutes } from '../utils/time.js'

const MAX_DATES = 14

function validate({ name, dates, range }) {
  const errors = {}
  if (!name.trim()) errors.name = '모임 이름을 입력해 주세요.'
  if (dates.length === 0) errors.dates = '후보 날짜를 하나 이상 골라 주세요.'
  else if (dates.length > MAX_DATES) errors.dates = `후보 날짜는 ${MAX_DATES}개까지 고를 수 있어요.`
  if (toMinutes(range.end) <= toMinutes(range.start)) errors.time = '끝 시각은 시작 시각보다 늦어야 해요.'
  return errors
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { createEvent } = useEventStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dates, setDates] = useState([])
  const [range, setRange] = useState({ start: '18:00', end: '22:00' })
  const [submitted, setSubmitted] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const errors = validate({ name, dates, range })
  const show = (key) => submitted && errors[key]
  const slotCount = errors.time ? 0 : buildTimeSlots(range.start, range.end).length

  async function handleSubmit(e) {
    e.preventDefault()
    if (creating) return
    setSubmitted(true)
    if (Object.keys(errors).length > 0) {
      // 첫 번째 오류 위치로 이동
      const first = ['name', 'dates', 'time'].find((k) => errors[k])
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const { event } = await createEvent({
        name: name.trim(),
        description: description.trim(),
        dates,
        startTime: range.start,
        endTime: range.end,
      })
      navigate(`/e/${event.id}/created`)
    } catch {
      // 입력값은 그대로 두고 다시 시도할 수 있게 한다
      setCreateError('모임을 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="pt-6 pb-36">
      <h1 className={pageTitle}>
        어떤 모임의
        <br />
        일정을 정할까요?
      </h1>

      <div className="mt-8 space-y-3">
        <section className={card} id="field-name">
          <label htmlFor="name" className={label}>
            모임 이름
          </label>
          <input
            id="name"
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="11월 정기모임"
            maxLength={40}
            autoComplete="off"
            aria-invalid={show('name') ? true : undefined}
            aria-describedby={show('name') ? 'name-error' : undefined}
          />
          {show('name') && (
            <p id="name-error" className={errorText}>
              {errors.name}
            </p>
          )}

          <label htmlFor="description" className={`${label} mt-6`}>
            설명 <span className="font-normal text-ink-faint">선택</span>
          </label>
          <textarea
            id="description"
            className={`${textarea} min-h-24 resize-none`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="장소나 준비물처럼 미리 알면 좋은 내용"
            maxLength={200}
          />
        </section>

        <section className={card} id="field-dates">
          <h2 className={sectionTitle}>후보 날짜</h2>
          <p id="dates-summary" className="mt-1 mb-4 text-[15px] text-ink-faint">
            {dates.length === 0
              ? '가능한 날짜를 모두 눌러 주세요.'
              : `${dates.length}일 골랐어요 · ${dates
                  .map((d) => {
                    const { md, dow } = formatDateShort(d)
                    return `${md}(${dow})`
                  })
                  .join(', ')}`}
          </p>
          <DatePicker value={dates} onChange={setDates} invalid={Boolean(show('dates'))} describedBy="dates-summary" />
          {show('dates') && <p className={errorText}>{errors.dates}</p>}
        </section>

        <section className={card} id="field-time">
          <h2 className={sectionTitle}>시간대</h2>
          <p id="time-help" className="mt-1 mb-4 text-[15px] text-ink-faint">
            {errors.time ? '30분 단위로 나눠서 투표해요.' : `30분 단위 ${slotCount}칸으로 나눠서 투표해요.`}
          </p>
          <TimeRangeSelect value={range} onChange={setRange} invalid={Boolean(show('time'))} describedBy="time-help" />
          {show('time') && <p className={errorText}>{errors.time}</p>}
        </section>
      </div>

      <BottomCTA
        note={
          createError ? (
            <p className="text-center text-[14px] font-medium text-sun" role="alert">
              {createError}
            </p>
          ) : null
        }
      >
        <button type="submit" disabled={creating} className={`${btnPrimary} w-full`}>
          {creating ? '만드는 중…' : '투표 링크 만들기'}
        </button>
      </BottomCTA>
    </form>
  )
}
