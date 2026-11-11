import { Link, useParams } from 'react-router-dom'
import CopyLinkBox from '../components/CopyLinkBox.jsx'
import EventSummary from '../components/EventSummary.jsx'
import { EventSkeleton, LoadError } from '../components/LoadState.jsx'
import BottomCTA from '../components/BottomCTA.jsx'
import { btnPrimary, btnSecondary, card, pageTitle } from '../components/styles.js'
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
    <section className="pt-6 pb-36">
      <h1 className={pageTitle}>
        모임을 만들었어요
        <br />
        이제 링크를 보내 주세요
      </h1>

      <div className="mt-8 space-y-3">
        {status === 'loading' ? (
          <EventSkeleton />
        ) : (
          <div className={card}>
            <EventSummary event={event} headingLevel="h2" />
          </div>
        )}

        <div className={`${card} space-y-6`}>
          <CopyLinkBox title="투표 링크" help="단톡방에 올려서 멤버들에게 보내요." url={voteUrl} />
          <div className="h-px bg-line" />
          {adminUrl ? (
            <CopyLinkBox
              title="관리 링크"
              help="결과를 보고 일정을 확정할 때 써요. 운영진끼리만 보관하고, 잃어버리면 다시 볼 수 없어요."
              url={adminUrl}
            />
          ) : (
            <div>
              <p className="text-[17px] font-semibold">관리 링크</p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-ink-faint">
                관리 링크는 모임을 만든 기기에서만 볼 수 있어요. 그때 복사해 둔 링크를 써 주세요.
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomCTA>
        <div className="flex gap-2">
          {adminUrl && (
            <Link to={`/e/${eventId}/admin?key=${adminKey}`} className={`${btnSecondary} flex-1`}>
              결과 보기
            </Link>
          )}
          <Link to={`/e/${eventId}`} className={`${btnPrimary} flex-[2]`}>
            나도 투표하기
          </Link>
        </div>
      </BottomCTA>
    </section>
  )
}
