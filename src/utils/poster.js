// 투표 장려 포스터를 canvas로 그린다 (1080×1350, 인스타·카톡에 맞는 4:5 세로 비율).
// 이미지 생성 AI를 쓰지 않고 앱이 직접 그려서, 날짜·QR코드가 항상 정확하다.
//
// canvas는 CSS 토큰(@theme)을 쓸 수 없어서 포스터 색은 여기 THEMES에만 둔다.
import { formatDateCompact } from './time.js'

export const POSTER_THEMES = {
  blue: { label: '파랑', bg: '#3182f6', bgDeep: '#1b64da', fg: '#ffffff', sub: 'rgba(255,255,255,0.82)' },
  coral: { label: '코랄', bg: '#ff6f61', bgDeep: '#e5544a', fg: '#ffffff', sub: 'rgba(255,255,255,0.85)' },
  green: { label: '초록', bg: '#12a47b', bgDeep: '#0b8a66', fg: '#ffffff', sub: 'rgba(255,255,255,0.85)' },
}

const W = 1080
const H = 1350
const PAD = 88
const INK = '#191f28'
const INK_FAINT = '#8b95a1'
const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

/** 한국어 줄바꿈: 띄어쓰기 단위로 나누고, 한 단어가 너무 길면 글자 단위로 자른다. maxLines를 넘으면 …로 끝낸다 */
function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  const push = (l) => lines.push(l)
  for (const word of words) {
    const tryLine = line ? `${line} ${word}` : word
    if (ctx.measureText(tryLine).width <= maxWidth) {
      line = tryLine
      continue
    }
    if (line) push(line)
    // 단어 하나가 한 줄보다 길면 글자 단위로 자른다
    let chunk = ''
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxWidth) {
        push(chunk)
        chunk = ch
      } else chunk += ch
    }
    line = chunk
  }
  if (line) push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    let last = kept[maxLines - 1]
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    kept[maxLines - 1] = `${last}…`
    return kept
  }
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function loadFonts() {
  if (!document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load(`800 92px ${FONT}`, '모임콕'),
      document.fonts.load(`600 38px ${FONT}`, '모임콕'),
    ])
  } catch {
    // 글꼴을 못 불러오면 시스템 글꼴로 그린다
  }
}

/**
 * @param {{ event, parts: {emoji, title, intro}, place, link, theme }} opts
 * @returns {Promise<Blob>} PNG
 */
export async function drawPoster({ event, parts, place, link, theme = 'blue' }) {
  await loadFonts()
  const t = POSTER_THEMES[theme] ?? POSTER_THEMES.blue
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // 배경: 위에서 아래로 살짝 진해지는 단색
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, t.bg)
  g.addColorStop(1, t.bgDeep)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'

  let y = PAD

  // 머리 문구
  ctx.fillStyle = t.sub
  ctx.font = `600 36px ${FONT}`
  ctx.fillText('일정 투표에 참여해 주세요', PAD, y)
  y += 84

  // 이모지
  if (parts.emoji) {
    ctx.font = `140px ${EMOJI_FONT}`
    ctx.fillText(parts.emoji, PAD - 6, y)
    y += 176
  }

  // 제목
  ctx.fillStyle = t.fg
  ctx.font = `800 96px ${FONT}`
  for (const line of wrap(ctx, parts.title, W - PAD * 2, 3)) {
    ctx.fillText(line, PAD, y)
    y += 112
  }
  y += 20

  // 아래 흰 카드 위치를 먼저 정해서, 소개는 카드 위 남은 공간만큼만 쓴다 (제목이 길면 소개 줄이 줄어든다)
  const cardH = 380
  const cardY = H - PAD - cardH

  // 소개
  ctx.fillStyle = t.sub
  ctx.font = `500 38px ${FONT}`
  const introLines = Math.min(4, Math.floor((cardY - 40 - y) / 56))
  if (introLines > 0) {
    for (const line of wrap(ctx, parts.intro, W - PAD * 2, introLines)) {
      ctx.fillText(line, PAD, y)
      y += 56
    }
  }

  // 아래 흰 카드: 일시·장소 + QR코드
  const cardX = PAD - 24
  const cardW = W - (PAD - 24) * 2
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, cardX, cardY, cardW, cardH, 48)
  ctx.fill()

  const qrSize = 260
  const qrX = cardX + cardW - 56 - qrSize
  const qrY = cardY + 48
  const qrCanvas = document.createElement('canvas')
  // QR 라이브러리는 포스터를 그릴 때만 불러온다 (첫 화면을 가볍게)
  const { default: QRCode } = await import('qrcode')
  await QRCode.toCanvas(qrCanvas, link, { width: qrSize, margin: 0, color: { dark: INK, light: '#ffffff' } })
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
  ctx.fillStyle = INK_FAINT
  ctx.font = `600 26px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('QR로 투표하기', qrX + qrSize / 2, qrY + qrSize + 18)
  ctx.textAlign = 'left'

  const infoX = cardX + 56
  const infoW = qrX - 48 - infoX
  // 후보 날짜가 많으면 "12/1(화) ~ 12/6(일) 중 6일"로 줄인다
  const dates = event.dates.map(formatDateCompact)
  const datesText =
    dates.length <= 3 ? dates.join(', ') : `${dates[0]} ~ ${dates[dates.length - 1]} 중 ${dates.length}일`
  const rows = [
    ['후보 날짜', datesText, 2],
    ['장소', place.trim() || '미정', 1],
  ]
  let iy = cardY + 52
  for (const [k, v, maxLines] of rows) {
    ctx.fillStyle = INK_FAINT
    ctx.font = `600 28px ${FONT}`
    ctx.fillText(k, infoX, iy)
    iy += 42
    ctx.fillStyle = INK
    ctx.font = `700 40px ${FONT}`
    for (const line of wrap(ctx, v, infoW, maxLines)) {
      ctx.fillText(line, infoX, iy)
      iy += 52
    }
    iy += 22
  }
  // 아래 안내 문구는 자리가 남을 때만
  const footY = cardY + cardH - 52 - 26
  if (iy - 22 <= footY - 12) {
    ctx.fillStyle = INK_FAINT
    ctx.font = `500 26px ${FONT}`
    ctx.fillText('로그인 없이 이름만 쓰면 돼요', infoX, footY)
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
}
