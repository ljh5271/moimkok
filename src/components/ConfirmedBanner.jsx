import { formatSlotRange } from '../utils/time.js'

/** 확정된 일정 안내. 참여자 화면과 관리 화면에서 같이 쓴다. children 자리에 버튼 등을 넣는다. */
export default function ConfirmedBanner({ confirmed, children }) {
  if (!confirmed) return null
  return (
    <div className="rounded-2xl border-2 border-mark-deep bg-mark/30 p-5" role="status">
      <p className="text-sm font-bold text-ink-soft">일정이 확정됐어요</p>
      <p className="mt-1 text-lg leading-snug font-extrabold">
        {formatSlotRange(confirmed.date, confirmed.startTime, confirmed.endTime)}
      </p>
      {children}
    </div>
  )
}
