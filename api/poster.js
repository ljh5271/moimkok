// Vercel 서버리스 함수: POST /api/poster
// 본문: { eventId, adminKey, headline, subhead?, keywords?: string[], scene? }
// 응답: 200 { mimeType, data(base64) } / 4xx·5xx { code, message }
// 그림 생성에 10~30초 걸려서 vercel.json에서 실행 시간을 늘려 둔다.
import { createPoster } from './_lib/poster.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ code: 'method', message: 'POST만 받아요.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = null
    }
  }

  const { status, body: out } = await createPoster(body, process.env)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(out)
}
