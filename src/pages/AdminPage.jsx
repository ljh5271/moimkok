import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import BottomCTA from '../components/BottomCTA.jsx'
import ConfirmedBanner from '../components/ConfirmedBanner.jsx'
import EventSummary from '../components/EventSummary.jsx'
import { EventSkeleton, LoadError } from '../components/LoadState.jsx'
import NoticeComposer from '../components/NoticeComposer.jsx'
import ResultGrid, { HeatLegend } from '../components/ResultGrid.jsx'
import { btnPrimary, btnSecondary, card, pageTitle, sectionTitle } from '../components/styles.js'
import { useAdminEvent, useEventStore } from '../store/EventStore.jsx'
import { availableForRange, rangeToTimes, recommendRanges, tally } from '../utils/results.js'
import { formatDateLong, formatDuration, formatSlotRange, formatTimeRange } from '../utils/time.js'
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
  if (status === 'loading') return <div className="pt-6"><EventSkeleton /></div>

  if (status === 'badKey') {
    return (
      <section className="pt-16">
        <h1 className={pageTitle}>관리 링크가 올바르지 않아요</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">모임을 만들 때 받은 관리 링크 전체를 그대로 열어 주세요.</p>
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
      setSelection(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setAction('error')
      setActionError('확정하지 못했어요. 다시 시도해 주세요.')
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
      setActionError('확정을 취소하지 못했어요. 다시 시도해 주세요.')
    }
  }

  return (
    <section className={`pt-6 ${picked ? 'pb-44' : 'pb-16'}`}>
      <div className="space-y-3">
        <div className={card}>
          <EventSummary event={event} />
        </div>

        {c && (
          <ConfirmedBanner confirmed={c}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="mt-4 h-9 rounded-xl bg-white/15 px-3.5 text-[14px] font-semibold text-white transition active:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
            >
              {action === 'canceling' ? '취소하는 중…' : '확정 취소하기'}
            </button>
            {action === 'error' && !picked && (
              <p className="mt-2 text-[14px] font-medium text-white" role="alert">
                {actionError}
              </p>
            )}
          </ConfirmedBanner>
        )}

        {c && (
          <NoticeComposer
            key={`${c.date}-${c.startTime}-${c.endTime}`}
            event={event}
            adminKey={adminKey}
            kind="confirm"
            title="확정 공지 쓰기"
            description="확정된 일정과 참석 가능 인원으로 단톡방에 올릴 공지를 써 드려요. 안 되는 사람 이름은 넣지 않아요."
            extraPlaceholder={'회비: 1만 원\n준비물: 노트북'}
          />
        )}

        {/* 응답자 */}
        <section className={card} aria-labelledby="respondents-title">
          <h2 id="respondents-title" className={sectionTitle}>
            응답한 사람 <span className="text-primary">{total}</span>명
          </h2>
          {total === 0 ? (
            <p className="mt-1 text-[15px] leading-relaxed text-ink-faint">
              아직 응답이 없어요. 투표 링크를 단톡방에 보내 보세요.
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {result.names.map((name) => (
                <li key={name} className="rounded-full bg-paper px-3 py-1.5 text-[14px] font-medium text-ink-soft">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 추천 시간 */}
        {recommendations.length > 0 && (
          <section className={card} aria-labelledby="recs-title">
            <h2 id="recs-title" className={sectionTitle}>
              많이 겹치는 시간
            </h2>
            <p className="mt-1 text-[15px] text-ink-faint">구간 내내 되는 사람이 많은 순서예요.</p>
            <ol className="mt-4 -mx-2">
              {recommendations.map((r, i) => {
                const { startTime, endTime } = rangeToTimes(result, event.slotMinutes, r.t0, r.t1)
                const active = selection && selection.d === r.d && selection.t0 === r.t0 && selection.t1 === r.t1
                return (
                  <li key={`${r.d}-${r.t0}-${r.t1}`}>
                    <button
                      type="button"
                      onClick={() => pick({ d: r.d, t0: r.t0, t1: r.t1 })}
                      aria-pressed={Boolean(active)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-primary ${
                        active ? 'bg-primary-weak' : 'active:bg-paper'
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold ${
                          active ? 'bg-primary text-white' : 'bg-paper text-ink-faint'
                        }`}
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold">{formatDateLong(event.dates[r.d])}</span>
                        <span className="mt-0.5 block text-[14px] text-ink-faint">
                          {formatTimeRange(startTime, endTime)} · {formatDuration((r.t1 - r.t0 + 1) * event.slotMinutes)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[17px] font-bold text-primary">{r.count}명</span>
                        <span className="block text-[12px] text-ink-faint">{total}명 중</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* 히트맵 */}
        <section className={card} aria-labelledby="heat-title">
          <h2 id="heat-title" className={sectionTitle}>
            시간별로 보기
          </h2>
          <p className="mt-1 mb-4 text-[15px] text-ink-faint">칸을 누르거나 누른 채 위아래로 끌어서 시간을 골라요.</p>
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

          {picked && total > 0 && (
            <dl className="mt-5 space-y-4 rounded-2xl bg-paper p-4 text-[15px]" aria-live="polite">
              <div>
                <dt className="font-semibold">
                  되는 사람 <span className="text-primary">{picked.yes.length}</span>명
                </dt>
                <dd className="mt-1 text-ink-soft">{picked.yes.length ? picked.yes.join(', ') : '없어요'}</dd>
              </div>
              <div>
                <dt className="font-semibold">안 되거나 일부만 되는 사람 {no.length}명</dt>
                <dd className="mt-1 text-ink-soft">{no.length ? no.join(', ') : '없어요'}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      {picked && (
        <BottomCTA
          note={
            <div className="px-1">
              <p className="text-[15px] font-semibold">{formatSlotRange(picked.date, picked.startTime, picked.endTime)}</p>
              <p
                className={`mt-0.5 text-[13px] ${action === 'error' ? 'font-semibold text-sun' : 'text-ink-faint'}`}
                aria-live="polite"
              >
                {action === 'error'
                  ? actionError
                  : pickedIsConfirmed
                    ? '지금 확정된 시간이에요.'
                    : `${formatDuration(picked.minutes)} · ${total}명 중 ${picked.yes.length}명 가능${c ? ' · 확정하면 기존 일정이 바뀌어요' : ''}`}
              </p>
            </div>
          }
        >
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || pickedIsConfirmed}
            className={`${pickedIsConfirmed ? btnSecondary : btnPrimary} w-full`}
          >
            {action === 'confirming'
              ? '확정하는 중…'
              : pickedIsConfirmed
                ? '확정된 시간이에요'
                : c
                  ? '이 시간으로 바꾸기'
                  : '이 시간으로 확정하기'}
          </button>
        </BottomCTA>
      )}
    </section>
  )
}
