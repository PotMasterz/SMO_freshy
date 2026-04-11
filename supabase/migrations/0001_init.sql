-- SMO_freshy passcode game schema
-- Run this once in the Supabase SQL editor for a fresh project.
--
-- NOTE: Supabase Auth requires an email internally. We store
-- {username}@smo.game as the email — users only ever see/type their username.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- =============================================================
-- TABLES
-- =============================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null default '',   -- the display / login name
  display_name text,
  slot_number  int unique check (slot_number is null or (slot_number between 1 and 7)),
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.stages (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null references public.profiles(id) on delete cascade,
  order_index      int  not null check (order_index between 1 and 5),
  label            text not null default '',
  passcode_hash    text,
  max_attempts     int  not null default 3,
  cooldown_seconds int  not null default 60,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (owner_user_id, order_index)
);

create table if not exists public.stage_progress (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  stage_id      uuid not null references public.stages(id) on delete cascade,
  attempts_used int  not null default 0,
  solved        boolean not null default false,
  solved_at     timestamptz,
  locked_until  timestamptz,
  primary key (user_id, stage_id)
);

create table if not exists public.stage_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  stage_id   uuid not null references public.stages(id) on delete cascade,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

-- =============================================================
-- TRIGGER: auto-create a profile row whenever auth.users gets a new entry
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Derive username from internal email (format: username@smo.game)
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table public.profiles       enable row level security;
alter table public.stages         enable row level security;
alter table public.stage_progress enable row level security;
alter table public.stage_attempts enable row level security;

-- helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- profiles
drop policy if exists profiles_self_select  on public.profiles;
drop policy if exists profiles_self_update  on public.profiles;
drop policy if exists profiles_admin_all    on public.profiles;

create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id);

create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- stages
drop policy if exists stages_owner_select on public.stages;
drop policy if exists stages_admin_all    on public.stages;

create policy stages_owner_select on public.stages
  for select using (auth.uid() = owner_user_id);

create policy stages_admin_all on public.stages
  for all using (public.is_admin()) with check (public.is_admin());

-- stage_progress
drop policy if exists progress_self_select on public.stage_progress;
drop policy if exists progress_self_modify on public.stage_progress;
drop policy if exists progress_admin_all   on public.stage_progress;

create policy progress_self_select on public.stage_progress
  for select using (auth.uid() = user_id);

create policy progress_self_modify on public.stage_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy progress_admin_all on public.stage_progress
  for all using (public.is_admin()) with check (public.is_admin());

-- stage_attempts (writes go through service-role server route, so no insert policy for normal users)
drop policy if exists attempts_admin_select on public.stage_attempts;
create policy attempts_admin_select on public.stage_attempts
  for select using (public.is_admin());
