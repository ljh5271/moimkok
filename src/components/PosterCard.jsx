import { useEffect, useRef, useState } from 'react'
import { POSTER_THEMES, drawPoster } from '../utils/poster.js'
import { btnPrimary, btnSecondary, card, label, sectionTitle } from './styles.js'

/**
 * 투표 장려 포스터 미리보기 + 저장·공유.
 * 글쓰기 카드(NoticeComposer)가 만든 머리말(parts)과 장소를 그대로 쓴다.
 */
export default function PosterCard({ event, parts, place, link }) {
  const [theme, setTheme] = useState('blue')
  const [url, setUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [status, setStatus] = useState('drawing') // drawing | ready | error
  const [feedback, setFeedback] = useState('')
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    setStatus('drawing')
    drawPoster({ event, parts, place, link, theme })
      .then((b) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(b)
        setBlob(b)
        setUrl(objectUrl)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [event, parts, place, link, theme])

  const fileName = `${event.name.replace(/[\\/:*?"<>|]/g, '')}-투표.png`
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null
  const canShareFile = Boolean(file && navigator.canShare?.({ files: [file] }))

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
    <section className={card} aria-labelledby="poster-title">
      <h2 id="poster-title" className={sectionTitle}>
        투표 포스터
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-faint">
        글과 함께 올릴 이미지예요. QR코드를 찍으면 바로 투표 화면이 열려요.
      </p>

      <fieldset className="mt-5">
        <legend className={label}>색</legend>
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

      <div className="mt-5 overflow-hidden rounded-2xl bg-paper" style={{ aspectRatio: '4 / 5' }}>
        {status === 'error' ? (
          <p className="grid h-full place-items-center text-[15px] text-ink-faint">이미지를 만들지 못했어요.</p>
        ) : url ? (
          <img
            src={url}
            alt={`${parts.title} 투표 포스터`}
            className={`h-full w-full object-cover transition-opacity ${status === 'drawing' ? 'opacity-60' : ''}`}
          />
        ) : (
          <div className="h-full w-full animate-pulse" aria-label="포스터를 만드는 중" />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <a
          href={url ?? undefined}
          download={fileName}
          aria-disabled={!url}
          onClick={() => url && flash('저장했어요')}
          className={`${canShareFile ? btnSecondary : btnPrimary} flex-1 ${url ? '' : 'pointer-events-none opacity-50'}`}
        >
          {feedback === '저장했어요' ? '저장했어요' : '이미지 저장'}
        </a>
        {canShareFile && (
          <button type="button" onClick={handleShare} className={`${btnPrimary} flex-1`}>
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
