# 모임콕 (가칭)

동아리·학생회용 일정 투표 + AI 공지문 자동 작성 웹앱.
링크 하나로 일정 투표 → 겹치는 시간 집계 → 일정 확정 → Claude API로 공지문 초안 생성.
기획서: docs/모임콕_기획서.md

## 기술 스택
- React 19 (Vite 8) + Tailwind CSS v4 (@tailwindcss/vite, 설정 파일 없이 src/index.css의 @theme 사용)
- react-router-dom 7
- Supabase (DB) — @supabase/supabase-js, 테이블 직접 접근 없이 RPC 함수로만 호출 (supabase/schema.sql)
- Claude API: 반드시 서버리스 함수(Vercel Functions)에서 호출. API 키를 프론트에 노출하지 않는다.
- 배포: Vercel

## 핵심 기능 (MVP)
1. 행사 생성 (이름, 설명, 후보 날짜, 시간대) → 참여자용 투표 링크 + 운영진용 관리 링크 생성
2. 참여자: 로그인 없이 이름 입력 후 가능한 시간 칸 드래그 체크
3. 결과: 시간대별 가능 인원 히트맵, 최다 겹침 시간 하이라이트, 응답자 명단
4. 운영진이 최종 일정 확정
5. 공지문 생성 (톤: 정기모임 / MT·행사 / 공식 공지), 복사 버튼

## 명령어
- `npm run dev` 개발 서버 (vite.config.js의 플러그인이 `/api/notice`도 같이 띄운다. Vercel CLI 필요 없음)
- `npm run build` 빌드 (작업 후 오류 없는지 확인용)

## 폴더 구조
```
src/
├── main.jsx              # BrowserRouter + EventStoreProvider
├── App.jsx               # 라우트 + 공통 레이아웃(헤더)
├── index.css             # Tailwind import, @theme 색상·폰트 토큰
├── lib/supabase.js       # Supabase 클라이언트 (anon 키, 세션 저장 끔)
├── store/EventStore.jsx  # RPC 호출 + 불러온 행사 캐시 (Context + useReducer)
├── pages/                # Home, CreateEvent, EventCreated, Vote, Admin, NotFound
├── components/           # DatePicker, TimeRangeSelect, TimeGrid, ResultGrid(히트맵), ConfirmedBanner, NoticeComposer,
│                         # BottomCTA(하단 고정 버튼), EventSummary, CopyLinkBox, LoadState, styles.js
└── utils/                # time.js, results.js(집계·추천), clipboard.js, adminKeys.js(관리키 localStorage)
api/
├── notice.js             # Vercel 서버리스 함수 POST /api/notice
└── _lib/notice.js        # 공지문 로직 (관리키 확인 → 응답 현황 계산 → Claude 호출). 개발 서버도 이 파일을 쓴다
supabase/
├── schema.sql            # 테이블·RLS·RPC. SQL Editor에서 실행 (여러 번 실행해도 됨)
└── check-rls.sh          # anon 키로 막혀야 할 것/열려야 할 것 점검
```

## 라우트
- `/` 메인
- `/new` 행사 생성
- `/e/:eventId/created` 생성 완료 (투표 링크·관리 링크 복사)
- `/e/:eventId` 참여자 투표
- `/e/:eventId/admin?key=관리키` 운영진 화면: 응답자 명단, 추천 시간 TOP 3, 히트맵 범위 선택, 일정 확정·변경·취소
- `POST /api/notice` { eventId, adminKey, tone: regular|event|official, extra? } → { notice, stats: { total, yes } }
- `vercel.json` rewrites가 없으면 배포 후 새로고침 시 404 (6주차)

## 데이터 구조
DB (supabase/schema.sql)
- `events`: id(8자), name, description, dates date[], start_time, end_time, slot_minutes, created_at,
  confirmed_date/confirmed_start/confirmed_end/confirmed_at (확정 전에는 넷 다 null, check 제약)
- `event_admin_keys`: event_id, admin_key(16자) — anon이 절대 읽을 수 없음
- `responses`: event_id, name, slots text[], updated_at, unique(event_id, name)
- 세 테이블 모두 RLS on + 정책 없음 + anon 권한 revoke. 접근은 RPC만:
  `create_event` → {id, admin_key} / `get_event` → 행사+응답 (관리키 없음) / `save_response` (upsert, 슬롯 검증) / `get_admin_event(id, key)` → 키가 틀리면 null /
  `confirm_event(id, key, date, start, end)` (다시 부르면 변경) · `cancel_confirm(id, key)` → 키가 틀리면 null, 범위 밖이면 오류
- 새 RPC 추가 시: security definer + `set search_path = ''`, `revoke execute ... from public, anon, authenticated` 후 `grant ... to anon`. pgcrypto는 `extensions.` 접두사
- 열 추가는 `add column if not exists`로 써서 schema.sql을 다시 실행해도 되게 한다. 파일 끝의 `notify pgrst, 'reload schema'`는 지우지 않는다

화면이 쓰는 모양 (EventStore가 snake_case → camelCase로 변환)
```js
event = {
  id, name, description,
  dates: ["2026-10-07", ...],          // 정렬된 ISO 날짜
  startTime: "18:00", endTime: "22:00", // endTime은 슬롯에 포함되지 않음, "24:00" 가능
  slotMinutes: 30,
  responses: [{ name, slots: ["2026-10-07T18:00", ...], updatedAt }],
  confirmed: { date, startTime, endTime, confirmedAt } | null, // endTime은 마지막 칸 + 30분
  createdAt,
}
```
- 응답 슬롯 키는 `"YYYY-MM-DDTHH:mm"` 형식 (utils/time.js의 `slotKey`)
- 같은 이름으로 다시 응답하면 기존 응답을 덮어씀 (이름이 응답 식별자)
- 관리키는 event 객체에 없다. 만든 기기의 localStorage(`moimkok:adminKeys`)에만 저장되고 다시 받아올 수 없다

## 구조 약속
- 화면 컴포넌트는 EventStore 훅으로만 데이터에 접근하고, supabase 클라이언트를 직접 import하지 않는다.
  - `useEvent(id)` / `useAdminEvent(id, key)` → `{ event, status, reload }`, status는 `loading | ready | notFound | error` (+ 관리 화면 `badKey`)
  - `createEvent()` → `{ event, adminKey }`, `saveResponse()` → 저장된 응답, `confirmEvent(id, key, {date, startTime, endTime})` / `cancelConfirm(id, key)` → 갱신된 event, `generateNotice(id, key, {tone, extra})` → `{ notice, stats }`. 모두 async이고 실패하면 `StoreError`를 던진다 (관리키가 틀리면 code `badKey`, 공지문은 `notConfigured`·`notConfirmed`도 있음)
  - 화면은 불러오는 중(EventSkeleton)·실패(LoadError + 다시 시도)·저장 중(버튼 비활성화)·저장 실패(입력 유지) 상태를 반드시 처리한다
- 입력 검증은 프론트와 DB(check 제약·RPC) 양쪽에서 한다. 규칙을 바꾸면 둘 다 고친다.
- 날짜·시간 계산과 표시 형식은 utils/time.js에 모은다. 날짜는 로컬 시간 기준 `parseISODate` / `toISODate`를 쓰고 `new Date("2026-10-07")`처럼 UTC로 해석되는 방식은 쓰지 않는다.
- 집계·추천 계산은 utils/results.js의 순수 함수(`tally`, `recommendRanges`, `availableForRange`, `rangeToTimes`)로 두고 화면에서는 useMemo로 부른다.
  추천 = 구간 내내 가능한 인원이 많은 순 → 긴 순. 더 높은 순위와 겹치면서 길이도 같거나 짧은 구간은 뺀다.
- ResultGrid 범위 선택은 처음 누른 날짜 열에 고정되고, 그 열 안에서 위아래로만 늘어난다. 칸에는 색과 함께 인원 숫자를 표시한다 (색만으로 정보 전달하지 않기).
- 공지문 함수 규칙
  - Claude보다 **관리키 확인을 먼저** 한다 (관리 링크 없는 사람이 API 크레딧을 쓰지 못하게)
  - 날짜·시각과 응답 현황은 서버가 DB에서 계산해 프롬프트에 넣는다. 브라우저가 보낸 값을 믿지 않는다
  - 안 되는 사람 이름은 프롬프트에 넣지 않는다. 운영진이 쓴 추가 내용은 `<추가내용>` 태그 안에 데이터로만 넣는다
  - Claude 오류 원문은 서버 로그에만 남기고 브라우저에는 code·message만 보낸다
  - 모델은 `ANTHROPIC_MODEL`(기본 claude-haiku-5-5). `MOIMKOK_CLAUDE_BASE_URL`은 자동 테스트에서 가짜 서버로 보낼 때만 쓴다
- TimeGrid 드래그는 Pointer Events + `elementFromPoint` 방식. 처음 누른 칸 상태로 칠하기/지우기 모드가 정해지고, 시작 칸~현재 칸 직사각형에 적용된다. 셀에는 `touch-action: none`이 걸려 있어 그리드 위에서는 페이지 스크롤이 막힌다.

## 디자인 규칙 (토스 앱 느낌)
- 색상은 src/index.css의 @theme 토큰만 사용 (임의 hex 값 금지)
  - 글자: `ink` 제목·본문, `ink-soft` 보조, `ink-faint` 설명·힌트
  - 면: `paper` 페이지 배경·카드 안 입력창, `line` 구분선. 카드는 `bg-white`
  - 강조: `primary` 파랑(주요 버튼, 선택한 칸·날짜, 히트맵), `primary-deep` 눌림·최다 칸, `primary-weak` 보조 버튼 배경
  - `sat` 토요일, `sun` 일요일·오류
- 회색 배경 위에 흰 카드(`card`, rounded-3xl)를 쌓는다. 테두리·그림자로 구분하지 않고 면과 여백으로 구분한다
- 화면 맨 위는 질문·안내형 큰 제목(`pageTitle`), 카드 제목은 `sectionTitle`
- 화면의 주요 행동은 `BottomCTA`로 하단에 고정한 큰 버튼 하나 (쓰는 화면은 pb-36, 안내 문구가 있으면 pb-44)
- 장식용 그림·배지·알약 라벨은 쓰지 않는다. 번호는 실제 순서가 있는 내용에만
- 글꼴: Pretendard Variable (CDN), 본문 15~17px
- 버튼·입력창·카드는 components/styles.js의 클래스 묶음(`btnPrimary`, `btnSecondary`, `btnGhost`, `input`, `textarea`, `card`, `pageTitle`, `sectionTitle`)을 재사용
- 키보드 포커스 표시(focus-visible)와 aria 속성을 빼지 않는다
- UI 문구: 부드러운 존댓말("~해 주세요", "~했어요"), 버튼은 실제 동작을 이름으로 ("저장하기", "투표 링크 만들기"). 화면 문구에서는 "행사" 대신 "모임"

## 작업 규칙
- UI 텍스트는 한국어
- 모바일 우선 반응형 (대부분 카톡 링크로 휴대폰에서 열림, 기준 너비 390px)
- 기능 하나 끝날 때마다 실행해서 확인 후 커밋, 커밋 메시지는 한국어로 간결하게
- 큰 구조 변경 전에는 계획을 먼저 설명하고 확인받기
- 비밀 값은 .env에 두고 .env는 커밋하지 않기 (.env.example에 키 이름만 기록)
- 브라우저에 노출되는 값만 `VITE_` 접두사를 붙인다. `ANTHROPIC_API_KEY`에는 절대 붙이지 않는다.

## 진행 상황
- [x] 1주차: 주제 선정, 기획
- [x] 2주차: 행사 생성 + 투표 화면 (메모리 상태, 새로고침 시 데이터 사라짐)
- [x] 3주차: Supabase 연동, 실제 링크 공유 (RPC 전용 접근, 관리키 분리)
- [x] 4주차: 결과 집계 화면 (히트맵, 추천 시간, 응답자 명단, 히트맵 범위 선택으로 일정 확정·변경·취소)
- [x] 5주차: Claude API 공지문 생성 (Vercel Functions, 응답 현황 포함) + 토스 스타일 디자인 개편
- [ ] 6주차: Vercel 배포 (SPA 라우팅용 vercel.json rewrites 필요), 디자인 다듬기
- [ ] 7주차: 동아리·학생회 실사용 테스트
- [ ] 8주차: 피드백 반영, 발표 준비
