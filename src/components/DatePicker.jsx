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
    'grid size-10 place-items-center rounded-full text-xl text-ink hover:bg-paper disabled:text-line disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-ink'

  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${invalid ? 'border-sun' : 'border-line'}`}
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
        <p className="font-bold" aria-live="polite">
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

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-soft">
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
              className={`relative grid aspect-square place-items-center rounded-lg text-[15px] transition focus-visible:outline-2 focus-visible:outline-ink ${
                isSelected
                  ? 'bg-mark font-extrabold text-ink'
                  : isPast
                    ? 'text-line'
                    : 'font-medium hover:bg-paper'
              }`}
            >
              {day}
              {isToday && (
                <span aria-hidden className="absolute bottom-1.5 size-1 rounded-full bg-ink" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
