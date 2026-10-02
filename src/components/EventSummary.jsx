import { formatDateLong, formatTime } from '../utils/time.js'

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
      <Heading className="text-2xl font-extrabold tracking-tight">{event.name}</Heading>
      {event.description && (
        <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-soft">{event.description}</p>
      )}
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-soft">날짜</dt>
        <dd className="font-semibold">{dateText}</dd>
        <dt className="text-ink-soft">시간</dt>
        <dd className="font-semibold">
          {formatTime(event.startTime)} ~ {formatTime(event.endTime)}
        </dd>
      </dl>
    </div>
  )
}
