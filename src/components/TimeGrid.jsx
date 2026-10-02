import { useRef, useState } from 'react'
import { formatDateShort, hourLabel, slotKey } from '../utils/time.js'

/**
 * 날짜(열) × 시간(행) 그리드. 드래그로 여러 칸을 한 번에 칠하거나 지운다.
 *
 * 동작 방식 (when2meet과 같음)
 * - 처음 누른 칸이 비어 있으면 '칠하기', 칠해져 있으면 '지우기' 모드가 되고 드래그 내내 유지된다.
 * - 시작 칸과 현재 칸을 꼭짓점으로 하는 직사각형 영역 전체에 적용한다.
 * - 마우스·터치 모두 Pointer Events로 처리. 터치는 손가락이 처음 닿은 요소로만 이벤트가 오기 때문에
 *   elementFromPoint로 현재 손가락 아래 칸을 찾는다.
 *
 * props
 * - dates: ["2026-10-07", ...], times: ["18:00", "18:30", ...], endTime: "22:00" (맨 아래 라벨)
 * - selected: Set<slotKey>, onChange(nextSet)
 * - disabled: 이름 입력 전 등 잠금 상태
 */
export default function TimeGrid({ dates, times, endTime, selected, onChange, disabled = false }) {
  const dragRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const shown = preview ?? selected

  function readCell(el) {
    const cell = el?.closest?.('[data-cell]')
    if (!cell) return null
    return { d: Number(cell.dataset.d), t: Number(cell.dataset.t) }
  }

  function applyDrag(drag, to) {
    const next = new Set(drag.base)
    const [d0, d1] = [Math.min(drag.from.d, to.d), Math.max(drag.from.d, to.d)]
    const [t0, t1] = [Math.min(drag.from.t, to.t), Math.max(drag.from.t, to.t)]
    for (let d = d0; d <= d1; d++) {
      for (let t = t0; t <= t1; t++) {
        const key = slotKey(dates[d], times[t])
        if (drag.mode === 'add') next.add(key)
        else next.delete(key)
      }
    }
    return next
  }

  function handlePointerDown(e) {
    if (disabled) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const cell = readCell(e.target)
    if (!cell) return
    e.preventDefault()
    const key = slotKey(dates[cell.d], times[cell.t])
    const drag = { mode: selected.has(key) ? 'remove' : 'add', from: cell, to: cell, base: new Set(selected) }
    dragRef.current = drag
    setPreview(applyDrag(drag, cell))
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e) {
    const drag = dragRef.current
    if (!drag) return
    const cell = readCell(document.elementFromPoint(e.clientX, e.clientY))
    if (!cell || (cell.d === drag.to.d && cell.t === drag.to.t)) return
    drag.to = cell
    setPreview(applyDrag(drag, cell))
  }

  function finishDrag() {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setPreview(null)
    onChange(applyDrag(drag, drag.to))
  }

  // 키보드: Tab으로 칸 이동, Space/Enter로 한 칸 토글
  function handleKeyDown(e, key) {
    if (disabled || (e.key !== ' ' && e.key !== 'Enter')) return
    e.preventDefault()
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  const columns = `3rem repeat(${dates.length}, minmax(2.75rem, 1fr))`

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <div
          role="grid"
          aria-label="가능한 시간 선택"
          aria-disabled={disabled || undefined}
          className={`grid select-none ${disabled ? 'opacity-40' : ''}`}
          style={{ gridTemplateColumns: columns, minWidth: `calc(3rem + ${dates.length} * 2.75rem)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
        >
          {/* 머리글: 날짜 */}
          <div role="row" className="contents">
            <div className="sticky left-0 z-10 bg-white" />
            {dates.map((date) => {
              const { md, dow, dowIndex } = formatDateShort(date)
              const color = dowIndex === 0 ? 'text-sun' : dowIndex === 6 ? 'text-sat' : 'text-ink'
              return (
                <div
                  key={date}
                  role="columnheader"
                  className="flex flex-col items-center py-2 leading-tight"
                >
                  <span className={`text-[11px] font-semibold ${color}`}>{dow}</span>
                  <span className="text-sm font-bold">{md}</span>
                </div>
              )
            })}
          </div>

          {/* 본문: 시간 행 */}
          {times.map((time, t) => {
            const onHour = time.endsWith(':00')
            const isLast = t === times.length - 1
            return (
              <div key={time} role="row" className="contents">
                <div
                  role="rowheader"
                  className="sticky left-0 z-10 bg-white pr-2 text-right text-[11px] leading-none font-semibold text-ink-soft"
                >
                  <span className="relative -top-1.5">{hourLabel(time)}</span>
                </div>
                {dates.map((date, d) => {
                  const key = slotKey(date, time)
                  const on = shown.has(key)
                  const { md, dow } = formatDateShort(date)
                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      data-cell
                      data-d={d}
                      data-t={t}
                      tabIndex={disabled ? -1 : 0}
                      aria-selected={on}
                      aria-label={`${md} ${dow}요일 ${time}`}
                      onKeyDown={(e) => handleKeyDown(e, key)}
                      className={[
                        'h-7 touch-none border-l border-line focus-visible:relative focus-visible:z-20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                        onHour ? 'border-t border-t-ink/20' : 'border-t border-t-line/70',
                        isLast ? 'border-b border-b-ink/20' : '',
                        on ? 'bg-mark' : 'bg-white',
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                      ].join(' ')}
                    />
                  )
                })}
              </div>
            )
          })}

          {/* 마지막 줄 아래 끝 시각 라벨 자리 */}
          <div className="sticky left-0 z-10 h-4 bg-white pr-2 text-right text-[11px] leading-none font-semibold text-ink-soft">
            <span className="relative -top-1.5">{endTime ? hourLabel(endTime) : ''}</span>
          </div>
          <div style={{ gridColumn: `span ${dates.length}` }} />
        </div>
      </div>
    </div>
  )
}
