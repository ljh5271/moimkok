import { useEffect, useRef, useState } from 'react'
import { useEventStore } from '../store/EventStore.jsx'
import { templatePoster } from '../utils/noticeFormat.js'
import { POSTER_THEMES, composeAiPoster, drawPoster } from '../utils/poster.js'
import { btnPrimary, btnSecondary, card, input, label, sectionTitle } from './styles.js'

const AI_ERROR = {
  notConfigured: 'AI 포스터를 쓰려면 서버에 Gemini API 키가 필요해요. 지금은 기본 포스터를 쓸 수 있어요.',
  badKey: '관리 링크가 올바르지 않아요.',
  busy: '요청이 몰렸어요. 1분쯤 뒤에 다시 만들어 주세요.',
  quota: 'Gemini 이미지 모델은 무료로 쓸 수 없어요. Google AI Studio에서 결제를 연결해 주세요. 그동안은 기본 포스터를 쓸 수 있어요.',
  noImage: '그림이 나오지 않았어요. 다시 만들어 주세요.',
  network: 'AI 포스터를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
}

/**
 * 투표 포스터 카드.
 * - 기본 포스터: 앱이 canvas로 바로 그린다 (무료, 색 3가지)
 * - AI 포스터: 버튼을 누르면 Gemini가 배경·큰 글자·낙서를 그리고, 앱이 날짜·장소 라벨과 QR코드를 얹는다 (유료, 10~30초)
 * 포스터 문구(큰 제목·작은 문구·키워드)는 공지 머리말(parts.poster)에서 오고, 직접 고칠 수 있다.
 */
export default function PosterCard({ event, parts, place, link, adminKey }) {
  const { generatePoster } = useEventStore()
  const [theme, setTheme] = useState('blue')
  const [copy, setCopy] = useState(() => parts.poster ?? templatePoster(event)) // 포스터 문구
  const [aiImage, setAiImage] = useState(null) // { mimeType, data } AI가 그린 원본 (라벨·QR 얹기 전)
  const [aiStatus, setAiStatus] = useState('idle') // idle | generating | error
  const [aiError, setAiError] = useState('')
  const [url, setUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [drawing, setDrawing] = useState(true)
  const [feedback, setFeedback] = useState('')
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  // 공지 머리말이 새로 써지면 포스터 문구도 따라간다 (AI 포스터를 아직 안 만들었을 때만)
  useEffect(() => {
    if (!aiImage) setCopy(parts.poster ?? templatePoster(event))
  }, [parts, event, aiImage])

  // 보여 줄 이미지 그리기: AI 그림이 있으면 그 위에 라벨·QR을, 없으면 기본 포스터
  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    setDrawing(true)
    const job = aiImage
      ? composeAiPoster({ event, image: aiImage, place, link })
      : drawPoster({ event, parts, place, link, theme })
    job
      .then((b) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(b)
        setBlob(b)
        setUrl(objectUrl)
        setDrawing(false)
      })
      .catch(() => !cancelled && setDrawing(false))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [event, parts, place, link, theme, aiImage])

  async function handleGenerate() {
    if (aiStatus === 'generating') return
    setAiStatus('generating')
    setAiError('')
    try {
      const image = await generatePoster(event.id, adminKey, copy)
      setAiImage(image)
      setAiStatus('idle')
    } catch (err) {
      setAiStatus('error')
      setAiError(err.code === 'model' || err.code === 'invalid' ? err.message : (AI_ERROR[err.code] ?? AI_ERROR.network))
    }
  }

  function setKeyword(i, v) {
    setCopy((c) => {
      const keywords = [...(c.keywords ?? [])]
      keywords[i] = v
      return { ...c, keywords }
    })
  }

  const fileName = `${event.name.replace(/[\\/:*?"<>|]/g, '')}-투표.png`
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null
  const canShareFile = Boolean(file && navigator.canShare?.({ files: [file] }))
  const generating = aiStatus === 'generating'
  const keywords = [...(copy.keywords ?? []), '', '', '', ''].slice(0, 4)

  function flash(msg) {
    setFeedback(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setFeedback(''), 2000)
  }

  async function handleShare() {
    try {
      await navigator.share({ files: [file] })
      flash('공유했어요')
    } catch {
      // 공유 창을 닫은 경우 등은 조용히 넘긴다
    }
  }

  return (
    <section className={card} aria-labelledby="poster-title" aria-busy={generating}>
      <h2 id="poster-title" className={sectionTitle}>
        투표 포스터
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-faint">
        글과 함께 올릴 이미지예요. QR코드를 찍으면 바로 투표 화면이 열려요.
      </p>

      {/* 미리보기 */}
      <div className="relative mt-5 overflow-hidden rounded-2xl bg-paper" style={{ aspectRatio: '4 / 5' }}>
        {url ? (
          <img
            src={url}
            alt={`${copy.headline} 투표 포스터`}
            className={`h-full w-full object-cover transition-opacity ${drawing || generating ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className="h-full w-full animate-pulse" aria-label="포스터를 만드는 중" />
        )}
        {generating && (
          <div className="absolute inset-0 grid place-items-center" role="status">
            <p className="rounded-2xl bg-ink/80 px-5 py-3 text-center text-[15px] leading-relaxed font-semibold text-white">
              AI가 포스터를 그리는 중이에요
              <br />
              <span className="text-[13px] font-normal text-white/80">20초쯤 걸려요</span>
            </p>
          </div>
        )}
      </div>

      {/* AI 포스터 */}
      <div className="mt-4">
        <button type="button" onClick={handleGenerate} disabled={generating} className={`${btnPrimary} w-full`}>
          {generating ? 'AI가 그리는 중…' : aiImage ? 'AI 포스터 다시 만들기' : 'AI 포스터 만들기'}
        </button>
        <p className="mt-2 text-center text-[13px] text-ink-faint">Gemini로 그려요 · 한 장에 약 50원 · 한글이 틀리면 다시 만들어 주세요</p>
        {aiStatus === 'error' && (
          <p className="mt-2 text-[14px] font-medium text-sun" role="alert">
            {aiError}
          </p>
        )}
      </div>

      {aiImage ? (
        <button
          type="button"
          onClick={() => setAiImage(null)}
          disabled={generating}
          className="mt-1 h-11 w-full rounded-2xl text-[15px] font-semibold text-ink-faint transition active:bg-paper disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
        >
          기본 포스터로 돌아가기
        </button>
      ) : (
        <fieldset className="mt-5">
          <legend className={label}>기본 포스터 색</legend>
          <div className="flex gap-2">
            {Object.entries(POSTER_THEMES).map(([key, t]) => (
              <label key={key} className="relative">
                <input
                  type="radio"
                  name="poster-theme"
                  value={key}
                  checked={theme === key}
                  onChange={() => setTheme(key)}
                  className="peer sr-only"
                />
                <span className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-paper px-3.5 text-[14px] font-semibold text-ink-soft transition peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                  {/* 포스터 색 견본: canvas 색이라 토큰이 아닌 인라인 색을 쓴다 */}
                  <span aria-hidden className="size-3.5 rounded-full" style={{ background: t.bg }} />
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* 포스터 문구 고치기 (AI 포스터용) */}
      <details className="group mt-5 rounded-2xl bg-paper">
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold text-ink-soft focus-visible:outline-2 focus-visible:outline-primary">
          AI 포스터 문구 고치기
          <span aria-hidden className="text-ink-faint transition group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="space-y-4 px-4 pb-4">
          <div>
            <label htmlFor="poster-headline" className={label}>
              큰 제목 <span className="font-normal text-ink-faint">2~6자가 잘 나와요</span>
            </label>
            <input
              id="poster-headline"
              className={`${input} bg-white`}
              value={copy.headline}
              onChange={(e) => setCopy((c) => ({ ...c, headline: e.target.value }))}
              maxLength={12}
            />
          </div>
          <div>
            <label htmlFor="poster-subhead" className={label}>
              작은 문구
            </label>
            <input
              id="poster-subhead"
              className={`${input} bg-white`}
              value={copy.subhead ?? ''}
              onChange={(e) => setCopy((c) => ({ ...c, subhead: e.target.value }))}
              maxLength={16}
              placeholder="졸업생과 함께하는"
            />
          </div>
          <fieldset>
            <legend className={label}>
              메모지 키워드 <span className="font-normal text-ink-faint">최대 4개</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {keywords.map((k, i) => (
                <input
                  key={i}
                  aria-label={`키워드 ${i + 1}`}
                  className={`${input} h-12 bg-white text-[15px]`}
                  value={k}
                  onChange={(e) => setKeyword(i, e.target.value)}
                  maxLength={14}
                />
              ))}
            </div>
          </fieldset>
          <p className="text-[13px] leading-relaxed text-ink-faint">고친 뒤 "AI 포스터 다시 만들기"를 누르면 반영돼요.</p>
        </div>
      </details>

      {/* 저장·공유 */}
      <div className="mt-4 flex gap-2">
        <a
          href={url ?? undefined}
          download={fileName}
          aria-disabled={!url}
          onClick={() => url && flash('저장했어요')}
          className={`${canShareFile ? btnSecondary : btnPrimary} flex-1 ${url && !generating ? '' : 'pointer-events-none opacity-50'}`}
        >
          {feedback === '저장했어요' ? '저장했어요' : '이미지 저장'}
        </a>
        {canShareFile && (
          <button type="button" onClick={handleShare} disabled={generating} className={`${btnPrimary} flex-1`}>
            {feedback === '공유했어요' ? '공유했어요' : '이미지 공유'}
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {feedback}
      </p>
    </section>
  )
}
