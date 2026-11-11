import { formatSlotRange } from '../utils/time.js'

/** 확정된 일정 안내. 참여자 화면과 관리 화면에서 같이 쓴다. children 자리에 버튼 등을 넣는다. */
export default function ConfirmedBanner({ confirmed, children }) {
  if (!confirmed) return null
  return (
    <div className="rounded-3xl bg-primary p-6 text-white" role="status">
      <p className="text-[15px] font-medium text-white/80">일정이 확정됐어요</p>
      <p className="mt-1 text-[21px] leading-snug font-bold tracking-[-0.02em]">
        {formatSlotRange(confirmed.date, confirmed.startTime, confirmed.endTime)}
      </p>
      {children}
    </div>
  )
}
