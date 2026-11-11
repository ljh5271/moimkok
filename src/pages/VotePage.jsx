import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ConfirmedBanner from '../components/ConfirmedBanner.jsx'
import EventSummary from '../components/EventSummary.jsx'
import { EventSkeleton, LoadError } from '../components/LoadState.jsx'
import TimeGrid from '../components/TimeGrid.jsx'
import { btnPrimary, btnSecondary, errorText, input } from '../components/styles.js'
import { useEvent, useEventStore } from '../store/EventStore.jsx'
import { buildTimeSlots, formatDuration } from '../utils/time.js'
import NotFoundPage from './NotFoundPage.jsx'


export default function VotePage() {
  const { eventId } = useParams()
  const { event, status: loadStatus, reload } = useEvent(eventId)
  const { saveResponse } = useEventStore()

  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [voter, setVoter] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  // idle: 아직 저장 안 함 / dirty: 저장 후 수정함 / saving: 저장 중 / saved: 저장 완료 / error: 저장 실패
  const [status, setStatus] = useState('idle')

  if (loadStatus === 'notFound') return <NotFoundPage kind="event" />
  if (loadStatus === 'error') return <LoadError onRetry={reload} />
  if (loadStatus === 'loading') return <div className="pt-4"><EventSkeleton /></div>

  const times = buildTimeSlots(event.startTime, event.endTime, event.slotMinutes)

  function handleStart(e) {
    e.preventDefault()
    const name = nameInput.trim()
    if (!name) {
      setNameError('이름을 입력하세요.')
      return
    }
    const existing = event.responses.find((r) => r.name === name)
    setSelected(new Set(existing?.slots ?? []))
    setStatus(existing ? 'saved' : 'idle')
    setNameError('')
    setVoter(name)
  }

  function handleChangeName() {
    setVoter(null)
    setSelected(new Set())
    setStatus('idle')
  }

  function handleGridChange(next) {
    setSelected(next)
    setStatus((s) => (s === 'idle' ? 'idle' : 'dirty'))
  }

  async function handleSave() {
    if (status === 'saving') return
    setStatus('saving')
    try {
      await saveResponse(event.id, voter, selected)
      setStatus('saved')
    } catch {
      // 칠한 칸은 그대로 두고 다시 저장할 수 있게 한다
      setStatus('error')
    }
  }

  const saving = status === 'saving'

  const statusText = {
    idle: '가능한 시간을 칠한 뒤 저장하세요.',
    dirty: '바뀐 내용이 있어요. 다시 저장하세요.',
    saving: '저장하는 중이에요.',
    saved: '저장했어요. 수정하려면 칠한 뒤 다시 저장하세요.',
    error: '저장하지 못했어요. 다시 저장하세요.',
  }[status]

  return (
    <section className="pt-4">
      <EventSummary event={event} />
      <p className="mt-3 text-sm text-ink-soft">지금까지 {event.responses.length}명 응답</p>
      {event.confirmed && (
        <div className="mt-4">
          <ConfirmedBanner confirmed={event.confirmed}>
            <p className="mt-2 text-sm text-ink-soft">투표는 계속할 수 있지만 운영진이 이미 일정을 정했어요.</p>
          </ConfirmedBanner>
        </div>
      )}

      <div className="mt-8">
        {voter === null ? (
          <form onSubmit={handleStart} noValidate>
            <label htmlFor="voter-name" className="mb-2 block font-bold">
              이름
            </label>
            <div className="flex gap-2">
              <input
                id="voter-name"
                className={input}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="단톡방에서 쓰는 이름"
                maxLength={20}
                autoComplete="name"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'voter-name-error' : 'voter-name-help'}
              />
              <button type="submit" className={`${btnPrimary} shrink-0`}>
                시작
              </button>
            </div>
            {nameError ? (
              <p id="voter-name-error" className={errorText}>
                {nameError}
              </p>
            ) : (
              <p id="voter-name-help" className="mt-2 text-sm text-ink-soft">
                이미 응답했다면 같은 이름을 입력해서 수정할 수 있어요.
              </p>
            )}
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold">
              {voter}님이 가능한 시간
            </p>
            <button
              type="button"
              onClick={handleChangeName}
              disabled={saving}
              className="rounded text-sm font-semibold text-ink-soft underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
            >
              이름 바꾸기
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        {voter !== null && (
          <p className="mb-3 text-sm text-ink-soft">칸을 누른 채로 끌면 여러 칸을 한 번에 칠하거나 지울 수 있어요.</p>
        )}
        <TimeGrid
          dates={event.dates}
          times={times}
          endTime={event.endTime}
          selected={selected}
          onChange={handleGridChange}
          disabled={voter === null || saving}
        />
      </div>

      {voter !== null && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {selected.size === 0 ? '선택 없음' : `${formatDuration(selected.size * event.slotMinutes)} 선택`}
              </p>
              <p className={`text-sm ${status === 'error' ? 'font-semibold text-sun' : 'text-ink-soft'}`} aria-live="polite">
                {statusText}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={status === 'saved' || saving}
              className={status === 'saved' ? `${btnSecondary} shrink-0 opacity-70` : `${btnPrimary} shrink-0`}
            >
              {status === 'saved' ? '저장됨' : saving ? '저장하는 중…' : '저장하기'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
