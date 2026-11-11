import { btnSecondary, card, pageTitle } from './styles.js'

/** 행사 정보를 불러오는 동안 요약 카드 자리에 보여주는 스켈레톤 */
export function EventSkeleton() {
  return (
    <div className={`${card} animate-pulse`} role="status" aria-label="모임 정보를 불러오는 중">
      <div className="h-7 w-2/3 rounded-lg bg-paper" />
      <div className="mt-3 h-4 w-1/2 rounded bg-paper" />
      <div className="mt-5 space-y-2">
        <div className="h-4 w-5/6 rounded bg-paper" />
        <div className="h-4 w-3/5 rounded bg-paper" />
      </div>
    </div>
  )
}

/** 네트워크 오류 등으로 불러오지 못했을 때 */
export function LoadError({ onRetry }) {
  return (
    <section className="pt-16" role="alert">
      <h1 className={pageTitle}>불러오지 못했어요</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        인터넷 연결을 확인하고 다시 시도해 주세요.
      </p>
      <button type="button" onClick={onRetry} className={`${btnSecondary} mt-8`}>
        다시 시도하기
      </button>
    </section>
  )
}
