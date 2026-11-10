import { Link } from 'react-router-dom'
import { btnSecondary } from '../components/styles.js'

const COPY = {
  page: {
    title: '없는 페이지예요',
    body: '주소를 다시 확인해 주세요.',
  },
  event: {
    title: '행사를 찾을 수 없어요',
    body: '링크 주소가 잘못됐거나 삭제된 행사예요. 링크를 보낸 운영진에게 다시 확인해 주세요.',
  },
}

export default function NotFoundPage({ kind = 'page' }) {
  const { title, body } = COPY[kind]
  return (
    <section className="pt-16">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-[38ch] leading-relaxed text-ink-soft">{body}</p>
      <Link to="/new" className={`${btnSecondary} mt-8`}>
        새 행사 만들기
      </Link>
    </section>
  )
}
