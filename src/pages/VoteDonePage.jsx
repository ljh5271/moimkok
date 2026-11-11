import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import BottomCTA from '../components/BottomCTA.jsx'
import ConfirmedBanner from '../components/ConfirmedBanner.jsx'
import { EventSkeleton, LoadError } from '../components/LoadState.jsx'
import { btnPrimary, btnSecondary, card, pageTitle, sectionTitle } from '../components/styles.js'
import { useEvent } from '../store/EventStore.jsx'
import { getMyEvent } from '../utils/myEvents.js'
import { groupSlots } from '../utils/results.js'
import { formatDateLong, formatDuration, formatTimeRange, fromMinutes, slotKey, toMinutes } from '../utils/time.js'
import NotFoundPage from './NotFoundPage.jsx'

/** 확정된 시간에 내가 되는지: 확정 구간의 모든 칸을 골랐으면 true */
function availableAtConfirmed(confirmed, slots, slotMinutes) {
  const mine = new Set(slots)
  for (let t = toMinutes(confirmed.startTime); t < toMinutes(confirmed.endTime); t += slotMinutes) {
    if (!mine.has(slotKey(confirmed.date, fromMinutes(t)))) return false
  }
  return true
}

/** 투표 저장 후 화면: 내가 고른 시간 요약 + 수정하기 / 홈으로 */
export default function VoteDonePage() {
  const { eventId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { event, status, reload } = useEvent(eventId)

  // 방금 저장한 이름 (화면 이동 때 전달) → 없으면 이 기기에 기억된 이름
  const name = location.state?.name ?? getMyEvent(eventId)?.voterName ?? null
  const response = event && name ? event.responses.find((r) => r.name === name) : null
  const ranges = useMemo(() => (response ? groupSlots(response.slots, event.slotMinutes) : []), [response, event])

  if (status === 'notFound') return <NotFoundPage kind="event" />
  if (status === 'error') return <LoadError onRetry={reload} />
  if (status === 'loading') return <div className="pt-6"><EventSkeleton /></div>

  // 이 기기에 투표 기록이 없으면 투표 화면으로 안내
  if (!response) {
    return (
      <section className="pt-16">
        <h1 className={pageTitle}>아직 투표하지 않았어요</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{event.name}에서 되는 시간을 골라 주세요.</p>
        <Link to={`/e/${eventId}`} className={`${btnPrimary} mt-8`}>
          투표하러 가기
        </Link>
      </section>
    )
  }

  // 날짜별로 묶어서 보여준다
  const byDate = []
  for (const r of ranges) {
    const last = byDate[byDate.length - 1]
    if (last && last.date === r.date) last.ranges.push(r)
    else byDate.push({ date: r.date, ranges: [r] })
  }
  const totalMinutes = response.slots.length * event.slotMinutes
  const c = event.confirmed

  return (
    <section className="pt-6 pb-36">
      <h1 className={pageTitle}>
        {name}님의 시간을
        <br />
        저장했어요
      </h1>
      <p className="mt-3 text-[17px] text-ink-soft">
        {event.name} · 지금까지 {event.responses.length}명이 응답했어요
      </p>

      <div className="mt-8 space-y-3">
        {c && (
          <ConfirmedBanner confirmed={c}>
            <p className="mt-2 text-[14px] text-white/80">
              {availableAtConfirmed(c, response.slots, event.slotMinutes)
                ? '이 시간에 된다고 투표했어요.'
                : '이 시간은 안 되거나 일부만 된다고 투표했어요.'}
            </p>
          </ConfirmedBanner>
        )}

        <section className={card} aria-labelledby="my-times-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="my-times-title" className={sectionTitle}>
              내가 고른 시간
            </h2>
            {totalMinutes > 0 && <span className="text-[15px] font-semibold text-primary">{formatDuration(totalMinutes)}</span>}
          </div>

          {byDate.length === 0 ? (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-faint">
              되는 시간을 고르지 않았어요. 모든 후보 시간이 어렵다고 저장됐어요.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {byDate.map(({ date, ranges: rs }) => (
                <li key={date} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                  <span className="w-28 shrink-0 text-[15px] font-semibold">{formatDateLong(date)}</span>
                  <span className="flex-1 space-y-1 text-[15px] text-ink-soft">
                    {rs.map((r) => (
                      <span key={r.startTime} className="block">
                        {formatTimeRange(r.startTime, r.endTime)}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <BottomCTA>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(`/e/${eventId}`, { state: { edit: true, name } })}
            className={`${btnSecondary} flex-1`}
          >
            수정하기
          </button>
          <Link to="/" className={`${btnPrimary} flex-1`}>
            홈으로
          </Link>
        </div>
      </BottomCTA>
    </section>
  )
}
