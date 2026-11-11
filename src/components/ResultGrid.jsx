import { useRef } from 'react'
import { formatDateShort, hourLabel } from '../utils/time.js'

// 가능 인원 비율 → 파란색 농도 5단계 (Tailwind가 클래스를 찾을 수 있게 전부 문자열로 적는다)
// 진한 3단계는 글자를 흰색으로 바꿔 숫자가 잘 보이게 한다
const HEAT = ['bg-white', 'bg-primary/15', 'bg-primary/30', 'bg-primary/55 text-white', 'bg-primary/80 text-white', 'bg-primary text-white']

function heatClass(count, total) {
  if (count === 0 || total === 0) return HEAT[0]
  return HEAT[Math.max(1, Math.ceil((count / total) * 5))]
}

/**
 * 결과 히트맵 + 범위 선택. 투표 그리드(TimeGrid)와 같은 모양.
 *
 * - 칸 색이 진할수록 가능 인원이 많고, 숫자로도 인원을 표시한다 (색만으로 구분하지 않기).
 * - 최다 인원 칸은 진한 파랑 테두리로 표시한다.
 * - 칸을 누르면 한 칸, 누른 채 위아래로 끌면 같은 날짜 안에서 연속 범위를 고른다.
 *   다른 날짜 열로 끌어도 처음 누른 날짜에 고정된다.
 * - 키보드: Enter/Space로 한 칸 선택, Shift+Enter로 같은 날짜 안에서 범위 넓히기.
 *
 * props
 * - dates, times, endTime
 * - result: utils/results.js의 tally() 결과
 * - selection: { d, t0, t1 } | null, onSelect(selection)
 */
export default function ResultGrid({ dates, times, endTime, result, selection, onSelect }) {
  const dragRef = useRef(null)
  const total = result.names.length

  function readCell(el) {
    const cell = el?.closest?.('[data-cell]')
    if (!cell) return null
    return { d: Number(cell.dataset.d), t: Number(cell.dataset.t) }
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const cell = readCell(e.target)
    if (!cell) return
    e.preventDefault()
    dragRef.current = { d: cell.d, anchor: cell.t, last: cell.t }
    onSelect({ d: cell.d, t0: cell.t, t1: cell.t })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e) {
    const drag = dragRef.current
    if (!drag) return
    const cell = readCell(document.elementFromPoint(e.clientX, e.clientY))
    if (!cell || cell.t === drag.last) return
    drag.last = cell.t
    onSelect({ d: drag.d, t0: Math.min(drag.anchor, cell.t), t1: Math.max(drag.anchor, cell.t) })
  }

  function finishDrag() {
    dragRef.current = null
  }

  function handleKeyDown(e, d, t) {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (e.shiftKey && selection && selection.d === d) {
      onSelect({ d, t0: Math.min(selection.t0, t), t1: Math.max(selection.t1, t) })
    } else {
      onSelect({ d, t0: t, t1: t })
    }
  }

  const columns = `3rem repeat(${dates.length}, minmax(2.75rem, 1fr))`

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div
        role="grid"
        aria-label="시간대별 가능 인원"
        className="grid select-none"
        style={{ gridTemplateColumns: columns, minWidth: `calc(3rem + ${dates.length} * 2.75rem)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
      >
        <div role="row" className="contents">
          <div className="sticky left-0 z-10 bg-white" />
          {dates.map((date) => {
            const { md, dow, dowIndex } = formatDateShort(date)
            const color = dowIndex === 0 ? 'text-sun' : dowIndex === 6 ? 'text-sat' : 'text-ink'
            return (
              <div key={date} role="columnheader" className="flex flex-col items-center py-2 leading-tight">
                <span className={`text-[11px] font-semibold ${color}`}>{dow}</span>
                <span className="text-sm font-bold">{md}</span>
              </div>
            )
          })}
        </div>

        {times.map((time, t) => {
          const onHour = time.endsWith(':00')
          const isLast = t === times.length - 1
          return (
            <div key={time} role="row" className="contents">
              <div
                role="rowheader"
                className="sticky left-0 z-10 bg-white pr-2 text-right text-[11px] leading-none font-medium text-ink-faint"
              >
                <span className="relative -top-1.5">{hourLabel(time)}</span>
              </div>
              {dates.map((date, d) => {
                const count = result.available[d][t].size
                const isMax = count > 0 && count === result.maxCount
                const inSel = selection && selection.d === d && t >= selection.t0 && t <= selection.t1
                const selTop = inSel && t === selection.t0
                const selBottom = inSel && t === selection.t1
                const { md, dow } = formatDateShort(date)

                // 선택 범위는 진한 남색 테두리로 감싼다. 최다 칸 표시는 선택 범위 밖에서만.
                // shadow 클래스는 하나만 붙여야 서로 덮어쓰지 않는다
                const ring = inSel
                  ? selTop && selBottom
                    ? 'shadow-[inset_0_0_0_3px_var(--color-ink)]'
                    : selTop
                      ? 'shadow-[inset_3px_0_0_var(--color-ink),inset_-3px_0_0_var(--color-ink),inset_0_3px_0_var(--color-ink)]'
                      : selBottom
                        ? 'shadow-[inset_3px_0_0_var(--color-ink),inset_-3px_0_0_var(--color-ink),inset_0_-3px_0_var(--color-ink)]'
                        : 'shadow-[inset_3px_0_0_var(--color-ink),inset_-3px_0_0_var(--color-ink)]'
                  : isMax
                    ? 'shadow-[inset_0_0_0_2px_var(--color-primary-deep)]'
                    : ''

                return (
                  <button
                    key={date + time}
                    type="button"
                    role="gridcell"
                    data-cell
                    data-d={d}
                    data-t={t}
                    aria-selected={Boolean(inSel)}
                    aria-label={`${md} ${dow}요일 ${time}, ${total}명 중 ${count}명 가능${isMax ? ', 최다' : ''}`}
                    onKeyDown={(e) => handleKeyDown(e, d, t)}
                    className={[
                      'relative h-7 cursor-pointer touch-none border-l border-line text-[11px] leading-none font-bold focus-visible:z-20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                      onHour ? 'border-t border-t-ink/20' : 'border-t border-t-line/70',
                      isLast ? 'border-b border-b-ink/20' : '',
                      heatClass(count, total),
                      count > 0 && count / total <= 0.4 ? 'text-ink' : '',
                      ring,
                    ].join(' ')}
                  >
                    {count > 0 ? count : ''}
                  </button>
                )
              })}
            </div>
          )
        })}

        <div className="sticky left-0 z-10 h-4 bg-white pr-2 text-right text-[11px] leading-none font-medium text-ink-faint">
          <span className="relative -top-1.5">{endTime ? hourLabel(endTime) : ''}</span>
        </div>
        <div style={{ gridColumn: `span ${dates.length}` }} />
      </div>
    </div>
  )
}

/** 색 농도 범례 */
export function HeatLegend({ total }) {
  if (total === 0) return null
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-faint" aria-hidden>
      <span>0명</span>
      <span className="flex overflow-hidden rounded">
        {HEAT.map((c) => (
          <span key={c} className={`h-3 w-5 ${c} ${c === 'bg-white' ? 'bg-paper' : ''}`} />
        ))}
      </span>
      <span>{total}명</span>
      <span className="ml-2 inline-block size-3 rounded-sm bg-primary shadow-[inset_0_0_0_2px_var(--color-primary-deep)]" />
      <span>최다</span>
    </div>
  )
}
