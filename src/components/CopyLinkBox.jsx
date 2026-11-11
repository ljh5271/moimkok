import { useEffect, useRef, useState } from 'react'
import { copyText } from '../utils/clipboard.js'
import { btnGhost } from './styles.js'

/** 링크 한 줄 + 복사 버튼. 카드 안에 넣어 쓴다. */
export default function CopyLinkBox({ title, help, url }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function handleCopy() {
    const ok = await copyText(url)
    if (!ok) return
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[14px] leading-relaxed text-ink-faint">{help}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={copied ? `${btnGhost} shrink-0 bg-primary-weak text-primary` : `${btnGhost} shrink-0`}
        >
          {copied ? '복사했어요' : '복사'}
        </button>
      </div>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        aria-label={`${title} 주소`}
        className="mt-3 h-11 w-full truncate rounded-xl bg-paper px-3.5 text-[14px] text-ink-soft focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <p className="sr-only" aria-live="polite">
        {copied ? `${title}를 복사했어요.` : ''}
      </p>
    </div>
  )
}
