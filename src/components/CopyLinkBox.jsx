import { useEffect, useRef, useState } from 'react'
import { copyText } from '../utils/clipboard.js'

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
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{help}</p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          aria-label={`${title} 주소`}
          className="min-w-0 flex-1 truncate rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink-soft focus:outline-none focus:ring-2 focus:ring-mark"
        />
        <button
          type="button"
          onClick={handleCopy}
          className={`h-11 shrink-0 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            copied ? 'bg-mark text-ink' : 'bg-ink text-white'
          }`}
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? `${title}를 복사했어요.` : ''}
      </p>
    </div>
  )
}
