import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEventStore } from '../store/EventStore.jsx'
import { copyText } from '../utils/clipboard.js'
import { composeNotice, confirmedStats, templateParts } from '../utils/noticeFormat.js'
import { btnPrimary, btnSecondary, card, input, label, sectionTitle, textarea } from './styles.js'

const TONES = [
  { value: 'regular', label: '정기모임' },
  { value: 'event', label: 'MT·행사' },
  { value: 'official', label: '공식 공지' },
]

// 브라우저가 공유 창(카톡 등)을 지원하는지. 휴대폰 브라우저 대부분이 지원한다
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

/**
 * 단톡방에 올릴 글 쓰기 카드.
 * - kind 'invite': 모임을 만든 직후 모집·투표 글. 글 끝에 투표 링크(link)를 붙인다.
 * - kind 'confirm': 일정 확정 공지. 참석 가능 인원 줄을 붙인다.
 * AI는 머리말(이모지·제목·소개)만 쓰고, ▫️정보 줄과 링크는 utils/noticeFormat.js가 붙인다.
 * 장소·더 넣을 내용은 바꾸는 즉시 글에 반영되고, AI는 말투를 바꾸거나 "다시 쓰기"를 누를 때만 부른다.
 * AI를 쓸 수 없으면(키 없음·오류·관리키 없음) 기본 머리말로 채우고 그 사실을 알린다.
 * onPartsChange({ parts, place })로 머리말을 부모에 알린다 (포스터 이미지용).
 */
export default function NoticeComposer({
  event,
  adminKey,
  kind = 'confirm',
  link = '',
  autoGenerate = false,
  title,
  description,
  extraPlaceholder,
  onPartsChange,
}) {
  const { generateNotice } = useEventStore()
  const [tone, setTone] = useState('regular')
  const [place, setPlace] = useState('')
  const [extra, setExtra] = useState('')
  const [parts, setParts] = useState(null) // { emoji, title, intro }
  const [stats, setStats] = useState(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | generating | error
  const [note, setNote] = useState('') // 기본 머리말로 채웠을 때 안내
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('') // 복사했어요 / 공유했어요
  const timer = useRef(null)
  const autoRan = useRef(false)
  const resultRef = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  // 머리말·장소·더 넣을 내용이 바뀌면 글을 다시 조립한다 (손으로 고친 글은 이때 새로 바뀐다)
  useEffect(() => {
    if (!parts) return
    setText(composeNotice({ parts, event, kind, place, extra, stats: stats ?? confirmedStats(event), link }))
  }, [parts, event, kind, place, extra, stats, link])

  useEffect(() => {
    if (parts) onPartsChange?.({ parts, place })
  }, [parts, place, onPartsChange])

  // 결과 글상자를 내용 길이에 맞춰 늘려서 스크롤 없이 전체가 보이게 한다
  useLayoutEffect(() => {
    const el = resultRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [text])

  async function generate(nextTone = tone) {
    if (status === 'generating') return
    setStatus('generating')
    setError('')
    setNote('')
    const fallback = (why) => {
      setParts(templateParts(event, kind, nextTone))
      setNote(why)
      setStatus('idle')
    }

    // 관리키가 없는 기기에서는 서버가 거절하므로 바로 기본 머리말을 쓴다
    if (!adminKey) return fallback('이 기기에는 관리 링크가 없어서 기본 문구로 채웠어요.')

    try {
      const data = await generateNotice(event.id, adminKey, { kind, tone: nextTone, extra, place })
      setParts(data.parts)
      setStats(data.stats)
      setStatus('idle')
    } catch (err) {
      if (err.code === 'badKey') {
        setStatus('error')
        setError('관리 링크가 올바르지 않아요.')
      } else if (err.code === 'invalid') {
        setStatus('error')
        setError(err.message || '입력한 내용을 확인해 주세요.')
      } else if (err.code === 'notConfigured') {
        fallback('AI 글쓰기가 아직 설정되지 않아서 기본 문구로 채웠어요.')
      } else {
        fallback('AI 글쓰기에 실패해서 기본 문구로 채웠어요. 잠시 후 다시 써 볼 수 있어요.')
      }
    }
  }

  // 모임을 만든 직후에는 들어오자마자 한 번 써 둔다
  useEffect(() => {
    if (!autoGenerate || autoRan.current || !event) return
    autoRan.current = true
    generate('regular')
    // generate는 렌더마다 새로 만들어지지만 처음 한 번만 실행하므로 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, event])

  function changeTone(next) {
    setTone(next)
    // 이미 글이 있으면 말투를 바꾸는 즉시 머리말을 다시 쓴다
    if (parts) generate(next)
  }

  function flash(msg) {
    setFeedback(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setFeedback(''), 2000)
  }

  async function handleCopy() {
    if (await copyText(text)) flash('복사했어요')
  }

  async function handleShare() {
    try {
      await navigator.share({ text })
      flash('공유했어요')
    } catch (err) {
      // 사용자가 공유 창을 닫은 경우(AbortError)는 조용히 넘긴다
      if (err?.name !== 'AbortError' && (await copyText(text))) flash('공유 대신 복사했어요')
    }
  }

  const generating = status === 'generating'
  const id = (name) => `notice-${name}-${kind}`

  return (
    <section className={card} aria-labelledby={id('title')} aria-busy={generating}>
      <h2 id={id('title')} className={sectionTitle}>
        {title}
      </h2>
      {description && <p className="mt-1 text-[15px] leading-relaxed text-ink-faint">{description}</p>}

      <fieldset className="mt-5" disabled={generating}>
        <legend className={label}>말투</legend>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-paper p-1">
          {TONES.map((t) => (
            <label key={t.value} className="relative">
              <input
                type="radio"
                name={id('tone')}
                value={t.value}
                checked={tone === t.value}
                onChange={() => changeTone(t.value)}
                className="peer sr-only"
              />
              <span className="flex h-11 cursor-pointer items-center justify-center rounded-xl text-[15px] font-semibold text-ink-faint transition peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.08)] peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor={id('place')} className={`${label} mt-5`}>
        장소 <span className="font-normal text-ink-faint">비우면 "미정"</span>
      </label>
      <input
        id={id('place')}
        className={input}
        value={place}
        onChange={(e) => setPlace(e.target.value)}
        placeholder="제1학생회관 302호"
        maxLength={40}
        autoComplete="off"
      />

      <label htmlFor={id('extra')} className={`${label} mt-5`}>
        더 넣을 내용 <span className="font-normal text-ink-faint">한 줄에 하나씩</span>
      </label>
      <textarea
        id={id('extra')}
        className={`${textarea} min-h-20 resize-none`}
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        placeholder={extraPlaceholder}
        maxLength={300}
      />

      {/* 결과 */}
      <div className="mt-5" aria-live="polite">
        {generating && !parts ? (
          <div className="animate-pulse space-y-2.5 rounded-2xl bg-paper p-4" aria-label="글을 쓰는 중">
            <div className="h-4 w-1/2 rounded bg-line" />
            <div className="h-4 w-5/6 rounded bg-line" />
            <div className="h-4 w-2/3 rounded bg-line" />
            <div className="h-4 w-3/4 rounded bg-line" />
          </div>
        ) : parts ? (
          <>
            <label htmlFor={id('result')} className={label}>
              올릴 글 <span className="font-normal text-ink-faint">바로 고칠 수 있어요</span>
            </label>
            <textarea
              id={id('result')}
              ref={resultRef}
              className={`${textarea} min-h-40 resize-none overflow-hidden ${generating ? 'opacity-50' : ''}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {note && <p className="mt-2 text-[14px] text-ink-faint">{note}</p>}
          </>
        ) : null}
      </div>

      {status === 'error' && (
        <p className="mt-3 text-[14px] font-medium text-sun" role="alert">
          {error}
        </p>
      )}

      {parts ? (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button type="button" onClick={handleCopy} className={`${canShare ? btnSecondary : btnPrimary} flex-1`}>
              {feedback === '복사했어요' ? '복사했어요' : '복사하기'}
            </button>
            {canShare && (
              <button type="button" onClick={handleShare} className={`${btnPrimary} flex-1`}>
                {feedback === '공유했어요' ? '공유했어요' : '공유하기'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => generate()}
            disabled={generating}
            className="h-11 w-full rounded-2xl text-[15px] font-semibold text-ink-faint transition active:bg-paper disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            {generating ? '다시 쓰는 중…' : '소개 문장 다시 쓰기'}
          </button>
          <p className="sr-only" aria-live="polite">
            {feedback}
          </p>
        </div>
      ) : (
        !generating && (
          <button type="button" onClick={() => generate()} className={`${btnPrimary} mt-1 w-full`}>
            글 쓰기
          </button>
        )
      )}
    </section>
  )
}
