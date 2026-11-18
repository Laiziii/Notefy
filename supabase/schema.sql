-- Notefy: accounts and sync (step 2)
-- Run this once in the Supabase SQL Editor for your project (Notefy),
-- then redeploy. Safe to re-run: every statement only creates something
-- if it is missing.

create table if not exists public.notebooks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  class_name text not null default '',
  professor text not null default '',
  location text not null default '',
  class_time text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  name text not null default '',
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  title text not null default '',
  body text not null default '',
  body_html text not null default '',
  ai_html text not null default '',
  ai_text text not null default '',
  font text,
  font_size integer,
  spacing text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notebooks_user_idx on public.notebooks (user_id, updated_at desc);
create index if not exists topics_notebook_idx on public.topics (notebook_id);
create index if not exists topics_user_idx on public.topics (user_id);
create index if not exists notes_notebook_idx on public.notes (notebook_id);
create index if not exists notes_topic_idx on public.notes (topic_id);
create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);

alter table public.notebooks enable row level security;
alter table public.topics enable row level security;
alter table public.notes enable row level security;

-- Every signed-in user (including guests) can only ever see or change their own rows.
drop policy if exists "own notebooks" on public.notebooks;
create policy "own notebooks" on public.notebooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own topics" on public.topics;
create policy "own topics" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at current on every edit.
create or replace function public.notefy_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notebooks_touch_updated_at on public.notebooks;
create trigger notebooks_touch_updated_at
  before update on public.notebooks
  for each row execute function public.notefy_touch_updated_at();

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.notefy_touch_updated_at();

-- Let other signed-in devices see changes live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notebooks'
  ) then
    alter publication supabase_realtime add table public.notebooks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'topics'
  ) then
    alter publication supabase_realtime add table public.topics;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;
