#!/usr/bin/env bash
# schema.sql 실행 후, 공개 anon 키로 막혀야 할 것은 막히고 열려야 할 것만 열리는지 확인한다.
# 사용법: 프로젝트 루트에서  bash supabase/check-rls.sh   (.env의 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 사용)
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a
URL="${VITE_SUPABASE_URL:?.env에 VITE_SUPABASE_URL이 없어요}"
KEY="${VITE_SUPABASE_ANON_KEY:?.env에 VITE_SUPABASE_ANON_KEY가 없어요}"
H=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json")

pass=0; fail=0
check() { # 이름, 기대 결과(blocked|ok), 실제 HTTP 코드, 응답 본문
  local ok=0
  if [ "$2" = blocked ]; then
    # 401/403/404, 또는 200이어도 빈 배열이면 데이터가 새지 않은 것
    case "$3" in 401|403|404) ok=1 ;; 200) [ "$4" = "[]" ] && ok=1 ;; esac
  else
    [ "$3" = 200 ] && ok=1
  fi
  if [ $ok = 1 ]; then echo "  통과  $1 ($3)"; pass=$((pass+1)); else echo "  실패  $1 ($3) $4"; fail=$((fail+1)); fi
}
req() { curl -s -o /tmp/moim_body -w '%{http_code}' "$@"; }

echo "1) 테이블 직접 접근은 막혀야 해요"
c=$(req "${H[@]}" "$URL/rest/v1/event_admin_keys?select=*"); check "관리키 테이블 조회" blocked "$c" "$(cat /tmp/moim_body)"
c=$(req "${H[@]}" "$URL/rest/v1/events?select=*");           check "행사 목록 조회"     blocked "$c" "$(cat /tmp/moim_body)"
c=$(req "${H[@]}" "$URL/rest/v1/responses?select=*");        check "응답 목록 조회"     blocked "$c" "$(cat /tmp/moim_body)"
c=$(req "${H[@]}" -X POST "$URL/rest/v1/responses" -d '{"event_id":"x","name":"hack"}'); check "응답 직접 insert" blocked "$c" "$(cat /tmp/moim_body)"

echo "2) RPC는 동작해야 해요"
TOMORROW=$(date -v+1d +%F 2>/dev/null || date -d tomorrow +%F)
c=$(req "${H[@]}" -X POST "$URL/rest/v1/rpc/create_event" \
  -d "{\"p_name\":\"RLS 점검용\",\"p_description\":\"\",\"p_dates\":[\"$TOMORROW\"],\"p_start_time\":\"18:00\",\"p_end_time\":\"19:00\"}")
body=$(cat /tmp/moim_body); check "create_event" ok "$c" "$body"
ID=$(echo "$body" | sed -n 's/.*"id" *: *"\([^"]*\)".*/\1/p')
ADMIN=$(echo "$body" | sed -n 's/.*"admin_key" *: *"\([^"]*\)".*/\1/p')

c=$(req "${H[@]}" -X POST "$URL/rest/v1/rpc/get_event" -d "{\"p_event_id\":\"$ID\"}")
body=$(cat /tmp/moim_body); check "get_event" ok "$c" "$body"
if echo "$body" | grep -q admin_key; then echo "  실패  get_event 응답에 관리키가 들어 있어요"; fail=$((fail+1)); else echo "  통과  get_event 응답에 관리키 없음"; pass=$((pass+1)); fi

c=$(req "${H[@]}" -X POST "$URL/rest/v1/rpc/save_response" \
  -d "{\"p_event_id\":\"$ID\",\"p_name\":\"점검\",\"p_slots\":[\"${TOMORROW}T18:00\"]}"); check "save_response" ok "$c" "$(cat /tmp/moim_body)"

echo "3) 관리키 검사"
c=$(req "${H[@]}" -X POST "$URL/rest/v1/rpc/get_admin_event" -d "{\"p_event_id\":\"$ID\",\"p_admin_key\":\"$ADMIN\"}")
check "맞는 관리키 → 행사" ok "$c" "$(cat /tmp/moim_body)"
c=$(req "${H[@]}" -X POST "$URL/rest/v1/rpc/get_admin_event" -d "{\"p_event_id\":\"$ID\",\"p_admin_key\":\"wrongwrongwrong1\"}")
body=$(cat /tmp/moim_body)
if [ "$c" = 200 ] && [ "$body" = "null" ]; then echo "  통과  틀린 관리키 → null"; pass=$((pass+1)); else echo "  실패  틀린 관리키 ($c) $body"; fail=$((fail+1)); fi

echo "4) 범위 밖 슬롯은 거절돼야 해요"
c=$(req "${H[@]}" -X POST "$URL/rest/v1/rpc/save_response" \
  -d "{\"p_event_id\":\"$ID\",\"p_name\":\"점검\",\"p_slots\":[\"${TOMORROW}T23:00\"]}")
if [ "$c" != 200 ]; then echo "  통과  범위 밖 슬롯 거절 ($c)"; pass=$((pass+1)); else echo "  실패  범위 밖 슬롯이 저장됐어요"; fail=$((fail+1)); fi

echo
echo "결과: 통과 $pass, 실패 $fail"
echo "점검용 행사($ID)는 Supabase Table Editor에서 지워도 돼요."
[ $fail = 0 ]
