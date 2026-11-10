import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    '[모임콕] Supabase 설정이 없어요. 프로젝트 루트의 .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣고 개발 서버를 다시 실행하세요.',
  )
}

// 로그인 기능이 없으므로 세션 저장·갱신은 끈다. 모든 요청은 anon 역할로 RPC만 호출한다.
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null
