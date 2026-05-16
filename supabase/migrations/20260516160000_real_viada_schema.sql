create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'parent',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null,
  name text not null,
  age int,
  avatar text default '',
  color text default '#6366F1',
  game_mode text default 'kids',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint children_parent_id_fkey
    foreign key (parent_id) references public.profiles(id) on delete cascade
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  mood text not null,
  stars int not null default 1,
  game text,
  world text,
  day_label text,
  played_at timestamptz default now(),
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  child_id uuid references public.children(id) on delete cascade,
  type text not null default 'alert',
  title text not null,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

create table public.iep_goals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  label text not null,
  score int default 0,
  max_score int default 5,
  created_at timestamptz default now()
);

create table public.therapist_notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  therapist_id uuid references public.profiles(id) on delete set null,
  content text,
  created_at timestamptz default now()
);

create index children_parent_id_idx on public.children(parent_id);
create index sessions_child_id_played_at_idx on public.sessions(child_id, played_at desc);
create index notifications_recipient_id_created_at_idx on public.notifications(recipient_id, created_at desc);
create index iep_goals_child_id_idx on public.iep_goals(child_id);
create index therapist_notes_child_id_idx on public.therapist_notes(child_id);
create index therapist_notes_therapist_id_idx on public.therapist_notes(therapist_id);

create or replace function public.is_therapist(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = user_id
      and profiles.role = 'therapist'
  );
$$;

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.sessions enable row level security;
alter table public.notifications enable row level security;
alter table public.iep_goals enable row level security;
alter table public.therapist_notes enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_therapist_select
on public.profiles
for select
to authenticated
using (public.is_therapist(auth.uid()));

create policy children_parent_select
on public.children
for select
to authenticated
using (parent_id = auth.uid());

create policy children_parent_insert
on public.children
for insert
to authenticated
with check (parent_id = auth.uid());

create policy children_parent_update
on public.children
for update
to authenticated
using (parent_id = auth.uid())
with check (parent_id = auth.uid());

create policy children_parent_delete
on public.children
for delete
to authenticated
using (parent_id = auth.uid());

create policy children_therapist_select
on public.children
for select
to authenticated
using (public.is_therapist(auth.uid()));

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

create policy sessions_therapist_select
on public.sessions
for select
to authenticated
using (public.is_therapist(auth.uid()));

create policy notifications_recipient_select
on public.notifications
for select
to authenticated
using (recipient_id = auth.uid());

create policy notifications_recipient_update
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy iep_goals_parent_select
on public.iep_goals
for select
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = iep_goals.child_id
      and children.parent_id = auth.uid()
  )
);

create policy iep_goals_parent_insert
on public.iep_goals
for insert
to authenticated
with check (
  exists (
    select 1
    from public.children
    where children.id = iep_goals.child_id
      and children.parent_id = auth.uid()
  )
);

create policy iep_goals_parent_update
on public.iep_goals
for update
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = iep_goals.child_id
      and children.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.children
    where children.id = iep_goals.child_id
      and children.parent_id = auth.uid()
  )
);

create policy iep_goals_parent_delete
on public.iep_goals
for delete
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = iep_goals.child_id
      and children.parent_id = auth.uid()
  )
);

create policy iep_goals_therapist_select
on public.iep_goals
for select
to authenticated
using (public.is_therapist(auth.uid()));

create policy therapist_notes_parent_select
on public.therapist_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = therapist_notes.child_id
      and children.parent_id = auth.uid()
  )
);

create policy therapist_notes_therapist_select
on public.therapist_notes
for select
to authenticated
using (therapist_id = auth.uid());

create policy therapist_notes_therapist_insert
on public.therapist_notes
for insert
to authenticated
with check (therapist_id = auth.uid());

create policy therapist_notes_therapist_update
on public.therapist_notes
for update
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());
