import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * 개발 서버에서도 /api/notice, /api/poster가 동작하게 하는 플러그인.
 * 배포(Vercel)에서는 api/*.js가 같은 일을 한다. 둘 다 api/_lib/*.js를 쓴다.
 * .env의 값은 서버 쪽에서만 읽고, VITE_가 없는 값(ANTHROPIC_API_KEY, GEMINI_API_KEY)은 브라우저로 가지 않는다.
 */
const ROUTES = {
  '/api/notice': ['/api/_lib/notice.js', 'createNotice'],
  '/api/poster': ['/api/_lib/poster.js', 'createPoster'],
}

function localApi(env) {
  return {
    name: 'moimkok-local-api',
    configureServer(server) {
      for (const [route, [file, fn]] of Object.entries(ROUTES)) {
      server.middlewares.use(route, async (req, res) => {
        const send = (status, body) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') return send(405, { code: 'method', message: 'POST만 받아요.' })

        let raw = ''
        for await (const chunk of req) {
          raw += chunk
          if (raw.length > 10_000) return send(413, { code: 'invalid', message: '요청이 너무 커요.' })
        }
        let input = null
        try {
          input = JSON.parse(raw)
        } catch {
          // createNotice가 잘못된 입력으로 처리한다
        }
        const mod = await server.ssrLoadModule(file)
        const { status, body } = await mod[fn](input, env)
        send(status, body)
      })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), localApi(env)],
  }
})
