// .env의 GEMINI_API_KEY로 쓸 수 있는 이미지 모델 이름을 보여 준다.
// 사용법: npm run check:gemini
// 키 값은 출력하지 않는다.
import { readFileSync } from 'node:fs'

function readEnv() {
  try {
    return Object.fromEntries(
      readFileSync('.env', 'utf8')
        .split('\n')
        .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
    )
  } catch {
    return {}
  }
}

const env = { ...readEnv(), ...process.env }
const key = env.GEMINI_API_KEY
if (!key) {
  console.error('.env에 GEMINI_API_KEY가 없어요.')
  process.exit(1)
}

const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
  headers: { 'x-goog-api-key': key },
})
if (!res.ok) {
  console.error(`키 확인 실패 (${res.status}). 키가 맞는지 확인해 주세요.`)
  process.exit(1)
}
const { models = [] } = await res.json()
const images = models
  .map((m) => m.name.replace(/^models\//, ''))
  .filter((n) => /image/i.test(n) && !/imagen/i.test(n))

console.log('키 확인 완료. 쓸 수 있는 Gemini 이미지 모델:')
for (const n of images) console.log(`  - ${n}`)
console.log(`\n지금 설정: ${env.GEMINI_IMAGE_MODEL || '(비어 있음 → 기본값 gemini-3.1-flash-image)'}`)
console.log('목록에 기본값이 없으면 .env에 GEMINI_IMAGE_MODEL=목록의 이름 을 넣어 주세요. 이름에 lite가 들어간 모델이 더 싸요.')
