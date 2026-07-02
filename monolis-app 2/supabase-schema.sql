-- ============================================================
-- monolis — Supabase schema
-- Supabase ダッシュボードの「SQL Editor」に貼り付けて実行してください。
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- trips: 旅行本体。持ち物・タスク・旅程・お金・その他は
-- すべて data(jsonb) にまとめて保存する（画面側の構造とそろえてシンプルにしています）
-- ------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  cover text not null default 'linear-gradient(135deg,#4F8EF7 0%,#7BB4FF 100%)',
  owner_id uuid not null references auth.users(id) on delete cascade,
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

-- ------------------------------------------------------------
-- trip_members: 誰がどの旅行のメンバーか。招待URLを踏んで
-- ログインしたユーザーはここに自分の行を追加することで「参加」する
-- ------------------------------------------------------------
create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  initial text not null,
  color text not null,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

-- ------------------------------------------------------------
-- RLS の無限再帰を避けるための security definer 関数
-- ------------------------------------------------------------
create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id and user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- trips のポリシー
-- ------------------------------------------------------------
drop policy if exists "members can view trip" on public.trips;
create policy "members can view trip" on public.trips
  for select using (public.is_trip_member(id));

drop policy if exists "members can update trip" on public.trips;
create policy "members can update trip" on public.trips
  for update using (public.is_trip_member(id));

drop policy if exists "authenticated users can create trip" on public.trips;
create policy "authenticated users can create trip" on public.trips
  for insert with check (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- trip_members のポリシー
-- ------------------------------------------------------------
drop policy if exists "members can view membership" on public.trip_members;
create policy "members can view membership" on public.trip_members
  for select using (public.is_trip_member(trip_id));

-- 招待URLを知っている（＝trip_id を知っている）ログイン済みユーザーは
-- 自分自身をメンバーとして追加できる
drop policy if exists "authenticated user can join via invite link" on public.trip_members;
create policy "authenticated user can join via invite link" on public.trip_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "members can remove themselves" on public.trip_members;
create policy "members can remove themselves" on public.trip_members
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 旅行を作成したら、作成者を自動的に最初のメンバーとして登録する
-- ------------------------------------------------------------
create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, display_name, initial, color)
  values (
    new.id,
    new.owner_id,
    coalesce((select split_part(email, '@', 1) from auth.users where id = new.owner_id), 'あなた'),
    'A',
    '#4F8EF7'
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- ------------------------------------------------------------
-- updated_at を自動更新
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- リアルタイム同期を有効化（同じ旅行を見ている全員に変更を配信する）
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.trip_members;
