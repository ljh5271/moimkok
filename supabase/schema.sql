-- 모임콕 Supabase 스키마
-- Supabase 대시보드 > SQL Editor에 전체를 붙여 넣고 한 번 실행한다. 여러 번 실행해도 된다.
--
-- 원칙
-- 1. 세 테이블 모두 RLS를 켜고 정책은 만들지 않는다. anon은 테이블을 직접 읽거나 쓸 수 없다.
-- 2. 모든 데이터 접근은 아래 public RPC 함수로만 한다 (security definer, search_path = '').
-- 3. 관리키는 event_admin_keys에만 두고, 관리키가 필요한 작업은 함수 안에서 키를 검사한다.
-- 4. 함수를 만들면 PUBLIC에 execute가 기본으로 열리므로 회수한 뒤 anon에만 다시 준다.

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────
-- private: 내부 함수 전용 스키마 (anon에 노출하지 않음)
-- ─────────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- 헷갈리기 쉬운 문자(0, o, 1, l)를 뺀 32자. 256의 약수라 고르게 분포한다.
-- 관리키 추측을 막기 위해 random()이 아니라 암호학적 난수(gen_random_bytes)를 쓴다.
create or replace function private.random_id(len int)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  bytes bytea := extensions.gen_random_bytes(len);
  result text := '';
begin
  for i in 0..len - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- "18:30" → 1110
create or replace function private.to_minutes(t text)
returns int
language sql
immutable
set search_path = ''
as $$
  select split_part(t, ':', 1)::int * 60 + split_part(t, ':', 2)::int
$$;

-- ─────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────
create table if not exists public.events (
  id text primary key,
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  description text not null default '' check (char_length(description) <= 200),
  dates date[] not null check (cardinality(dates) between 1 and 14),
  start_time text not null check (start_time ~ '^([01][0-9]|2[0-3]):(00|30)$'),
  end_time text not null check (end_time ~ '^(([01][0-9]|2[0-3]):(00|30)|24:00)$'),
  slot_minutes int not null default 30 check (slot_minutes = 30),
  created_at timestamptz not null default now(),
  -- "HH:mm" 형식이 0으로 채워져 있으므로 문자열 비교가 시각 비교와 같다 ("24:00"이 가장 큼)
  constraint events_time_order check (start_time < end_time)
);

create table if not exists public.event_admin_keys (
  event_id text primary key references public.events (id) on delete cascade,
  admin_key text not null check (char_length(admin_key) = 16)
);

create table if not exists public.responses (
  id bigint generated always as identity primary key,
  event_id text not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20 and name = btrim(name)),
  slots text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

alter table public.events enable row level security;
alter table public.event_admin_keys enable row level security;
alter table public.responses enable row level security;

-- Supabase는 public 스키마 테이블에 anon/authenticated 권한을 기본으로 준다. 이중으로 막기 위해 회수한다.
revoke all on table public.events, public.event_admin_keys, public.responses from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- 내부: 행사 + 응답 목록을 화면용 jsonb로 (관리키 미포함)
-- ─────────────────────────────────────────────
create or replace function private.event_json(p_event_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'description', e.description,
    'dates', to_jsonb(e.dates),
    'start_time', e.start_time,
    'end_time', e.end_time,
    'slot_minutes', e.slot_minutes,
    'created_at', e.created_at,
    'responses', coalesce(
      (select jsonb_agg(
                jsonb_build_object('name', r.name, 'slots', to_jsonb(r.slots), 'updated_at', r.updated_at)
                order by r.updated_at)
         from public.responses r
        where r.event_id = e.id),
      '[]'::jsonb)
  )
  from public.events e
  where e.id = p_event_id
$$;

-- ─────────────────────────────────────────────
-- RPC: 행사 만들기 → { id, admin_key }
-- ─────────────────────────────────────────────
create or replace function public.create_event(
  p_name text,
  p_description text,
  p_dates date[],
  p_start_time text,
  p_end_time text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_key text := private.random_id(16);
  v_dates date[];
begin
  -- 중복 제거 + 정렬. 지난 날짜는 받지 않는다 (DB는 UTC라 하루 여유를 둔다)
  select array_agg(distinct d order by d) into v_dates
    from unnest(p_dates) as d
   where d is not null;

  if v_dates is null or cardinality(v_dates) > 14 then
    raise exception '후보 날짜는 1~14개여야 해요.' using errcode = '22023';
  end if;
  if v_dates[1] < current_date - 1 then
    raise exception '지난 날짜는 고를 수 없어요.' using errcode = '22023';
  end if;

  -- ID가 겹치면 다시 뽑는다. 이름 길이·시간 형식은 테이블 check 제약이 검사한다.
  loop
    v_id := private.random_id(8);
    begin
      insert into public.events (id, name, description, dates, start_time, end_time)
      values (v_id, btrim(coalesce(p_name, '')), btrim(coalesce(p_description, '')), v_dates, p_start_time, p_end_time);
      exit;
    exception when unique_violation then
      -- 같은 ID가 이미 있음 → 재시도
    end;
  end loop;

  insert into public.event_admin_keys (event_id, admin_key) values (v_id, v_key);

  return jsonb_build_object('id', v_id, 'admin_key', v_key);
end;
$$;

-- ─────────────────────────────────────────────
-- RPC: 행사 보기 (투표·생성 완료 화면) → 행사 jsonb 또는 null
-- ─────────────────────────────────────────────
create or replace function public.get_event(p_event_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.event_json(p_event_id)
$$;

-- ─────────────────────────────────────────────
-- RPC: 응답 저장 (같은 이름이면 덮어쓰기) → { name, slots, updated_at }
-- ─────────────────────────────────────────────
create or replace function public.save_response(p_event_id text, p_name text, p_slots text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.events;
  r public.responses;
  v_slots text[];
  v_start int;
  v_end int;
  v_max int;
  v_bad int;
begin
  select * into e from public.events where id = p_event_id;
  if not found then
    raise exception '행사를 찾을 수 없어요.' using errcode = 'P0002';
  end if;

  v_start := private.to_minutes(e.start_time);
  v_end := private.to_minutes(e.end_time);
  v_max := cardinality(e.dates) * ((v_end - v_start) / e.slot_minutes);

  -- 비정상적으로 큰 요청은 정렬·검사 전에 거절 (최대 14일 × 48칸 = 672)
  if cardinality(coalesce(p_slots, '{}')) > 1000 then
    raise exception '선택한 칸이 너무 많아요.' using errcode = '22023';
  end if;

  -- 중복 제거 + 정렬
  select coalesce(array_agg(distinct s order by s), '{}') into v_slots
    from unnest(coalesce(p_slots, '{}')) as s;

  if cardinality(v_slots) > v_max then
    raise exception '선택한 칸이 행사 전체 칸 수보다 많아요.' using errcode = '22023';
  end if;

  -- 형식("YYYY-MM-DDTHH:mm"), 행사 날짜 포함 여부, 시간 범위, 30분 단위 정렬 검사
  -- CASE로 감싸서 형식이 틀린 값은 날짜 변환 전에 걸러낸다
  select count(*) into v_bad
    from unnest(v_slots) as s
   where case
           when s is null or s !~ '^\d{4}-\d{2}-\d{2}T([01][0-9]|2[0-3]):(00|30)$' then true
           else not (substr(s, 1, 10)::date = any (e.dates))
                or private.to_minutes(substr(s, 12, 5)) < v_start
                or private.to_minutes(substr(s, 12, 5)) >= v_end
                or (private.to_minutes(substr(s, 12, 5)) - v_start) % e.slot_minutes <> 0
         end;

  if v_bad > 0 then
    raise exception '행사 범위를 벗어난 칸이 있어요.' using errcode = '22023';
  end if;

  insert into public.responses (event_id, name, slots, updated_at)
  values (e.id, btrim(coalesce(p_name, '')), v_slots, now())
  on conflict (event_id, name)
  do update set slots = excluded.slots, updated_at = excluded.updated_at
  returning * into r;

  return jsonb_build_object('name', r.name, 'slots', to_jsonb(r.slots), 'updated_at', r.updated_at);
end;
$$;

-- ─────────────────────────────────────────────
-- RPC: 운영진 화면 → 관리키가 맞을 때만 행사 jsonb, 아니면 null
-- (4주차 confirm_event도 같은 방식으로 추가)
-- ─────────────────────────────────────────────
create or replace function public.get_admin_event(p_event_id text, p_admin_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.event_json(k.event_id)
    from public.event_admin_keys k
   where k.event_id = p_event_id
     and k.admin_key = p_admin_key
$$;

-- ─────────────────────────────────────────────
-- 실행 권한: PUBLIC과 Supabase 기본 권한을 먼저 회수하고 anon에만 준다
-- ─────────────────────────────────────────────
revoke execute on function private.random_id(int), private.to_minutes(text), private.event_json(text)
  from public, anon, authenticated;

revoke execute on function
  public.create_event(text, text, date[], text, text),
  public.get_event(text),
  public.save_response(text, text, text[]),
  public.get_admin_event(text, text)
  from public, anon, authenticated;

grant execute on function
  public.create_event(text, text, date[], text, text),
  public.get_event(text),
  public.save_response(text, text, text[]),
  public.get_admin_event(text, text)
  to anon;
