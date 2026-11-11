// 단톡방 공지 조립. AI(또는 기본 문구)가 쓴 머리말 + 앱이 채우는 정보 줄 + 투표 링크.
//
//   🐳넷트워킹 참여인원 모집🐳
//
//   (소개 1~2문장)
//
//   ▫️일시: 11/7(토), 11/8(일) 중 투표로 정해요
//   ▫️장소: 미정
//
//   👉 되는 시간 투표하기 (로그인 없이 이름만)
//   https://…/e/abc12345
//
// 날짜·장소·링크는 여기서만 만든다. AI는 이 값들을 쓰지 않는다 (api/_lib/notice.js).
import { availableForRange, tally } from './results.js'
import { formatClock24, formatDateCompact, formatDateWeekday, toMinutes } from './time.js'

const EMOJIS = ['🐳', '🐵', '🦊', '🐻', '🐰', '🐧', '🐢', '🦁', '🐙', '🐬']

/** 모임마다 같은 이모지가 나오도록 id로 고른다 */
function pickEmoji(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return EMOJIS[h % EMOJIS.length]
}

function sentence(text) {
  const t = text.trim()
  return /[.!?。…~]$/.test(t) ? t : `${t}.`
}

/** 확정 구간 내내 가능한 인원 (서버가 stats를 못 줄 때 화면에서 계산) */
export function confirmedStats(event) {
  const c = event.confirmed
  if (!c) return null
  const result = tally(event)
  const d = event.dates.indexOf(c.date)
  const t0 = result.times.indexOf(c.startTime)
  const t1 = t0 + (toMinutes(c.endTime) - toMinutes(c.startTime)) / event.slotMinutes - 1
  const yes = d >= 0 && t0 >= 0 ? availableForRange(result, d, t0, t1).length : 0
  return { total: result.names.length, yes }
}

/** 포스터 문구 기본값 (AI 머리말에 poster가 없을 때) */
export function templatePoster(event) {
  return { headline: event.name.slice(0, 10), subhead: '함께 일정을 정해요', keywords: [], scene: '' }
}

/** AI를 쓸 수 없을 때의 머리말 */
export function templateParts(event, kind, tone) {
  const emoji = pickEmoji(event.id)
  const about = event.description ? `${sentence(event.description)} ` : ''
  if (kind === 'invite') {
    const title = tone === 'official' ? `${event.name} 일정 조사` : `${event.name} 일정 투표`
    const intro = {
      regular: `${about}되는 시간을 알려 주시면 가장 많이 되는 날로 정할게요. 많은 참여 부탁드려요!`,
      event: `${about}되는 시간을 쭉 칠해 주세요! 가장 많이 되는 날로 바로 정할게요!`,
      official: `${about}${event.name} 일정을 정하기 위해 가능한 시간을 조사합니다. 많은 참여 바랍니다.`,
    }[tone]
    return { emoji, title, intro, poster: templatePoster(event) }
  }
  const intro = {
    regular: `${about}${event.name} 일정이 정해졌어요! 많은 참여 부탁드려요!`,
    event: `${about}${event.name} 날짜가 확정됐어요! 다들 꼭 와 주세요!`,
    official: `${about}${event.name} 일정이 아래와 같이 확정되었습니다. 많은 참여 바랍니다.`,
  }[tone]
  return { emoji, title: `${event.name} 공지`, intro }
}

/** ▫️ 정보 줄 (앞의 ▫️는 붙이지 않은 문자열 배열) */
export function infoLines({ event, kind, place, extra, stats }) {
  const lines = []
  if (kind === 'invite') {
    const dates = event.dates.map(formatDateCompact)
    lines.push(`일시: ${dates.length === 1 ? dates[0] : `${dates.join(', ')} 중 투표로 정해요`}`)
  } else if (event.confirmed) {
    const c = event.confirmed
    lines.push(`일시: ${formatDateWeekday(c.date)} ${formatClock24(c.startTime)}`)
  }
  lines.push(`장소: ${place.trim() || '미정'}`)
  // 더 넣을 내용: 한 줄에 하나씩. 앞에 붙인 -, •, ▫️ 같은 기호는 떼고 ▫️로 통일한다
  for (const raw of extra.split('\n')) {
    const line = raw.replace(/^[\s\-•·*▫️◽️▪️]+/u, '').trim()
    if (line) lines.push(line)
  }
  if (kind === 'confirm' && stats && stats.total > 0) {
    lines.push(`참석 가능: 응답한 ${stats.total}명 중 ${stats.yes}명`)
  }
  return lines
}

/** 단톡방에 그대로 올릴 글 */
export function composeNotice({ parts, event, kind, place = '', extra = '', stats = null, link = '' }) {
  const e = parts.emoji || ''
  const head = `${e}${parts.title}${e}`
  const info = infoLines({ event, kind, place, extra, stats })
    .map((l) => `▫️${l}`)
    .join('\n')
  const tail = kind === 'invite' && link ? `\n\n👉 되는 시간 투표하기 (로그인 없이 이름만)\n${link}` : ''
  return `${head}\n\n${parts.intro}\n\n${info}${tail}`
}
