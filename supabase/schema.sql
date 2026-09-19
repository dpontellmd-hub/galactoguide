-- GalactoGuide — Supabase schema for accounts, synced favorites, and synced prefs.
-- Run this once in the Supabase dashboard → SQL Editor (or via the Supabase CLI).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE-style guards where possible.

-- ───────────────────────────────────────────────────────────────────────────
-- Favorites: one row per (user, substance). Add/remove only — no updates.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.favorites (
  user_id      uuid not null references auth.users (id) on delete cascade,
  substance_id text not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, substance_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- User prefs: one row per user. The app reconciles with last-write-wins by
-- updated_at (the client sets updated_at to its local change time).
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.user_prefs (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  portal              text,
  disclaimer_accepted boolean not null default false,
  situations          jsonb not null default '[]'::jsonb,
  updated_at          timestamptz not null default now()
);

alter table public.user_prefs enable row level security;

drop policy if exists "user_prefs_all_own" on public.user_prefs;
create policy "user_prefs_all_own" on public.user_prefs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- Forum: public reading, authenticated posting. Author names are snapshots of
-- auth profile metadata so forum reads never need to expose account emails.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.forum_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  author_name text not null,
  title       text not null,
  body        text not null,
  topic       text not null,
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint forum_threads_author_length check (char_length(trim(author_name)) between 1 and 60),
  constraint forum_threads_title_length check (char_length(trim(title)) between 5 and 120),
  constraint forum_threads_body_length check (char_length(trim(body)) between 10 and 4000),
  constraint forum_threads_topic_allowed check (
    topic in ('Everyday support', 'Pumping & work', 'Getting support', 'Questions & experiences')
  )
);

create table if not exists public.forum_replies (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.forum_threads (id) on delete cascade,
  parent_reply_id uuid references public.forum_replies (id) on delete set null,
  user_id     uuid references auth.users (id) on delete set null,
  author_name text not null,
  body        text not null,
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint forum_replies_author_length check (char_length(trim(author_name)) between 1 and 60),
  constraint forum_replies_body_length check (char_length(trim(body)) between 2 and 2000)
);

alter table public.forum_replies
  add column if not exists parent_reply_id uuid references public.forum_replies (id) on delete set null;

create index if not exists forum_threads_created_at_idx
  on public.forum_threads (created_at desc);
create index if not exists forum_replies_thread_created_at_idx
  on public.forum_replies (thread_id, created_at asc);
create index if not exists forum_replies_parent_created_at_idx
  on public.forum_replies (parent_reply_id, created_at asc);

alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;

drop policy if exists "forum_threads_read_public" on public.forum_threads;
create policy "forum_threads_read_public" on public.forum_threads
  for select using (true);

drop policy if exists "forum_threads_insert_authenticated" on public.forum_threads;
create policy "forum_threads_insert_authenticated" on public.forum_threads
  for insert to authenticated
  with check (auth.uid() = user_id and is_sample = false);

drop policy if exists "forum_threads_update_own" on public.forum_threads;
create policy "forum_threads_update_own" on public.forum_threads
  for update to authenticated
  using (auth.uid() = user_id and is_sample = false)
  with check (auth.uid() = user_id and is_sample = false);

drop policy if exists "forum_threads_delete_own" on public.forum_threads;
-- Thread removal uses delete_forum_thread below so responses are preserved.

drop policy if exists "forum_replies_read_public" on public.forum_replies;
create policy "forum_replies_read_public" on public.forum_replies
  for select using (true);

drop policy if exists "forum_replies_insert_authenticated" on public.forum_replies;
create policy "forum_replies_insert_authenticated" on public.forum_replies
  for insert to authenticated
  with check (auth.uid() = user_id and is_sample = false);

drop policy if exists "forum_replies_update_own" on public.forum_replies;
create policy "forum_replies_update_own" on public.forum_replies
  for update to authenticated
  using (auth.uid() = user_id and is_sample = false)
  with check (auth.uid() = user_id and is_sample = false);

drop policy if exists "forum_replies_delete_own" on public.forum_replies;
create policy "forum_replies_delete_own" on public.forum_replies
  for delete to authenticated
  using (auth.uid() = user_id and is_sample = false);

-- Production forums start empty. Example content is not seeded.

-- Forum author deletion and helpful votes (also available as an incremental migration).
-- Apply after the existing forum schema. No existing posts are changed.
begin;

alter table public.forum_threads add column if not exists deleted_at timestamptz;
-- Remove hard deletion, including for older clients: it would cascade to replies.
drop policy if exists "forum_threads_delete_own" on public.forum_threads;
drop policy if exists "forum_threads_update_own" on public.forum_threads;
create policy "forum_threads_update_own" on public.forum_threads
  for update to authenticated
  using (auth.uid() = user_id and is_sample = false and deleted_at is null)
  with check (auth.uid() = user_id and is_sample = false and deleted_at is null);

create table if not exists public.forum_helpful (
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references public.forum_threads(id) on delete cascade,
  reply_id uuid references public.forum_replies(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint forum_helpful_one_target check (num_nonnulls(thread_id, reply_id) = 1),
  unique (thread_id, user_id),
  unique (reply_id, user_id)
);

alter table public.forum_helpful enable row level security;
drop policy if exists forum_helpful_read_own on public.forum_helpful;
create policy forum_helpful_read_own on public.forum_helpful
  for select to authenticated using (user_id = auth.uid());
drop policy if exists forum_helpful_insert_own on public.forum_helpful;
create policy forum_helpful_insert_own on public.forum_helpful
  for insert to authenticated with check (user_id = auth.uid() and
    (thread_id is null or exists (select 1 from public.forum_threads t where t.id = thread_id and t.deleted_at is null)));
drop policy if exists forum_helpful_delete_own on public.forum_helpful;
create policy forum_helpful_delete_own on public.forum_helpful
  for delete to authenticated using (user_id = auth.uid());

-- Only totals and the current viewer's selection are public, never voter IDs.
create or replace function public.get_forum_helpful()
returns table (target_kind text, target_id uuid, helpful_count bigint, marked_helpful boolean)
language sql stable security definer set search_path = '' as $$
  select case when h.thread_id is not null then 'thread' else 'reply' end,
    coalesce(h.thread_id, h.reply_id), count(*),
    coalesce(bool_or(h.user_id = auth.uid()), false)
  from public.forum_helpful h
  group by h.thread_id, h.reply_id;
$$;

-- Explicit desired state makes retries safe; uniqueness prevents duplicate votes.
create or replace function public.set_forum_helpful(p_kind text, p_id uuid, p_helpful boolean)
returns table (target_kind text, target_id uuid, helpful_count bigint, marked_helpful boolean)
language plpgsql security definer set search_path = '' as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Sign in to mark posts helpful' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('thread', 'reply') or p_id is null or p_helpful is null then
    raise exception 'Invalid helpful target' using errcode = '22023';
  end if;
  if p_kind = 'thread' then
    perform 1 from public.forum_threads where id = p_id and deleted_at is null for share;
  else
    perform 1 from public.forum_replies where id = p_id for key share;
  end if;
  if not found then raise exception 'This post is no longer available' using errcode = '23503'; end if;
  -- Serialize repeated requests from this viewer for this post, including undo.
  perform pg_advisory_xact_lock(hashtextextended(viewer::text || p_kind || p_id::text, 0));
  if p_helpful then
    insert into public.forum_helpful (user_id, thread_id, reply_id)
    values (viewer, case when p_kind = 'thread' then p_id end, case when p_kind = 'reply' then p_id end)
    on conflict do nothing;
  else
    delete from public.forum_helpful h where h.user_id = viewer
      and ((p_kind = 'thread' and h.thread_id = p_id) or (p_kind = 'reply' and h.reply_id = p_id));
  end if;
  return query select p_kind, p_id, count(*), coalesce(bool_or(h.user_id = viewer), false)
    from public.forum_helpful h
    where (p_kind = 'thread' and h.thread_id = p_id) or (p_kind = 'reply' and h.reply_id = p_id);
end;
$$;

create or replace function public.delete_forum_thread(p_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare removed_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to delete your thread' using errcode = '42501'; end if;
  update public.forum_threads set title = 'Deleted thread',
    body = 'This thread was deleted by its author.', author_name = 'Deleted author',
    user_id = null, deleted_at = now(), updated_at = now()
  where id = p_id and user_id = auth.uid() and not is_sample and deleted_at is null
  returning id into removed_id;
  if removed_id is null then raise exception 'Thread unavailable or not yours' using errcode = '42501'; end if;
  delete from public.forum_helpful where thread_id = p_id;
  return removed_id;
end;
$$;

revoke all on function public.get_forum_helpful() from public;
revoke all on function public.set_forum_helpful(text, uuid, boolean) from public;
grant execute on function public.get_forum_helpful() to anon, authenticated;
grant execute on function public.set_forum_helpful(text, uuid, boolean) to authenticated;
revoke all on function public.delete_forum_thread(uuid) from public;
grant execute on function public.delete_forum_thread(uuid) to authenticated;

commit;
