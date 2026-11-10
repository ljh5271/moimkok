import { Link, useParams } from 'react-router-dom'
import CopyLinkBox from '../components/CopyLinkBox.jsx'
import EventSummary from '../components/EventSummary.jsx'
import { EventSkeleton, LoadError } from '../components/LoadState.jsx'
import { btnPrimary, card } from '../components/styles.js'
import { useEvent } from '../store/EventStore.jsx'
import { getAdminKey } from '../utils/adminKeys.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function EventCreatedPage() {
  const { eventId } = useParams()
  const { event, status, reload } = useEvent(eventId)

  if (status === 'notFound') return <NotFoundPage kind="event" />
  if (status === 'error') return <LoadError onRetry={reload} />

  const origin = window.location.origin
  const voteUrl = `${origin}/e/${eventId}`
  // 관리키는 서버에서 다시 받아올 수 없다. 만든 기기의 localStorage에만 있다.
  const adminKey = getAdminKey(eventId)
  const adminUrl = adminKey ? `${origin}/e/${eventId}/admin?key=${adminKey}` : null

  return (
    <section className="pt-4">
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-mark px-3 py-1 text-sm font-bold">
        행사를 만들었어요
      </p>

      {status === 'loading' ? (
        <EventSkeleton />
      ) : (
        <div className={card}>
          <EventSummary event={event} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        <CopyLinkBox title="투표 링크" help="단톡방에 올려서 멤버들에게 보내세요." url={voteUrl} />
        {adminUrl ? (
          <CopyLinkBox
            title="관리 링크"
            help="결과를 보고 일정을 확정할 때 써요. 운영진끼리만 보관하세요. 잃어버리면 다시 볼 수 없어요."
            url={adminUrl}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="font-bold">관리 링크</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              관리 링크는 행사를 만든 기기에서만 볼 수 있어요. 그때 복사해 둔 링크를 사용하세요.
            </p>
          </div>
        )}
      </div>

      <Link to={`/e/${eventId}`} className={`${btnPrimary} mt-8 w-full`}>
        투표 화면 열기
      </Link>
    </section>
  )
}
