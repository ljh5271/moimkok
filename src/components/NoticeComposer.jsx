import { useEffect, useRef, useState } from 'react'
import { useEventStore } from '../store/EventStore.jsx'
import { copyText } from '../utils/clipboard.js'
import { btnPrimary, btnSecondary, card, label, sectionTitle, textarea } from './styles.js'

const TONES = [
  { value: 'regular', label: '정기모임' },
  { value: 'event', label: 'MT·행사' },
  { value: 'official', label: '공식 공지' },
]

const ERROR_TEXT = {
  notConfigured: '공지문 기능을 아직 쓸 수 없어요. 서버에 Claude API 키가 설정되지 않았어요.',
  notConfirmed: '일정을 먼저 확정해 주세요.',
  badKey: '관리 링크가 올바르지 않아요.',
  invalid: '입력한 내용을 확인해 주세요.',
  network: '공지문을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
}

/** 확정된 일정으로 단톡방 공지문 초안 만들기. 관리 화면에서만 쓴다. */
export default function NoticeComposer({ eventId, adminKey }) {
  const { generateNotice } = useEventStore()
  const [tone, setTone] = useState('regular')
  const [extra, setExtra] = useState('')
  const [notice, setNotice] = useState('')
  const [status, setStatus] = useState('idle') // idle | generating | error
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  const resultRef = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function handleGenerate() {
    if (status === 'generating') return
    setStatus('generating')
    setError('')
    try {
      const data = await generateNotice(eventId, adminKey, { tone, extra })
      setNotice(data.notice)
      setStatus('idle')
      requestAnimationFrame(() => resultRef.current?.focus())
    } catch (err) {
      setStatus('error')
      setError(err.message && err.code === 'invalid' ? err.message : (ERROR_TEXT[err.code] ?? ERROR_TEXT.network))
    }
  }

  async function handleCopy() {
    if (!(await copyText(notice))) return
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  const generating = status === 'generating'

  return (
    <section className={card} aria-labelledby="notice-title">
      <h2 id="notice-title" className={sectionTitle}>
        공지문 쓰기
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-faint">
        확정된 일정과 응답 현황으로 단톡방에 올릴 초안을 써 드려요. 안 되는 사람 이름은 넣지 않아요.
      </p>

      <fieldset className="mt-5">
        <legend className={label}>말투</legend>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-paper p-1">
          {TONES.map((t) => (
            <label key={t.value} className="relative">
              <input
                type="radio"
                name="notice-tone"
                value={t.value}
                checked={tone === t.value}
                onChange={() => setTone(t.value)}
                className="peer sr-only"
              />
              <span className="flex h-11 cursor-pointer items-center justify-center rounded-xl text-[15px] font-semibold text-ink-faint transition peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.08)] peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="notice-extra" className={`${label} mt-5`}>
        더 넣을 내용 <span className="font-normal text-ink-faint">선택</span>
      </label>
      <textarea
        id="notice-extra"
        className={`${textarea} min-h-24 resize-none`}
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        placeholder={'장소: 학생회관 302호\n회비: 1만 원'}
        maxLength={300}
      />

      <button type="button" onClick={handleGenerate} disabled={generating} className={`${btnPrimary} mt-5 w-full`}>
        {generating ? '공지문 쓰는 중…' : notice ? '다시 쓰기' : '공지문 쓰기'}
      </button>
      {status === 'error' && (
        <p className="mt-3 text-[14px] font-medium text-sun" role="alert">
          {error}
        </p>
      )}

      {generating && !notice && (
        <div className="mt-5 animate-pulse space-y-2.5 rounded-2xl bg-paper p-4" aria-hidden>
          <div className="h-4 w-1/2 rounded bg-line" />
          <div className="h-4 w-5/6 rounded bg-line" />
          <div className="h-4 w-2/3 rounded bg-line" />
          <div className="h-4 w-3/4 rounded bg-line" />
        </div>
      )}

      {notice && (
        <div className="mt-5">
          <label htmlFor="notice-result" className={label}>
            초안 <span className="font-normal text-ink-faint">바로 고칠 수 있어요</span>
          </label>
          <textarea
            id="notice-result"
            ref={resultRef}
            className={`${textarea} min-h-72 ${generating ? 'opacity-50' : ''}`}
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
          />
          <button type="button" onClick={handleCopy} className={`${btnSecondary} mt-3 w-full`}>
            {copied ? '복사했어요' : '복사하기'}
          </button>
          <p className="sr-only" aria-live="polite">
            {copied ? '공지문을 복사했어요.' : ''}
          </p>
        </div>
      )}
    </section>
  )
}
