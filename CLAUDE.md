# 모임콕 (가칭)

동아리·학생회용 일정 투표 + AI 공지문 자동 작성 웹앱.
링크 하나로 일정 투표 → 겹치는 시간 집계 → 일정 확정 → Claude API로 공지문 초안 생성.
기획서: docs/모임콕_기획서.md

## 기술 스택
- React 19 (Vite 8) + Tailwind CSS v4 (@tailwindcss/vite, 설정 파일 없이 src/index.css의 @theme 사용)
- react-router-dom 7
- Supabase (DB) — 3주차 연동 예정
- Claude API: 반드시 서버리스 함수(Vercel Functions)에서 호출. API 키를 프론트에 노출하지 않는다.
- 배포: Vercel

## 핵심 기능 (MVP)
1. 행사 생성 (이름, 설명, 후보 날짜, 시간대) → 참여자용 투표 링크 + 운영진용 관리 링크 생성
2. 참여자: 로그인 없이 이름 입력 후 가능한 시간 칸 드래그 체크
3. 결과: 시간대별 가능 인원 히트맵, 최다 겹침 시간 하이라이트, 응답자 명단
4. 운영진이 최종 일정 확정
5. 공지문 생성 (톤: 정기모임 / MT·행사 / 공식 공지), 복사 버튼

## 명령어
- `npm run dev` 개발 서버
- `npm run build` 빌드 (작업 후 오류 없는지 확인용)

## 폴더 구조
```
src/
├── main.jsx              # BrowserRouter + EventStoreProvider
├── App.jsx               # 라우트 + 공통 레이아웃(헤더)
├── index.css             # Tailwind import, @theme 색상·폰트 토큰
├── store/EventStore.jsx  # 메모리 상태 (Context + useReducer)
├── pages/                # Home, CreateEvent, EventCreated, Vote, Admin, NotFound
├── components/           # DatePicker, TimeRangeSelect, TimeGrid, EventSummary, CopyLinkBox, styles.js
└── utils/                # id.js, time.js, clipboard.js
```

## 라우트
- `/` 메인
- `/new` 행사 생성
- `/e/:eventId/created` 생성 완료 (투표 링크·관리 링크 복사)
- `/e/:eventId` 참여자 투표
- `/e/:eventId/admin?key=관리키` 운영진 화면 (현재는 키 확인 + 응답자 명단만, 결과·확정은 4주차)

## 데이터 구조
```js
event = {
  id, adminKey, name, description,
  dates: ["2026-10-07", ...],          // 정렬된 ISO 날짜
  startTime: "18:00", endTime: "22:00", // endTime은 슬롯에 포함되지 않음, "24:00" 가능
  slotMinutes: 30,
  responses: [{ name, slots: ["2026-10-07T18:00", ...], updatedAt }],
  createdAt,
}
```
- 응답 슬롯 키는 `"YYYY-MM-DDTHH:mm"` 형식 (utils/time.js의 `slotKey`)
- 같은 이름으로 다시 응답하면 기존 응답을 덮어씀 (이름이 응답 식별자)

## 구조 약속
- 화면 컴포넌트는 `useEvent`, `useEventStore` 훅으로만 데이터에 접근한다. DB 연동 시 EventStore의 `createEvent`, `saveResponse` 안쪽만 교체하고 화면 코드는 최대한 그대로 둔다.
- 날짜·시간 계산과 표시 형식은 utils/time.js에 모은다. 날짜는 로컬 시간 기준 `parseISODate` / `toISODate`를 쓰고 `new Date("2026-10-07")`처럼 UTC로 해석되는 방식은 쓰지 않는다.
- TimeGrid 드래그는 Pointer Events + `elementFromPoint` 방식. 처음 누른 칸 상태로 칠하기/지우기 모드가 정해지고, 시작 칸~현재 칸 직사각형에 적용된다. 셀에는 `touch-action: none`이 걸려 있어 그리드 위에서는 페이지 스크롤이 막힌다.

## 디자인 규칙
- 색상은 src/index.css의 @theme 토큰만 사용 (임의 hex 값 금지)
  - `ink` 본문·주요 버튼, `ink-soft` 보조 텍스트, `paper` 배경, `line` 테두리
  - `mark` 형광펜 노랑: 선택한 칸·날짜, `mark-deep` 진한 노랑
  - `sat` 토요일 파랑, `sun` 일요일·오류 빨강
- 글꼴: SUIT Variable (CDN)
- 버튼·입력창·카드는 components/styles.js의 클래스 묶음(`btnPrimary`, `btnSecondary`, `input`, `card` 등)을 재사용
- 키보드 포커스 표시(focus-visible)와 aria 속성을 빼지 않는다
- UI 문구: 짧은 존댓말("~하세요", "~했어요"), 버튼은 실제 동작을 이름으로 ("저장하기", "투표 링크 만들기")

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
- [ ] 3주차: Supabase 연동, 실제 링크 공유
- [ ] 4주차: 결과 집계 화면 (히트맵, 최다 겹침, 응답자 명단, 일정 확정)
- [ ] 5주차: Claude API 공지문 생성 (Vercel Functions)
- [ ] 6주차: Vercel 배포 (SPA 라우팅용 vercel.json rewrites 필요), 디자인 다듬기
- [ ] 7주차: 동아리·학생회 실사용 테스트
- [ ] 8주차: 피드백 반영, 발표 준비
