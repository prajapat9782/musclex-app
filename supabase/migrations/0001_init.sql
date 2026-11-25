-- MuscleX — initial schema
-- Run in Supabase: SQL Editor → paste → Run (or `supabase db push` with the CLI).
-- Every table has Row Level Security: users can only read and write their own rows.

-- ---------------------------------------------------------------------------
-- Profiles (one row per user, created by the in-app setup flow)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null default '',
  sex           text not null default 'male' check (sex in ('male', 'female')),
  age           int  not null default 26 check (age between 13 and 100),
  height_cm     numeric(5,1) not null default 178 check (height_cm between 100 and 250),
  weight_kg     numeric(5,1) not null default 72  check (weight_kg between 30 and 300),
  target_kg     numeric(5,1) not null default 68  check (target_kg between 30 and 300),
  goal          text not null default 'muscle' check (goal in ('lose', 'gain', 'muscle', 'maintain', 'recomp')),
  activity      text not null default 'moderate' check (activity in ('sedentary', 'light', 'moderate', 'very', 'athlete')),
  level         text not null default 'intermediate' check (level in ('beginner', 'intermediate', 'advanced')),
  days_per_week int  not null default 4 check (days_per_week between 1 and 7),
  units         text not null default 'metric' check (units in ('metric', 'imperial')),
  news_topics   text[] not null default '{}',
  is_public     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: public can read"  on public.profiles for select using (is_public);
create policy "profiles: owner can insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: owner can update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Food diary entries. Nutrition is stored per serving as a snapshot, so a
-- later change in a food database never rewrites someone's history.
-- ---------------------------------------------------------------------------
create table if not exists public.food_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  eaten_on    date not null,
  slot        text not null check (slot in ('breakfast', 'lunch', 'snack', 'dinner')),
  source      text not null default 'custom' check (source in ('local', 'off', 'usda', 'custom')),
  ref         text,
  name        text not null,
  serving     text not null default '1 serving',
  kcal        numeric(7,1) not null default 0 check (kcal >= 0),
  protein     numeric(6,1) not null default 0 check (protein >= 0),
  carbs       numeric(6,1) not null default 0 check (carbs >= 0),
  fat         numeric(6,1) not null default 0 check (fat >= 0),
  quantity    numeric(6,2) not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now()
);

create index if not exists food_entries_user_day on public.food_entries (user_id, eaten_on);
alter table public.food_entries enable row level security;
create policy "food_entries: owner all" on public.food_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Saved meals ("My meals")
-- ---------------------------------------------------------------------------
create table if not exists public.saved_meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.saved_meals enable row level security;
create policy "saved_meals: owner all" on public.saved_meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Water (one row per user per day)
-- ---------------------------------------------------------------------------
create table if not exists public.water_logs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on  date not null,
  ml         int  not null default 0 check (ml >= 0),
  primary key (user_id, logged_on)
);

alter table public.water_logs enable row level security;
create policy "water_logs: owner all" on public.water_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Daily habits (workout, sleep, steps …). A row means "done that day".
-- Streaks are computed from these rows.
-- ---------------------------------------------------------------------------
create table if not exists public.habit_logs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on  date not null,
  habit      text not null,
  primary key (user_id, logged_on, habit)
);

alter table public.habit_logs enable row level security;
create policy "habit_logs: owner all" on public.habit_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Body weight history (used by Progress in the next build)
-- ---------------------------------------------------------------------------
create table if not exists public.weight_logs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on  date not null,
  weight_kg  numeric(5,1) not null check (weight_kg between 30 and 300),
  primary key (user_id, logged_on)
);

alter table public.weight_logs enable row level security;
create policy "weight_logs: owner all" on public.weight_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Keep profiles.updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- In-app account deletion (required by the App Store and Google Play).
-- Deletes the caller's auth user; every table above cascades.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
