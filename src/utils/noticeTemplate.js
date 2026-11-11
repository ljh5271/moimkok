// AI(Claude)를 쓸 수 없을 때 대신 쓰는 기본 문구. 서버 프롬프트와 같은 사실만 쓴다.
import { availableForRange, tally } from './results.js'
import { formatDateLong, formatSlotRange, formatTimeRange, toMinutes } from './time.js'

function datesText(event) {
  return event.dates.map(formatDateLong).join(', ')
}

function extraBlock(extra) {
  const t = extra.trim()
  return t ? `\n\n${t}` : ''
}

function inviteTemplate(event, tone, extra) {
  const desc = event.description ? `\n${event.description}` : ''
  const when = `후보 날짜: ${datesText(event)}\n시간대: ${formatTimeRange(event.startTime, event.endTime)}`
  if (tone === 'official') {
    return `[공지] ${event.name} 일정 조사 안내${desc}\n\n${event.name} 일정을 정하기 위해 가능한 시간을 조사합니다.\n${when}${extraBlock(extra)}\n\n로그인 없이 이름만 입력하면 됩니다. 아래 링크에서 가능한 시간을 선택해 주시기 바랍니다.`
  }
  if (tone === 'event') {
    return `🎉 ${event.name} 날짜 정해요!${desc}\n\n${when}\n\n되는 시간을 쭉 칠해 주시면 제일 많이 되는 날로 정할게요 🙌${extraBlock(extra)}\n\n로그인 없이 이름만 쓰면 돼요. 아래 링크에서 투표해 주세요!`
  }
  return `📅 ${event.name} 일정 투표${desc}\n\n${when}\n\n되는 시간을 칠해 주시면 가장 많이 되는 시간으로 정할게요.${extraBlock(extra)}\n\n로그인 없이 이름만 쓰면 돼요. 아래 링크에서 투표해 주세요.`
}

function confirmTemplate(event, tone, extra) {
  const c = event.confirmed
  const when = formatSlotRange(c.date, c.startTime, c.endTime)
  const result = tally(event)
  const d = event.dates.indexOf(c.date)
  const t0 = result.times.indexOf(c.startTime)
  const t1 = t0 + (toMinutes(c.endTime) - toMinutes(c.startTime)) / event.slotMinutes - 1
  const yes = d >= 0 && t0 >= 0 ? availableForRange(result, d, t0, t1).length : 0
  const total = result.names.length
  const stats = total > 0 ? `\n응답한 ${total}명 중 ${yes}명이 이 시간에 가능해요.` : ''
  if (tone === 'official') {
    return `[공지] ${event.name} 일정 확정 안내\n\n${event.name} 일정이 아래와 같이 확정되었습니다.\n일시: ${when}${stats.replace('가능해요.', '가능합니다.')}${extraBlock(extra)}\n\n많은 참여 바랍니다.`
  }
  if (tone === 'event') {
    return `🎉 ${event.name} 날짜 확정!\n\n📅 ${when}${stats}${extraBlock(extra)}\n\n다들 꼭 와 주세요! 🙌`
  }
  return `📢 ${event.name} 일정이 정해졌어요\n\n📅 ${when}${stats}${extraBlock(extra)}\n\n그때 봬요!`
}

/** kind: 'invite' | 'confirm' */
export function noticeTemplate(event, kind, tone, extra = '') {
  return kind === 'invite' ? inviteTemplate(event, tone, extra) : confirmTemplate(event, tone, extra)
}

/** 투표 요청 글 끝에 붙이는 링크 줄 */
export function linkLine(url, tone) {
  return tone === 'official' ? `투표 링크: ${url}` : `👉 ${url}`
}
