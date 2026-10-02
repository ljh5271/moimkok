import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from '../components/DatePicker.jsx'
import TimeRangeSelect from '../components/TimeRangeSelect.jsx'
import { btnPrimary, errorText, input, label } from '../components/styles.js'
import { useEventStore } from '../store/EventStore.jsx'
import { buildTimeSlots, formatDateShort, toMinutes } from '../utils/time.js'

const MAX_DATES = 14

function validate({ name, dates, range }) {
  const errors = {}
  if (!name.trim()) errors.name = '행사 이름을 입력하세요.'
  if (dates.length === 0) errors.dates = '후보 날짜를 하나 이상 고르세요.'
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

  const errors = validate({ name, dates, range })
  const show = (key) => submitted && errors[key]
  const slotCount = errors.time ? 0 : buildTimeSlots(range.start, range.end).length

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) {
      // 첫 번째 오류 위치로 이동
      const first = ['name', 'dates', 'time'].find((k) => errors[k])
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const event = createEvent({
      name: name.trim(),
      description: description.trim(),
      dates,
      startTime: range.start,
      endTime: range.end,
    })
    navigate(`/e/${event.id}/created`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="pt-4">
      <h1 className="mb-8 text-2xl font-extrabold tracking-tight">새 행사 만들기</h1>

      <div className="space-y-8">
        <div id="field-name">
          <label htmlFor="name" className={label}>
            행사 이름
          </label>
          <input
            id="name"
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 10월 정기모임"
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
        </div>

        <div>
          <label htmlFor="description" className={label}>
            설명 <span className="font-medium text-ink-soft">(선택)</span>
          </label>
          <textarea
            id="description"
            className={`${input} min-h-24 resize-none`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="장소, 준비물 등 멤버들이 알아야 할 내용"
            maxLength={200}
          />
        </div>

        <div id="field-dates">
          <p className={label}>후보 날짜</p>
          <DatePicker
            value={dates}
            onChange={setDates}
            invalid={Boolean(show('dates'))}
            describedBy="dates-summary"
          />
          <p id="dates-summary" className="mt-2 text-sm text-ink-soft">
            {dates.length === 0
              ? '가능한 날짜를 모두 눌러 주세요.'
              : `${dates.length}일 선택: ${dates
                  .map((d) => {
                    const { md, dow } = formatDateShort(d)
                    return `${md}(${dow})`
                  })
                  .join(', ')}`}
          </p>
          {show('dates') && <p className={errorText}>{errors.dates}</p>}
        </div>

        <div id="field-time">
          <p className={label}>시간대</p>
          <TimeRangeSelect
            value={range}
            onChange={setRange}
            invalid={Boolean(show('time'))}
            describedBy="time-help"
          />
          <p id="time-help" className="mt-2 text-sm text-ink-soft">
            {errors.time ? '30분 단위로 나눠서 투표해요.' : `30분 단위 ${slotCount}칸으로 나눠서 투표해요.`}
          </p>
          {show('time') && <p className={errorText}>{errors.time}</p>}
        </div>
      </div>

      <button type="submit" className={`${btnPrimary} mt-10 w-full`}>
        투표 링크 만들기
      </button>
    </form>
  )
}
