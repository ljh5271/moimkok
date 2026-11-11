import { formatTime, timeOptions } from '../utils/time.js'

const OPTIONS = timeOptions()

const selectClass =
  'h-14 w-full appearance-none rounded-2xl bg-paper px-4 text-center text-[17px] font-semibold text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary aria-invalid:ring-2 aria-invalid:ring-sun'

/** value: { start: "18:00", end: "22:00" } */
export default function TimeRangeSelect({ value, onChange, invalid = false, describedBy }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <label className="block">
        <span className="sr-only">시작 시각</span>
        <select
          className={selectClass}
          value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        >
          {OPTIONS.slice(0, -1).map((t) => (
            <option key={t} value={t}>
              {formatTime(t)}
            </option>
          ))}
        </select>
      </label>
      <span aria-hidden className="text-ink-faint">
        ~
      </span>
      <label className="block">
        <span className="sr-only">끝 시각</span>
        <select
          className={selectClass}
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        >
          {OPTIONS.slice(1).map((t) => (
            <option key={t} value={t}>
              {formatTime(t)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
