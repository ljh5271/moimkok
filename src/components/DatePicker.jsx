import { useState } from 'react'
import { formatDateShort, toISODate } from '../utils/time.js'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * 후보 날짜 여러 개를 탭해서 고르는 달력.
 * value: ["2026-10-07", ...] (정렬된 ISO 날짜 배열)
 */
export default function DatePicker({ value, onChange, invalid = false, describedBy }) {
  const today = startOfToday()
  const todayISO = toISODate(today)
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const selected = new Set(value)

  function toggle(iso) {
    const next = new Set(selected)
    if (next.has(iso)) next.delete(iso)
    else next.add(iso)
    onChange([...next].sort())
  }

  const navBtn =
    'grid size-10 place-items-center rounded-full text-2xl text-ink-soft active:bg-paper disabled:text-line focus-visible:outline-2 focus-visible:outline-primary'

  return (
    <div
      className={`rounded-2xl ${invalid ? 'ring-2 ring-sun' : ''}`}
      aria-describedby={describedBy}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className={navBtn}
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          disabled={isCurrentMonth}
          aria-label="이전 달"
        >
          ‹
        </button>
        <p className="text-[17px] font-bold" aria-live="polite">
          {year}년 {month + 1}월
        </p>
        <button
          type="button"
          className={navBtn}
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[13px] font-medium text-ink-faint">
        {WEEK.map((w, i) => (
          <span key={w} className={`py-1 ${i === 0 ? 'text-sun' : i === 6 ? 'text-sat' : ''}`}>
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />
          const iso = toISODate(new Date(year, month, day))
          const isPast = iso < todayISO
          const isSelected = selected.has(iso)
          const isToday = iso === todayISO
          const { md, dow } = formatDateShort(iso)
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => toggle(iso)}
              aria-pressed={isSelected}
              aria-label={`${md} ${dow}요일${isToday ? ', 오늘' : ''}`}
              className={`relative grid aspect-square place-items-center rounded-full text-[16px] transition focus-visible:outline-2 focus-visible:outline-primary ${
                isSelected
                  ? 'bg-primary font-bold text-white'
                  : isPast
                    ? 'text-line'
                    : 'font-medium text-ink active:bg-paper'
              }`}
            >
              {day}
              {isToday && (
                <span aria-hidden className={`absolute bottom-1 size-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
