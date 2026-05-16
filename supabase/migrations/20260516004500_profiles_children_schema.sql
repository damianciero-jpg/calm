create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'therapist', 'admin')),
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  age integer,
  avatar text default '',
  color text default '#6366F1',
  game_mode text default 'kids',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists children_parent_id_idx on public.children(parent_id);

alter table public.profiles enable row level security;
alter table public.children enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Parents can view their own children" on public.children;
create policy "Parents can view their own children"
on public.children
for select
using (auth.uid() = parent_id);

drop policy if exists "Parents can insert their own children" on public.children;
create policy "Parents can insert their own children"
on public.children
for insert
with check (auth.uid() = parent_id);

drop policy if exists "Parents can update their own children" on public.children;
create policy "Parents can update their own children"
on public.children
for update
using (auth.uid() = parent_id)
with check (auth.uid() = parent_id);

drop policy if exists "Parents can delete their own children" on public.children;
create policy "Parents can delete their own children"
on public.children
for delete
using (auth.uid() = parent_id);
