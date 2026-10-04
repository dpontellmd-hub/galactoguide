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
