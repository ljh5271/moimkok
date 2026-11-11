import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ConfirmedBanner from '../components/ConfirmedBanner.jsx'
import EventSummary from '../components/EventSummary.jsx'
import { EventSkeleton, LoadError } from '../components/LoadState.jsx'
import ResultGrid, { HeatLegend } from '../components/ResultGrid.jsx'
import { btnPrimary, btnSecondary, card } from '../components/styles.js'
import { useAdminEvent, useEventStore } from '../store/EventStore.jsx'
import { availableForRange, rangeToTimes, recommendRanges, tally } from '../utils/results.js'
import { formatDuration, formatSlotRange } from '../utils/time.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function AdminPage() {
  const { eventId } = useParams()
  const [params] = useSearchParams()
  const adminKey = params.get('key')
  const { event, status, reload } = useAdminEvent(eventId, adminKey)
  const { confirmEvent, cancelConfirm } = useEventStore()

  const [selection, setSelection] = useState(null) // { d, t0, t1 }
  // idle / confirming / canceling / error
  const [action, setAction] = useState('idle')
  const [actionError, setActionError] = useState('')

  const result = useMemo(() => (event ? tally(event) : null), [event])
  const recommendations = useMemo(() => (result ? recommendRanges(result) : []), [result])

  if (status === 'notFound') return <NotFoundPage kind="event" />
  if (status === 'error') return <LoadError onRetry={reload} />
  if (status === 'loading') return <div className="pt-4"><EventSkeleton /></div>

  if (status === 'badKey') {
    return (
      <section className="pt-16">
        <h1 className="text-2xl font-extrabold tracking-tight">관리 링크가 올바르지 않아요</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">행사를 만들 때 받은 관리 링크 전체를 그대로 열어 주세요.</p>
        <Link to={`/e/${eventId}`} className={`${btnSecondary} mt-8`}>
          투표 화면으로 가기
        </Link>
      </section>
    )
  }

  const total = result.names.length
  const busy = action === 'confirming' || action === 'canceling'

  // 선택 범위 → 날짜·시각, 가능/불가 명단
  const picked = selection && {
    date: event.dates[selection.d],
    ...rangeToTimes(result, event.slotMinutes, selection.t0, selection.t1),
    minutes: (selection.t1 - selection.t0 + 1) * event.slotMinutes,
    yes: availableForRange(result, selection.d, selection.t0, selection.t1),
  }
  const no = picked ? result.names.filter((n) => !picked.yes.includes(n)) : []
  const c = event.confirmed
  const pickedIsConfirmed =
    picked && c && c.date === picked.date && c.startTime === picked.startTime && c.endTime === picked.endTime

  function pick(next) {
    setSelection(next)
    if (action === 'error') {
      setAction('idle')
      setActionError('')
    }
  }

  async function handleConfirm() {
    if (!picked || busy) return
    setAction('confirming')
    setActionError('')
    try {
      await confirmEvent(event.id, adminKey, picked)
      setAction('idle')
    } catch {
      setAction('error')
      setActionError('확정하지 못했어요. 다시 시도하세요.')
    }
  }

  async function handleCancel() {
    if (busy) return
    setAction('canceling')
    setActionError('')
    try {
      await cancelConfirm(event.id, adminKey)
      setAction('idle')
    } catch {
      setAction('error')
      setActionError('확정을 취소하지 못했어요. 다시 시도하세요.')
    }
  }

  return (
    <section className="pt-4">
      <div className={card}>
        <EventSummary event={event} />
      </div>

      {c && (
        <div className="mt-4">
          <ConfirmedBanner confirmed={c}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="mt-3 rounded text-sm font-semibold text-ink-soft underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-50"
            >
              {action === 'canceling' ? '취소하는 중…' : '확정 취소하기'}
            </button>
          </ConfirmedBanner>
        </div>
      )}

      {/* 응답자 */}
      <h2 className="mt-8 font-bold">응답한 사람 {total}명</h2>
      {total === 0 ? (
        <p className="mt-2 leading-relaxed text-ink-soft">
          아직 응답이 없어요. 투표 링크를 단톡방에 공유해 보세요.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {result.names.map((name) => (
            <li key={name} className="rounded-full border border-line bg-white px-3 py-1 text-sm font-semibold">
              {name}
            </li>
          ))}
        </ul>
      )}

      {/* 추천 시간 */}
      {recommendations.length > 0 && (
        <>
          <h2 className="mt-8 font-bold">많이 겹치는 시간</h2>
          <p className="mt-1 text-sm text-ink-soft">구간 내내 가능한 사람이 많은 순서예요. 누르면 아래 표에서 선택돼요.</p>
          <ol className="mt-3 space-y-2">
            {recommendations.map((r) => {
              const { startTime, endTime } = rangeToTimes(result, event.slotMinutes, r.t0, r.t1)
              const active = selection && selection.d === r.d && selection.t0 === r.t0 && selection.t1 === r.t1
              return (
                <li key={`${r.d}-${r.t0}-${r.t1}`}>
                  <button
                    type="button"
                    onClick={() => pick({ d: r.d, t0: r.t0, t1: r.t1 })}
                    aria-pressed={Boolean(active)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                      active ? 'border-ink ring-2 ring-ink' : 'border-line hover:border-ink-soft'
                    }`}
                  >
                    <span className="block font-bold">{formatSlotRange(event.dates[r.d], startTime, endTime)}</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {total}명 중 <strong className="text-ink">{r.count}명</strong> 가능 ·{' '}
                      {formatDuration((r.t1 - r.t0 + 1) * event.slotMinutes)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      )}

      {/* 히트맵 */}
      <h2 className="mt-8 font-bold">시간별 가능 인원</h2>
      <p className="mt-1 mb-3 text-sm text-ink-soft">칸을 누르거나, 누른 채 위아래로 끌어서 확정할 시간을 고르세요.</p>
      <div className="mb-3">
        <HeatLegend total={total} />
      </div>
      <ResultGrid
        dates={event.dates}
        times={result.times}
        endTime={event.endTime}
        result={result}
        selection={selection}
        onSelect={pick}
      />

      {/* 선택한 시간 상세 */}
      {picked && (
        <div className={`${card} mt-4`} aria-live="polite">
          <p className="font-bold">{formatSlotRange(picked.date, picked.startTime, picked.endTime)}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {formatDuration(picked.minutes)} · 구간 내내 가능한 사람 {picked.yes.length}명
          </p>
          {total > 0 && (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-bold">가능 {picked.yes.length}명</dt>
                <dd className="mt-1 text-ink-soft">{picked.yes.length ? picked.yes.join(', ') : '없음'}</dd>
              </div>
              <div>
                <dt className="font-bold">불가 또는 일부만 가능 {no.length}명</dt>
                <dd className="mt-1 text-ink-soft">{no.length ? no.join(', ') : '없음'}</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {/* 확정 바 */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {picked ? formatSlotRange(picked.date, picked.startTime, picked.endTime) : '시간을 고르세요'}
            </p>
            <p
              className={`text-sm ${action === 'error' ? 'font-semibold text-sun' : 'text-ink-soft'}`}
              aria-live="polite"
            >
              {action === 'error'
                ? actionError
                : pickedIsConfirmed
                  ? '지금 확정된 시간이에요.'
                  : c
                    ? '확정하면 기존 일정이 바뀌어요.'
                    : picked
                      ? `${total}명 중 ${picked.yes.length}명 가능`
                      : '추천 시간을 누르거나 표에서 칸을 고르세요.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!picked || busy || pickedIsConfirmed}
            className={`${pickedIsConfirmed ? btnSecondary : btnPrimary} shrink-0 disabled:cursor-not-allowed`}
          >
            {action === 'confirming' ? '확정하는 중…' : pickedIsConfirmed ? '확정됨' : c ? '이 시간으로 변경' : '확정하기'}
          </button>
        </div>
      </div>
    </section>
  )
}
