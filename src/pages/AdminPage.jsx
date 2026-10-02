import { Link, useParams, useSearchParams } from 'react-router-dom'
import EventSummary from '../components/EventSummary.jsx'
import { btnSecondary, card } from '../components/styles.js'
import { useEvent } from '../store/EventStore.jsx'
import NotFoundPage from './NotFoundPage.jsx'

// 결과 히트맵·일정 확정은 다음 단계에서 이 화면에 추가한다. 지금은 링크 형식과 키 확인만.
export default function AdminPage() {
  const { eventId } = useParams()
  const [params] = useSearchParams()
  const event = useEvent(eventId)

  if (!event) return <NotFoundPage kind="event" />

  if (params.get('key') !== event.adminKey) {
    return (
      <section className="pt-16">
        <h1 className="text-2xl font-extrabold tracking-tight">관리 링크가 올바르지 않아요</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">행사를 만들 때 받은 관리 링크 전체를 그대로 열어 주세요.</p>
        <Link to={`/e/${event.id}`} className={`${btnSecondary} mt-8`}>
          투표 화면으로 가기
        </Link>
      </section>
    )
  }

  return (
    <section className="pt-4">
      <div className={card}>
        <EventSummary event={event} />
      </div>

      <h2 className="mt-8 font-bold">응답한 사람 {event.responses.length}명</h2>
      {event.responses.length === 0 ? (
        <p className="mt-2 text-ink-soft">아직 응답이 없어요. 투표 링크를 단톡방에 공유해 보세요.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {event.responses.map((r) => (
            <li key={r.name} className="rounded-full border border-line bg-white px-3 py-1 text-sm font-semibold">
              {r.name}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-ink-soft">시간대별 결과와 일정 확정 기능은 준비 중이에요.</p>
    </section>
  )
}
