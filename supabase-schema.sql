-- ============================================================
-- monolis — Supabase schema (URL共有方式・ログイン不要版)
-- Supabase ダッシュボードの「SQL Editor」に貼り付けて実行してください。
--
-- 以前のバージョン（メールログイン方式）から作り直す場合は、
-- 先に下記を実行してから、このファイル全体を実行してください：
--
--   drop table if exists public.trip_members cascade;
--   drop table if exists public.trips cascade;
--
-- 設計方針:
-- ログイン・会員登録は一切なし。旅行を作成すると発行される
-- 固有のURL（推測不可能なUUID）を知っている人だけが、その旅行の
-- 閲覧・編集ができます（Walicaと同じ「リンクが鍵」の考え方）。
-- そのため、テーブルへの直接アクセスはすべて禁止し（RLSはあえて
-- ポリシーなしで有効化＝全拒否）、下にある関数（RPC）経由でのみ
-- データを読み書きします。関数は「知っているIDの1件だけ」しか
-- 返さない作りになっているので、他人の旅行一覧を見ることはできません。
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  cover text not null default 'linear-gradient(135deg,#4F8EF7 0%,#7BB4FF 100%)',
  data jsonb not null default '{
    "packing": {"自分": [], "相手": [], "共通": []},
    "tasks": [],
    "itinerary": [],
    "expenses": [],
    "notes": {"memo":"","hotelAddress":"","checkin":"","reservationNo":"","flight":"","links":[]},
    "history": []
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  display_name text not null,
  initial text not null,
  color text not null,
  joined_at timestamptz not null default now()
);

-- RLSを有効化するだけでポリシーは一切追加しない
-- → anon / authenticated ロールからのテーブル直接アクセスはすべて拒否される。
-- 読み書きは下の SECURITY DEFINER 関数経由のみに限定する。
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

-- ------------------------------------------------------------
-- 旅行を新規作成し、作成者を最初のメンバーとして登録する
-- ------------------------------------------------------------
create or replace function public.create_trip(
  p_title text,
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_display_name text,
  p_initial text,
  p_color text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_trip public.trips;
  new_member public.trip_members;
begin
  insert into public.trips (title, destination, start_date, end_date)
  values (p_title, p_destination, p_start_date, p_end_date)
  returning * into new_trip;

  insert into public.trip_members (trip_id, display_name, initial, color)
  values (new_trip.id, p_display_name, p_initial, p_color)
  returning * into new_member;

  return jsonb_build_object(
    'trip', to_jsonb(new_trip),
    'member_id', new_member.id
  );
end;
$$;

-- ------------------------------------------------------------
-- 指定したIDの旅行を1件だけ、メンバー一覧を添えて取得する
-- ------------------------------------------------------------
create or replace function public.get_trip_with_members(p_id uuid)
returns table (
  id uuid,
  title text,
  destination text,
  start_date date,
  end_date date,
  cover text,
  data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  members jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    t.id, t.title, t.destination, t.start_date, t.end_date, t.cover,
    t.data, t.created_at, t.updated_at,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object('id', m.id, 'name', m.display_name, 'initial', m.initial, 'color', m.color)
                order by m.joined_at
              )
       from public.trip_members m where m.trip_id = t.id),
      '[]'::jsonb
    ) as members
  from public.trips t
  where t.id = p_id;
$$;

-- ------------------------------------------------------------
-- 指定した複数IDの旅行を、メンバー一覧を添えてまとめて取得する
-- （ホーム画面の「自分がこの端末で開いたことのある旅行一覧」用）
-- ------------------------------------------------------------
create or replace function public.get_trips_with_members(p_ids uuid[])
returns table (
  id uuid,
  title text,
  destination text,
  start_date date,
  end_date date,
  cover text,
  data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  members jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    t.id, t.title, t.destination, t.start_date, t.end_date, t.cover,
    t.data, t.created_at, t.updated_at,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object('id', m.id, 'name', m.display_name, 'initial', m.initial, 'color', m.color)
                order by m.joined_at
              )
       from public.trip_members m where m.trip_id = t.id),
      '[]'::jsonb
    ) as members
  from public.trips t
  where t.id = any(p_ids)
  order by t.created_at desc;
$$;

-- ------------------------------------------------------------
-- 招待リンクを開いた人が、その旅行のメンバーとして参加する
-- ------------------------------------------------------------
create or replace function public.add_trip_member(
  p_trip_id uuid,
  p_display_name text,
  p_initial text,
  p_color text
)
returns public.trip_members
language plpgsql
security definer
set search_path = public
as $$
declare
  new_member public.trip_members;
begin
  if not exists (select 1 from public.trips where id = p_trip_id) then
    raise exception 'trip not found';
  end if;

  insert into public.trip_members (trip_id, display_name, initial, color)
  values (p_trip_id, p_display_name, p_initial, p_color)
  returning * into new_member;

  return new_member;
end;
$$;

-- ------------------------------------------------------------
-- 持ち物・タスク・旅程・お金・メモをまとめて保存する
-- ------------------------------------------------------------
create or replace function public.update_trip_data(p_trip_id uuid, p_data jsonb)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.trips;
begin
  update public.trips
  set data = p_data, updated_at = now()
  where id = p_trip_id
  returning * into updated_row;

  return updated_row;
end;
$$;

-- ------------------------------------------------------------
-- ログイン不要（anonキー）で呼び出せるように権限を付与
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant execute on function public.create_trip(text, text, date, date, text, text, text) to anon, authenticated;
grant execute on function public.get_trip_with_members(uuid) to anon, authenticated;
grant execute on function public.get_trips_with_members(uuid[]) to anon, authenticated;
grant execute on function public.add_trip_member(uuid, text, text, text) to anon, authenticated;
grant execute on function public.update_trip_data(uuid, jsonb) to anon, authenticated;
