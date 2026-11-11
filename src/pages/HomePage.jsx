import { Link } from 'react-router-dom'
import BottomCTA from '../components/BottomCTA.jsx'
import { btnGhost, btnPrimary, card, pageTitle } from '../components/styles.js'
import { useMyEvents } from '../store/EventStore.jsx'
import { groupSlots } from '../utils/results.js'
import { formatDateLong, formatSlotRange, formatTimeRange } from '../utils/time.js'

// 실제 사용 순서라서 번호를 붙인다
const STEPS = [
  { title: '후보 날짜와 시간대 정하기', body: '가능한 날짜를 누르고 시간대만 고르면 돼요.' },
  { title: '단톡방에 투표 링크 보내기', body: '멤버들은 로그인 없이 되는 시간을 칠해요.' },
  { title: '겹치는 시간으로 확정하기', body: '가장 많이 되는 시간을 골라 주고, 공지문 초안도 써 드려요.' },
]

function Intro() {
  return (
    <>
      <h1 className={pageTitle}>
        모임 날짜,
        <br />
        링크 하나로 정해요
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">동아리·학생회 일정을 투표로 모으고 공지까지 끝내요.</p>

      <ol className={`${card} mt-8 space-y-6`}>
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-weak text-[14px] font-bold text-primary"
            >
              {i + 1}
            </span>
            <div>
              <p className="text-[17px] font-semibold">{step.title}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-faint">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

/** 목록 한 줄의 둘째 줄: 확정 일시 → 내가 고른 시간 요약 → 투표 전 안내 순서로 보여준다 */
function describe(item) {
  const { event, voterName } = item
  if (event.confirmed) {
    return formatSlotRange(event.confirmed.date, event.confirmed.startTime, event.confirmed.endTime)
  }
  const mine = voterName ? event.responses.find((r) => r.name === voterName) : null
  if (!mine) return item.created ? `${event.responses.length}명 응답 · 아직 투표하지 않았어요` : '아직 투표하지 않았어요'
  const ranges = groupSlots(mine.slots, event.slotMinutes)
  if (ranges.length === 0) return '모든 시간이 어렵다고 투표했어요'
  const first = `${formatDateLong(ranges[0].date)} ${formatTimeRange(ranges[0].startTime, ranges[0].endTime)}`
  return `내 시간 · ${ranges.length === 1 ? first : `${first} 외 ${ranges.length - 1}개`}`
}

function MyEventRow({ item }) {
  if (item.status !== 'ready') {
    return (
      <li className="py-4">
        {item.status === 'error' ? (
          <>
            <p className="text-[17px] font-semibold">{item.name ?? '모임'}</p>
            <p className="mt-1 text-[14px] text-ink-faint">불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>
          </>
        ) : (
          <div className="animate-pulse" aria-label="모임을 불러오는 중">
            <div className="h-5 w-1/2 rounded bg-paper" />
            <div className="mt-2 h-4 w-3/4 rounded bg-paper" />
          </div>
        )}
      </li>
    )
  }

  const { event, voterName, adminKey } = item
  const voted = voterName && event.responses.some((r) => r.name === voterName)
  const to = voted ? `/e/${event.id}/done` : `/e/${event.id}`

  return (
    <li className="flex items-center gap-2">
      <Link
        to={to}
        state={voted ? { name: voterName } : undefined}
        className="-mx-2 min-w-0 flex-1 rounded-2xl px-2 py-4 transition active:bg-paper focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[17px] font-semibold">{event.name}</span>
          <span className={`shrink-0 text-[13px] font-semibold ${event.confirmed ? 'text-primary' : 'text-ink-faint'}`}>
            {event.confirmed ? '확정' : '투표 중'}
          </span>
        </span>
        <span className="mt-1 block truncate text-[14px] text-ink-soft">{describe(item)}</span>
        {item.created && <span className="mt-0.5 block text-[13px] text-ink-faint">내가 만든 모임</span>}
      </Link>
      {adminKey && (
        <Link to={`/e/${event.id}/admin?key=${adminKey}`} className={`${btnGhost} shrink-0`}>
          결과 보기
        </Link>
      )}
    </li>
  )
}

export default function HomePage() {
  const { items } = useMyEvents()

  return (
    <section className="pt-6 pb-36">
      {items.length === 0 ? (
        <Intro />
      ) : (
        <>
          <h1 className={pageTitle}>내 모임</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-faint">
            이 기기에서 만들거나 투표한 모임이에요. 다른 기기에서는 보이지 않아요.
          </p>
          <section className={`${card} mt-6 py-2`} aria-label="내 모임 목록">
            <h2 className="sr-only">내 모임 목록</h2>
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <MyEventRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        </>
      )}

      <BottomCTA>
        <Link to="/new" className={`${btnPrimary} w-full`}>
          새 모임 만들기
        </Link>
      </BottomCTA>
    </section>
  )
}
