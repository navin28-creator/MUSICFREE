create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'listener' check (role in ('listener', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'listener');
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.song_changes (
  song_id text primary key,
  title text,
  artist text,
  album text,
  composer text,
  year integer,
  cover_url text,
  tags text,
  is_deleted boolean not null default false
);

alter table public.song_changes enable row level security;

revoke all on table public.song_changes from anon, authenticated;
grant select, insert, update on table public.song_changes to authenticated;

drop policy if exists "Authenticated users can read song changes" on public.song_changes;
create policy "Authenticated users can read song changes"
  on public.song_changes
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert song changes" on public.song_changes;
create policy "Admins can insert song changes"
  on public.song_changes
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );

drop policy if exists "Admins can update song changes" on public.song_changes;
create policy "Admins can update song changes"
  on public.song_changes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );
