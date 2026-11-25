-- LinguaSpark backend schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: everything uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
--
-- Trust model (read this before shipping):
--   * Subscription tier is SERVER-WRITTEN ONLY (RevenueCat webhook -> subscription_entitlements).
--     The app can read its own row, never write it.
--   * XP, gems and streaks are written by the app. That is fine for a learning app but a determined
--     user can cheat the leaderboard. To harden, move XP writes into an Edge Function that validates lessons.


-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text        not null default 'Learner',
  xp            integer     not null default 0 check (xp >= 0),
  gems          integer     not null default 0 check (gems >= 0),
  streak        integer     not null default 0 check (streak >= 0),
  best_streak   integer     not null default 0 check (best_streak >= 0),
  daily_goal    integer     not null default 20 check (daily_goal in (10, 20, 30, 50)),
  course_id     text,
  native_lang   text,
  target_lang   text,
  league_tier   integer     not null default 0 check (league_tier between 0 and 9),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- create the profile row automatically when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Learner'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- curriculum (read-only for the app)
create table if not exists public.courses (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  title       text        not null,
  native_lang text        not null,
  target_lang text        not null,
  -- the same compact JSON the in-app Curriculum Studio imports; the app reads THIS column
  spec        jsonb       not null,
  published   boolean     not null default false,
  created_at  timestamptz not null default now()
);
-- normalized mirrors for dashboards / editors (filled by seed.sql)
create table if not exists public.units (
  id        text primary key,
  course_id text    not null references public.courses (id) on delete cascade,
  position  integer not null,
  title     text    not null,
  content   jsonb   not null
);
create table if not exists public.lessons (
  id       text primary key,
  unit_id  text    not null references public.units (id) on delete cascade,
  position integer not null,
  kind     text    not null check (kind in ('lesson', 'story', 'timed')),
  title    text    not null,
  content  jsonb   not null
);
alter table public.courses enable row level security;
alter table public.units   enable row level security;
alter table public.lessons enable row level security;
drop policy if exists "courses read published" on public.courses;
create policy "courses read published" on public.courses for select to anon, authenticated using (published);
drop policy if exists "units read published" on public.units;
create policy "units read published" on public.units for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.published));
drop policy if exists "lessons read published" on public.lessons;
create policy "lessons read published" on public.lessons for select to anon, authenticated
  using (exists (select 1 from public.units u join public.courses c on c.id = u.course_id where u.id = unit_id and c.published));

-- ---------------------------------------------------------------- progress + mistakes
create table if not exists public.user_progress (
  user_id       uuid    not null references auth.users (id) on delete cascade,
  course_id     text    not null,
  lesson_id     text    not null,
  completions   integer not null default 1 check (completions >= 0),
  best_accuracy real    not null default 0 check (best_accuracy between 0 and 1),
  completed_at  timestamptz not null default now(),
  primary key (user_id, course_id, lesson_id)
);
create table if not exists public.mistakes_bank (
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  course_id   text not null,
  lesson_id   text not null,
  logged_at   timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
alter table public.user_progress enable row level security;
alter table public.mistakes_bank enable row level security;
drop policy if exists "progress own" on public.user_progress;
create policy "progress own" on public.user_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "mistakes own" on public.mistakes_bank;
create policy "mistakes own" on public.mistakes_bank for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- leagues
create table if not exists public.leagues (
  tier  integer primary key check (tier between 0 and 9),
  name  text not null,
  color text not null
);
insert into public.leagues (tier, name, color) values
  (0, 'Bronze', '#CD7F32'), (1, 'Silver', '#B8C0C8'), (2, 'Gold', '#FFC800'), (3, 'Sapphire', '#2F6BFF'),
  (4, 'Ruby', '#E0245E'), (5, 'Emerald', '#00B26B'), (6, 'Amethyst', '#9B59FF'), (7, 'Pearl', '#F2D7E8'),
  (8, 'Obsidian', '#3A3A4A'), (9, 'Diamond', '#4DD9FF')
on conflict (tier) do nothing;

-- one row per user per week. Everyone signed in can read the board (names + weekly XP only).
create table if not exists public.league_members (
  user_id      uuid    not null references auth.users (id) on delete cascade,
  week_id      text    not null,           -- Monday date, e.g. 2026-11-23
  tier         integer not null default 0 references public.leagues (tier),
  weekly_xp    integer not null default 0 check (weekly_xp >= 0),
  display_name text    not null default 'Learner',
  updated_at   timestamptz not null default now(),
  primary key (user_id, week_id)
);
create index if not exists league_members_board on public.league_members (week_id, tier, weekly_xp desc);
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
drop policy if exists "leagues read" on public.leagues;
create policy "leagues read" on public.leagues for select to anon, authenticated using (true);
drop policy if exists "league board read" on public.league_members;
create policy "league board read" on public.league_members for select to authenticated using (true);
drop policy if exists "league own write" on public.league_members;
create policy "league own write" on public.league_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "league own update" on public.league_members;
create policy "league own update" on public.league_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- friend quests (scaffold: the app simulates the partner for now)
create table if not exists public.friend_quests (
  id         uuid primary key default gen_random_uuid(),
  week_id    text    not null,
  user_a     uuid    not null references auth.users (id) on delete cascade,
  user_b     uuid    not null references auth.users (id) on delete cascade,
  target_xp  integer not null default 250,
  a_xp       integer not null default 0,
  b_xp       integer not null default 0,
  claimed_a  boolean not null default false,
  claimed_b  boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);
alter table public.friend_quests enable row level security;
drop policy if exists "friend quests members" on public.friend_quests;
create policy "friend quests members" on public.friend_quests for select to authenticated using (auth.uid() in (user_a, user_b));

-- ---------------------------------------------------------------- subscriptions (SERVER-WRITTEN ONLY)
create table if not exists public.subscription_entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  tier       text not null check (tier in ('free', 'super', 'family', 'max')),
  source     text not null default 'revenuecat',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscription_entitlements enable row level security;
drop policy if exists "entitlement read own" on public.subscription_entitlements;
create policy "entitlement read own" on public.subscription_entitlements for select to authenticated using (user_id = auth.uid());
-- deliberately NO insert/update/delete policies: only the service role (webhook) can write.

-- ---------------------------------------------------------------- family plan
create table if not exists public.family_groups (
  code       text primary key check (code ~ '^[A-Z0-9]{6}$'),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  code      text not null references public.family_groups (code) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.family_groups  enable row level security;
alter table public.family_members enable row level security;

drop policy if exists "family owner read" on public.family_groups;
create policy "family owner read" on public.family_groups for select to authenticated using (owner_id = auth.uid());
-- Only people with an active 'family' entitlement may own a group. Remove the EXISTS clause while testing without RevenueCat.
drop policy if exists "family owner create" on public.family_groups;
create policy "family owner create" on public.family_groups for insert to authenticated
  with check (owner_id = auth.uid() and exists (
    select 1 from public.subscription_entitlements e
    where e.user_id = auth.uid() and e.tier = 'family' and (e.expires_at is null or e.expires_at > now())));
drop policy if exists "family member read own" on public.family_members;
create policy "family member read own" on public.family_members for select to authenticated using (user_id = auth.uid());

-- join by 6-character code: owner + 5 members max
create or replace function public.join_family(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from family_groups where code = upper(p_code)) then raise exception 'That family code does not exist'; end if;
  select count(*) into n from family_members where code = upper(p_code);
  if n >= 5 then raise exception 'This family plan is full (5 members)'; end if;
  insert into family_members (code, user_id) values (upper(p_code), auth.uid()) on conflict do nothing;
end $$;

-- members of a group, visible only to the owner and members
create or replace function public.family_members(p_code text)
returns table (user_id uuid, display_name text, streak integer, xp integer)
language plpgsql security definer set search_path = public as $$
begin
  if not (
    exists (select 1 from family_groups g where g.code = upper(p_code) and g.owner_id = auth.uid())
    or exists (select 1 from family_members m where m.code = upper(p_code) and m.user_id = auth.uid())
  ) then
    return;
  end if;
  return query
    select p.id, p.display_name, p.streak, p.xp
    from profiles p
    where p.id in (select m.user_id from family_members m where m.code = upper(p_code))
       or p.id = (select g.owner_id from family_groups g where g.code = upper(p_code));
end $$;

revoke all on function public.join_family(text) from public, anon;
revoke all on function public.family_members(text) from public, anon;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.family_members(text) to authenticated;
