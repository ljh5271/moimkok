// Vercel 서버리스 함수: POST /api/notice
// 본문: { eventId, adminKey, tone: 'regular' | 'event' | 'official', extra?: string }
// 응답: 200 { notice, stats: { total, yes } } / 4xx·5xx { code, message }
import { createNotice } from './_lib/notice.js'

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

  const { status, body: out } = await createNotice(body, process.env)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(out)
}
