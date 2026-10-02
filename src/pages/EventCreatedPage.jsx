import { Link, useParams } from 'react-router-dom'
import CopyLinkBox from '../components/CopyLinkBox.jsx'
import EventSummary from '../components/EventSummary.jsx'
import { btnPrimary, card } from '../components/styles.js'
import { useEvent } from '../store/EventStore.jsx'
import NotFoundPage from './NotFoundPage.jsx'

export default function EventCreatedPage() {
  const { eventId } = useParams()
  const event = useEvent(eventId)

  if (!event) return <NotFoundPage kind="event" />

  const origin = window.location.origin
  const voteUrl = `${origin}/e/${event.id}`
  const adminUrl = `${origin}/e/${event.id}/admin?key=${event.adminKey}`

  return (
    <section className="pt-4">
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-mark px-3 py-1 text-sm font-bold">
        행사를 만들었어요
      </p>

      <div className={card}>
        <EventSummary event={event} />
      </div>

      <div className="mt-6 space-y-3">
        <CopyLinkBox title="투표 링크" help="단톡방에 올려서 멤버들에게 보내세요." url={voteUrl} />
        <CopyLinkBox
          title="관리 링크"
          help="결과를 보고 일정을 확정할 때 써요. 운영진끼리만 보관하세요."
          url={adminUrl}
        />
      </div>

      <Link to={`/e/${event.id}`} className={`${btnPrimary} mt-8 w-full`}>
        투표 화면 열기
      </Link>

      <p className="mt-6 text-sm leading-relaxed text-ink-soft">
        지금은 저장 기능이 없는 테스트 버전이라, 새로고침하면 행사가 사라지고 다른 기기에서는 링크가 열리지 않아요.
      </p>
    </section>
  )
}
