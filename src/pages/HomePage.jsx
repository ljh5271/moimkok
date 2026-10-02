import { Link } from 'react-router-dom'
import { btnPrimary } from '../components/styles.js'

// 장식용 미니 시간표: 형광펜으로 칠한 칸 모양
const PREVIEW = [
  '..##.',
  '.###.',
  '####.',
  '.###.',
  '..#..',
]

export default function HomePage() {
  return (
    <section className="pt-10">
      <div aria-hidden className="mb-10 grid w-fit grid-cols-5 gap-1">
        {PREVIEW.flatMap((row, r) =>
          [...row].map((c, i) => (
            <span
              key={`${r}-${i}`}
              className={`size-7 rounded-md border ${c === '#' ? 'border-mark-deep/40 bg-mark' : 'border-line bg-white'}`}
            />
          )),
        )}
      </div>

      <h1 className="text-[2rem] leading-tight font-extrabold tracking-tight">
        링크 하나로
        <br />
        모일 시간 정하기
      </h1>
      <p className="mt-4 max-w-[34ch] leading-relaxed text-ink-soft">
        후보 날짜를 정해 링크를 보내면, 멤버들이 가능한 시간을 칠해요. 로그인은 필요 없어요.
      </p>

      <Link to="/new" className={`${btnPrimary} mt-8 w-full sm:w-auto`}>
        새 행사 만들기
      </Link>
    </section>
  )
}
