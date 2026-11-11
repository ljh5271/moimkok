import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ConfirmedBanner from '../components/ConfirmedBanner.jsx'
import EventSummary from '../components/EventSummary.jsx'
import { EventSkeleton, LoadError } from '../components/LoadState.jsx'
import TimeGrid from '../components/TimeGrid.jsx'
import BottomCTA from '../components/BottomCTA.jsx'
import { btnGhost, btnPrimary, btnSecondary, card, errorText, input, sectionTitle } from '../components/styles.js'
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
  if (loadStatus === 'loading') return <div className="pt-6"><EventSkeleton /></div>

  const times = buildTimeSlots(event.startTime, event.endTime, event.slotMinutes)

  function handleStart(e) {
    e.preventDefault()
    const name = nameInput.trim()
    if (!name) {
      setNameError('이름을 입력해 주세요.')
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
    idle: '되는 시간을 칠한 뒤 저장해 주세요.',
    dirty: '바뀐 내용이 있어요. 다시 저장해 주세요.',
    saving: '저장하고 있어요.',
    saved: '저장했어요. 고치려면 칠한 뒤 다시 저장해 주세요.',
    error: '저장하지 못했어요. 다시 눌러 주세요.',
  }[status]

  return (
    <section className={`pt-6 ${voter !== null ? 'pb-44' : 'pb-16'}`}>
      <div className="space-y-3">
        <div className={card}>
          <EventSummary event={event} />
          <p className="mt-4 text-[14px] text-ink-faint">지금까지 {event.responses.length}명이 응답했어요</p>
        </div>

        {event.confirmed && (
          <ConfirmedBanner confirmed={event.confirmed}>
            <p className="mt-2 text-[14px] text-white/80">투표는 계속할 수 있지만 운영진이 이미 일정을 정했어요.</p>
          </ConfirmedBanner>
        )}

        <div className={card}>
          {voter === null ? (
            <form onSubmit={handleStart} noValidate>
              <label htmlFor="voter-name" className={sectionTitle}>
                이름을 알려 주세요
              </label>
              <p id="voter-name-help" className="mt-1 mb-4 text-[15px] text-ink-faint">
                이미 응답했다면 같은 이름으로 들어와서 고칠 수 있어요.
              </p>
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
              {nameError && (
                <p id="voter-name-error" className={errorText}>
                  {nameError}
                </p>
              )}
              <button type="submit" className={`${btnPrimary} mt-4 w-full`}>
                시간 고르기
              </button>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={sectionTitle}>{voter}님, 언제 되세요?</h2>
                  <p className="mt-1 text-[15px] text-ink-faint">누른 채로 끌면 여러 칸을 한 번에 칠하거나 지워요.</p>
                </div>
                <button type="button" onClick={handleChangeName} disabled={saving} className={`${btnGhost} shrink-0`}>
                  이름 바꾸기
                </button>
              </div>
            </>
          )}

          <div className="mt-5">
            <TimeGrid
              dates={event.dates}
              times={times}
              endTime={event.endTime}
              selected={selected}
              onChange={handleGridChange}
              disabled={voter === null || saving}
            />
          </div>
        </div>
      </div>

      {voter !== null && (
        <BottomCTA
          note={
            <div className="flex items-baseline justify-between gap-3 px-1">
              <p className="text-[15px] font-semibold">
                {selected.size === 0 ? '아직 고른 시간이 없어요' : `${formatDuration(selected.size * event.slotMinutes)} 골랐어요`}
              </p>
              <p
                className={`text-right text-[13px] ${status === 'error' ? 'font-semibold text-sun' : 'text-ink-faint'}`}
                aria-live="polite"
              >
                {statusText}
              </p>
            </div>
          }
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={status === 'saved' || saving}
            className={`${status === 'saved' ? btnSecondary : btnPrimary} w-full`}
          >
            {status === 'saved' ? '저장했어요' : saving ? '저장하는 중…' : '저장하기'}
          </button>
        </BottomCTA>
      )}
    </section>
  )
}
