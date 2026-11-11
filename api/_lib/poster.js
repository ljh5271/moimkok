// AI 포스터 그림 생성 로직. Vercel 함수(api/poster.js)와 개발 서버(vite.config.js)가 같이 쓴다.
//
// 흐름: 입력 검사 → 관리키 확인(Supabase RPC) → Gemini 이미지 모델 호출 → 그림(base64) 돌려주기
// 그림 AI에는 날짜·장소·링크를 주지 않는다. 포스터 아래쪽 1/4을 비워 달라고 하고,
// 그 자리에 화면(src/utils/poster.js)이 날짜·장소 라벨과 QR코드를 정확하게 얹는다.
//
// 환경 변수
//   GEMINI_API_KEY         Google AI Studio에서 받은 키 (필수)
//   GEMINI_IMAGE_MODEL     이미지 모델 이름. 비워 두면 DEFAULT_MODEL. 쓸 수 있는 이름은 `npm run check:gemini`로 확인
//   MOIMKOK_GEMINI_BASE_URL  자동 테스트에서 가짜 서버로 보낼 때만 쓴다

export const DEFAULT_MODEL = 'gemini-3.1-flash-image'

const EVENT_ID = /^[a-z0-9]{8}$/
const ADMIN_KEY = /^[a-z0-9]{16}$/
const URL_RE = /https?:\/\/\S+/g

function fail(status, code, message) {
  return { status, body: { code, message } }
}

function cleanText(v, max) {
  return typeof v === 'string' ? v.replace(URL_RE, '').replace(/["\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

/** 그림 AI에게 보낼 영어 지시문. 한글 문구는 따옴표 안에 그대로 넣는다 */
export function buildPosterPrompt({ headline, subhead, keywords, scene }) {
  const kw = keywords.length
    ? `A row of ${keywords.length} pastel sticky notes held by washi tape, each with a simple flat icon and short Korean text exactly: ${keywords.map((k) => `"${k}"`).join(', ')}. `
    : ''
  return [
    'A vibrant, eye-catching vertical poster (4:5) for a Korean university student club event, social-media ready, high detail.',
    `Background: ${scene || 'a bright sunny university campus with trees and blue sky, students chatting together'}, photographic, warm and cheerful.`,
    `Center: huge glossy 3D inflated balloon-style Korean headline text that reads exactly "${headline}", mostly white with one character in glossy red, playful and bold, with soft shadows.`,
    subhead ? `Above the headline, smaller hand-lettered Korean text that reads exactly "${subhead}" with a red marker underline.` : '',
    kw,
    'Scattered hand-drawn white doodles: sparkles, stars, a paper plane, squiggly lines.',
    'IMPORTANT: keep the bottom 25% of the image calm and uncluttered (soft blurred background only, no text, no faces, no important objects) because labels will be placed there later.',
    'Do not draw any dates, numbers, times, URLs, QR codes, logos, brand names, or watermarks. Spell all Korean text exactly as given and draw no other text.',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * @param {{ eventId, adminKey, headline, subhead?, keywords?, scene? }} input
 * @returns {Promise<{ status, body }>}  200이면 { mimeType, data(base64) }
 */
export async function createPoster(input, env, fetchImpl = fetch) {
  const { eventId, adminKey } = input ?? {}
  if (typeof eventId !== 'string' || !EVENT_ID.test(eventId)) return fail(400, 'invalid', '모임 주소가 올바르지 않아요.')
  if (typeof adminKey !== 'string' || !ADMIN_KEY.test(adminKey)) return fail(403, 'bad_key', '관리 링크가 올바르지 않아요.')

  const headline = cleanText(input.headline, 12)
  if (!headline) return fail(400, 'invalid', '포스터 제목이 비어 있어요.')
  const subhead = cleanText(input.subhead, 16)
  const keywords = Array.isArray(input.keywords) ? input.keywords.map((k) => cleanText(k, 14)).filter(Boolean).slice(0, 4) : []
  const scene = cleanText(input.scene, 300)

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return fail(503, 'not_configured', '서버에 Supabase 설정이 없어요.')

  // 1) 관리키 확인. 관리 링크 없는 사람이 이미지 크레딧을 쓰지 못하게 Gemini보다 먼저 한다.
  try {
    const res = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/get_admin_event`, {
      method: 'POST',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_event_id: eventId, p_admin_key: adminKey }),
    })
    if (!res.ok) return fail(502, 'upstream', '모임 정보를 불러오지 못했어요.')
    if (!(await res.json())) return fail(403, 'bad_key', '관리 링크가 올바르지 않아요.')
  } catch {
    return fail(502, 'upstream', '모임 정보를 불러오지 못했어요.')
  }

  // 2) Gemini 호출
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) return fail(503, 'not_configured', '서버에 Gemini API 키가 설정되지 않았어요.')
  const model = env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL
  const base = env.MOIMKOK_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'

  try {
    const res = await fetchImpl(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPosterPrompt({ headline, subhead, keywords, scene }) }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:5' } },
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      // 오류 원문은 서버 로그에만 남긴다
      console.error('[poster] Gemini 오류', res.status, detail.slice(0, 500))
      if (res.status === 404) return fail(502, 'model', `이미지 모델(${model})을 찾을 수 없어요. GEMINI_IMAGE_MODEL을 확인해 주세요.`)
      if (res.status === 429) return fail(429, 'busy', '요청이 많아요. 잠시 후 다시 시도해 주세요.')
      return fail(502, 'upstream', '포스터를 그리지 못했어요.')
    }
    const data = await res.json()
    const part = (data.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data || p.inline_data?.data)
    const inline = part?.inlineData ?? part?.inline_data
    if (!inline?.data) {
      // 안전 필터 등으로 그림 없이 끝난 경우
      console.error('[poster] 그림 없음', JSON.stringify(data).slice(0, 500))
      return fail(502, 'no_image', '포스터를 그리지 못했어요. 다시 만들어 주세요.')
    }
    return { status: 200, body: { mimeType: inline.mimeType ?? inline.mime_type ?? 'image/png', data: inline.data } }
  } catch (err) {
    console.error('[poster] Gemini 호출 실패', err?.message)
    return fail(502, 'upstream', '포스터를 그리지 못했어요.')
  }
}
