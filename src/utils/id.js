// 헷갈리기 쉬운 문자(0, o, 1, l)를 뺀 32자. 256의 약수라 고르게 분포한다.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

export function randomId(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
