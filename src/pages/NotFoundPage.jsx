import { Link } from 'react-router-dom'
import { btnSecondary, pageTitle } from '../components/styles.js'

const COPY = {
  page: {
    title: '없는 페이지예요',
    body: '주소를 다시 확인해 주세요.',
  },
  event: {
    title: '모임을 찾을 수 없어요',
    body: '링크가 잘못됐거나 삭제된 모임이에요. 링크를 보낸 운영진에게 다시 확인해 주세요.',
  },
}

export default function NotFoundPage({ kind = 'page' }) {
  const { title, body } = COPY[kind]
  return (
    <section className="pt-16">
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{body}</p>
      <Link to="/new" className={`${btnSecondary} mt-8`}>
        새 모임 만들기
      </Link>
    </section>
  )
}
