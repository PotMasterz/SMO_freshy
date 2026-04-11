-- Migration: switch profiles from email to username
-- Run this ONLY if you already executed 0001_init.sql.
-- If starting fresh, 0001_init.sql already includes these changes.

alter table public.profiles
  rename column email to _email_old;

alter table public.profiles
  add column if not exists username text unique not null default '';

-- Back-fill: derive username from the internal email (format: user@smo.game)
update public.profiles
  set username = split_part(_email_old, '@', 1)
  where username = '';

alter table public.profiles
  drop column _email_old;

-- Update the trigger to use the new column name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;
