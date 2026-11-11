import { Link } from 'react-router-dom'
import BottomCTA from '../components/BottomCTA.jsx'
import { btnPrimary, card, pageTitle } from '../components/styles.js'

// 실제 사용 순서라서 번호를 붙인다
const STEPS = [
  { title: '후보 날짜와 시간대 정하기', body: '가능한 날짜를 누르고 시간대만 고르면 돼요.' },
  { title: '단톡방에 투표 링크 보내기', body: '멤버들은 로그인 없이 되는 시간을 칠해요.' },
  { title: '겹치는 시간으로 확정하기', body: '가장 많이 되는 시간을 골라 주고, 공지문 초안도 써 드려요.' },
]

export default function HomePage() {
  return (
    <section className="pt-6 pb-36">
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

      <BottomCTA>
        <Link to="/new" className={`${btnPrimary} w-full`}>
          새 모임 만들기
        </Link>
      </BottomCTA>
    </section>
  )
}
