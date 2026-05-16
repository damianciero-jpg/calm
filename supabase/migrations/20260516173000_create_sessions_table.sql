create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade,
  mood text not null,
  stars integer not null default 1,
  game text,
  world text,
  day_label text,
  played_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;

drop policy if exists sessions_parent_select on public.sessions;
drop policy if exists sessions_parent_insert on public.sessions;
drop policy if exists sessions_parent_update on public.sessions;
drop policy if exists sessions_parent_delete on public.sessions;

create policy sessions_parent_select
on public.sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = sessions.child_id
      and children.parent_id = auth.uid()
  )
);

create policy sessions_parent_insert
on public.sessions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.children
    where children.id = sessions.child_id
      and children.parent_id = auth.uid()
  )
);

create policy sessions_parent_update
on public.sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = sessions.child_id
      and children.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.children
    where children.id = sessions.child_id
      and children.parent_id = auth.uid()
  )
);

create policy sessions_parent_delete
on public.sessions
for delete
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = sessions.child_id
      and children.parent_id = auth.uid()
  )
);
