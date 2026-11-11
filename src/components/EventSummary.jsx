import { formatDateLong, formatTimeRange } from '../utils/time.js'

export default function EventSummary({ event, headingLevel = 'h1' }) {
  const Heading = headingLevel
  const first = event.dates[0]
  const last = event.dates[event.dates.length - 1]
  const dateText =
    event.dates.length === 1
      ? formatDateLong(first)
      : `${formatDateLong(first)} ~ ${formatDateLong(last)} 중 ${event.dates.length}일`

  return (
    <div>
      <Heading className="text-[22px] leading-snug font-bold tracking-[-0.02em]">{event.name}</Heading>
      {event.description && (
        <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">{event.description}</p>
      )}
      <dl className="mt-5 space-y-2.5 text-[15px]">
        <div className="flex gap-4">
          <dt className="w-10 shrink-0 text-ink-faint">날짜</dt>
          <dd className="font-medium">{dateText}</dd>
        </div>
        <div className="flex gap-4">
          <dt className="w-10 shrink-0 text-ink-faint">시간</dt>
          <dd className="font-medium">{formatTimeRange(event.startTime, event.endTime)}</dd>
        </div>
      </dl>
    </div>
  )
}
