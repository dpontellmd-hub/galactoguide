-- Prepared for isolated review only. No moderator accounts are granted here.
-- Apply after schema.sql / 20260914_forum_helpful.sql, before account deletion.
begin;
alter table public.forum_replies add column if not exists deleted_at timestamptz;

create table if not exists public.forum_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.forum_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, blocked_user_id), check(user_id <> blocked_user_id)
);
create index if not exists forum_blocks_reverse_idx on public.forum_blocks(blocked_user_id,user_id);
create table if not exists public.forum_suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  thread_id uuid references public.forum_threads(id) on delete cascade,
  reply_id uuid references public.forum_replies(id) on delete cascade,
  category text not null check(category in ('harassment','hate','threat','privacy','spam','medical','other')),
  reason text not null check(char_length(trim(reason)) between 0 and 500),
  status text not null default 'open' check(status in ('open','resolved')),
  resolution text check(resolution in ('dismiss','remove','suspend')),
  created_at timestamptz not null default now(), resolved_at timestamptz,
  check(num_nonnulls(thread_id,reply_id)=1)
);
create unique index if not exists forum_reports_open_thread_idx on public.forum_reports(reporter_id,thread_id) where status='open';
create unique index if not exists forum_reports_open_reply_idx on public.forum_reports(reporter_id,reply_id) where status='open';
create index if not exists forum_reports_queue_idx on public.forum_reports(status,created_at);
create table if not exists public.forum_moderation_audit (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.forum_reports(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  subject_id uuid references auth.users(id) on delete cascade,
  action text not null check(action in ('dismiss','remove','suspend','restore')),
  created_at timestamptz not null default now()
);
-- Tiny rolling limiter records survive a post tombstone; deleted accounts erase them.
create table if not exists public.forum_post_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists forum_post_events_user_time_idx on public.forum_post_events(user_id,created_at);
alter table public.forum_moderators enable row level security;
alter table public.forum_blocks enable row level security;
alter table public.forum_suspensions enable row level security;
alter table public.forum_reports enable row level security;
alter table public.forum_moderation_audit enable row level security;
alter table public.forum_post_events enable row level security;
-- No direct table privileges or policies: even a moderator must use checked RPCs.
revoke all on public.forum_moderators,public.forum_blocks,public.forum_suspensions,public.forum_reports,public.forum_moderation_audit from public,anon,authenticated;
revoke all on public.forum_post_events from public,anon,authenticated;

create or replace function public.forum_is_moderator()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.forum_moderators where user_id=auth.uid());
$$;
create or replace function public.forum_can_see_author(p_author uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_author is null or auth.uid() is null or not exists(
  select 1 from public.forum_blocks where (user_id=auth.uid() and blocked_user_id=p_author)
    or (blocked_user_id=auth.uid() and user_id=p_author));
$$;
create or replace function public.forum_can_post()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from public.forum_suspensions where user_id=auth.uid());
$$;
create or replace function public.forum_record_post()
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.forum_can_post() then raise exception 'suspended: Posting unavailable' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':forum-post',0));
 -- Keep only the current account's last minute of rate data on its next write.
 delete from public.forum_post_events where user_id=auth.uid() and created_at<=now()-interval '1 minute';
 if (select count(*) from public.forum_post_events where user_id=auth.uid())>=5 then
  raise exception 'rate_limit: Please wait a minute before posting again' using errcode='22023';
 end if;
 insert into public.forum_post_events(user_id) values(auth.uid());
end;
$$;
create or replace function public.forum_target_available(p_kind text,p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select case when p_kind='thread' then exists(select 1 from public.forum_threads t
  where t.id=p_id and t.deleted_at is null and public.forum_can_see_author(t.user_id))
 when p_kind='reply' then exists(select 1 from public.forum_replies r join public.forum_threads t on t.id=r.thread_id
  where r.id=p_id and r.deleted_at is null and public.forum_can_see_author(r.user_id) and public.forum_can_see_author(t.user_id))
 else false end;
$$;

drop policy if exists forum_threads_read_public on public.forum_threads;
create policy forum_threads_read_public on public.forum_threads for select using(public.forum_can_see_author(user_id));
drop policy if exists forum_replies_read_public on public.forum_replies;
create policy forum_replies_read_public on public.forum_replies for select using(public.forum_can_see_author(user_id)
 and exists(select 1 from public.forum_threads t where t.id=thread_id));
drop policy if exists forum_threads_insert_authenticated on public.forum_threads;
create policy forum_threads_insert_authenticated on public.forum_threads for insert to authenticated
 with check(auth.uid()=user_id and not is_sample and deleted_at is null and public.forum_can_post());
drop policy if exists forum_threads_update_own on public.forum_threads;
create policy forum_threads_update_own on public.forum_threads for update to authenticated
 using(auth.uid()=user_id and not is_sample and deleted_at is null and public.forum_can_post())
 with check(auth.uid()=user_id and not is_sample and deleted_at is null and public.forum_can_post());
drop policy if exists forum_replies_insert_authenticated on public.forum_replies;
create policy forum_replies_insert_authenticated on public.forum_replies for insert to authenticated
 with check(auth.uid()=user_id and not is_sample and deleted_at is null and public.forum_can_post()
 and exists(select 1 from public.forum_threads t where t.id=thread_id));
drop policy if exists forum_replies_update_own on public.forum_replies;
create policy forum_replies_update_own on public.forum_replies for update to authenticated
 using(auth.uid()=user_id and not is_sample and deleted_at is null and public.forum_can_post())
 with check(auth.uid()=user_id and not is_sample and deleted_at is null and public.forum_can_post());
-- Helpful inserts are RPC-only so suspension/block checks cannot be bypassed.
drop policy if exists forum_helpful_insert_own on public.forum_helpful;
drop policy if exists forum_replies_delete_own on public.forum_replies;
-- Preserve references and report metadata while erasing an author's reply text.
create or replace function public.delete_forum_reply(p_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to delete your reply' using errcode='42501'; end if;
 update public.forum_replies set user_id=null,author_name='Deleted author',body='This reply was deleted by its author.',deleted_at=now(),updated_at=now()
 where id=p_id and user_id=auth.uid() and not is_sample and deleted_at is null returning id into result;
 if result is null then raise exception 'Reply unavailable or not yours' using errcode='42501'; end if;
 delete from public.forum_helpful where reply_id=p_id;
 return result;
end;
$$;

-- Conservative deterministic rejection; clinical/anatomical language is permitted.
-- This is a first-pass filter, not a substitute for staffed human moderation.
create or replace function public.forum_content_allowed(p_text text)
returns boolean language sql immutable set search_path='' as $$
 select regexp_replace(lower(p_text),'[[:space:]._-]+',' ','g') !~ '\m(kill yourself|i will kill you|kys|nigger|faggot|heil hitler|white power|fuck you|motherfucker)\M'
   and p_text !~* '\m(k[ ._-]*y[ ._-]*s|n[ ._-]*i[ ._-]*g[ ._-]*g[ ._-]*e[ ._-]*r)\M'
   and p_text !~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
   and p_text !~ '(\+[0-9]{1,3}[ .-]?)?\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}'
   and p_text !~* '(https?://[^[:space:]]+.*){4}'
   and p_text !~ '(.)\1{24}';
$$;
create or replace function public.forum_post_under_review(p_kind text,p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.forum_reports where status='open' and
 ((p_kind='thread' and thread_id=p_id) or (p_kind='reply' and reply_id=p_id)));
$$;
-- SECURITY INVOKER is intentional: checked definer RPCs can tombstone, ordinary
-- writes cannot forge dates/identities or bypass the content checks.
create or replace function public.guard_forum_content()
returns trigger language plpgsql set search_path='' as $$
declare candidate text;
begin
 if current_user not in ('anon','authenticated') then return new; end if;
 if not public.forum_can_post() then raise exception 'suspended: Forum posting is unavailable for this account' using errcode='42501'; end if;
 if tg_op='UPDATE' then
  if public.forum_post_under_review(case when tg_table_name='forum_threads' then 'thread' else 'reply' end,old.id) then
   raise exception 'Post is awaiting moderator review; editing is temporarily unavailable' using errcode='42501';
  end if;
  if new.user_id is distinct from old.user_id or new.id<>old.id or new.created_at<>old.created_at
   or new.deleted_at is distinct from old.deleted_at or new.is_sample<>old.is_sample then
   raise exception 'Post ownership and metadata cannot be changed' using errcode='42501';
  end if;
  if tg_table_name='forum_replies' then
   if new.thread_id<>old.thread_id or new.parent_reply_id is distinct from old.parent_reply_id then
    raise exception 'Reply destination cannot be changed' using errcode='42501';
   end if;
  end if;
 else
  perform public.forum_record_post();
  new.created_at:=now();
 end if;
 new.updated_at:=now();
 candidate:=new.author_name || ' ' || new.body;
 if tg_table_name='forum_threads' then candidate:=candidate || ' ' || new.title; end if;
 if not public.forum_content_allowed(candidate) then raise exception 'content_filter: Please revise this post to follow the community rules' using errcode='22023'; end if;
 if tg_table_name='forum_replies' then
  if not exists(select 1 from public.forum_threads where id=new.thread_id) then raise exception 'blocked: Thread unavailable' using errcode='42501'; end if;
  if new.parent_reply_id is not null and not exists(select 1 from public.forum_replies where id=new.parent_reply_id and thread_id=new.thread_id and deleted_at is null) then
   raise exception 'blocked: Reply unavailable' using errcode='42501';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists guard_forum_thread on public.forum_threads;
create trigger guard_forum_thread before insert or update on public.forum_threads for each row execute function public.guard_forum_content();
drop trigger if exists guard_forum_reply on public.forum_replies;
create trigger guard_forum_reply before insert or update on public.forum_replies for each row execute function public.guard_forum_content();

create or replace function public.get_forum_safety()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('is_moderator',public.forum_is_moderator(),
 'is_suspended',exists(select 1 from public.forum_suspensions where user_id=auth.uid()),
 'blocked_users',coalesce((select jsonb_agg(jsonb_build_object(
   'user_id',b.blocked_user_id,
   'author_name',coalesce(display.author_name,'Blocked member'),
   'reference',upper(substr(md5(b.blocked_user_id::text),1,12)))
   order by b.created_at,b.blocked_user_id)
 from public.forum_blocks b
 left join lateral (
   select posts.author_name from (
     select t.author_name,t.created_at,t.id,'thread' as kind from public.forum_threads t
       where t.user_id=b.blocked_user_id and t.deleted_at is null
     union all
     select r.author_name,r.created_at,r.id,'reply' as kind from public.forum_replies r
       where r.user_id=b.blocked_user_id and r.deleted_at is null
   ) posts order by posts.created_at desc,posts.id,posts.kind limit 1
 ) display on true
 where b.user_id=auth.uid()),'[]'::jsonb));
$$;
create or replace function public.set_forum_block(p_user_id uuid,p_blocked boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to block a member' using errcode='42501'; end if;
 if p_user_id is null or p_user_id=auth.uid() or p_blocked is null then raise exception 'Invalid block request' using errcode='22023'; end if;
 if p_blocked then
  if not exists(select 1 from public.forum_threads where user_id=p_user_id union all select 1 from public.forum_replies where user_id=p_user_id) then
   raise exception 'Member unavailable' using errcode='22023'; end if;
  insert into public.forum_blocks(user_id,blocked_user_id) values(auth.uid(),p_user_id) on conflict do nothing;
 else delete from public.forum_blocks where user_id=auth.uid() and blocked_user_id=p_user_id; end if;
 return true;
end;
$$;
create or replace function public.report_forum_post(p_kind text,p_id uuid,p_category text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; target_user uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to report a post' using errcode='42501'; end if;
 if p_category is null or p_category not in ('harassment','hate','threat','privacy','spam','medical','other')
  or p_reason is null or char_length(trim(p_reason))>500 then raise exception 'Choose a category and use at most 500 characters' using errcode='22023'; end if;
 if not public.forum_target_available(p_kind,p_id) then raise exception 'Post unavailable' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':forum-report',0));
 select id into result from public.forum_reports where reporter_id=auth.uid() and status='open'
  and ((p_kind='thread' and thread_id=p_id) or (p_kind='reply' and reply_id=p_id));
 if result is not null then return result; end if;
 if (select count(*) from public.forum_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20 then
  raise exception 'rate_limit: Report limit reached; please use the community contact for urgent concerns' using errcode='22023'; end if;
 if p_kind='thread' then select user_id into target_user from public.forum_threads where id=p_id for update;
 else select user_id into target_user from public.forum_replies where id=p_id for update; end if;
 -- Recheck after locking: author/account deletion may have won the row lock.
 if not public.forum_target_available(p_kind,p_id) then raise exception 'Post unavailable' using errcode='42501'; end if;
 insert into public.forum_reports(reporter_id,target_user_id,thread_id,reply_id,category,reason)
 values(auth.uid(),target_user,case when p_kind='thread' then p_id end,case when p_kind='reply' then p_id end,p_category,trim(p_reason)) returning id into result;
 return result;
end;
$$;

create or replace function public.moderation_queue(p_status text default 'open')
returns table(id uuid,target_kind text,target_id uuid,thread_id uuid,reason text,category text,status text,created_at timestamptz,author_id uuid,author_name text,title text,body text,resolution text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.forum_is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 if p_status is null or p_status not in ('open','resolved','all') then raise exception 'Invalid queue status' using errcode='22023'; end if;
 return query select r.id,case when r.thread_id is not null then 'thread' else 'reply' end,coalesce(r.thread_id,r.reply_id),coalesce(r.thread_id,p.thread_id),
 r.reason,r.category,r.status,r.created_at,r.target_user_id,coalesce(t.author_name,p.author_name),t.title,coalesce(t.body,p.body),r.resolution
 from public.forum_reports r left join public.forum_threads t on t.id=r.thread_id left join public.forum_replies p on p.id=r.reply_id
 where p_status='all' or r.status=p_status order by r.created_at asc limit 200;
end;
$$;
create or replace function public.moderate_forum_report(p_report_id uuid,p_action text,p_note text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare item public.forum_reports%rowtype;
begin
 if not public.forum_is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 if p_action is null or p_action not in ('dismiss','remove','suspend') then raise exception 'Invalid moderation action' using errcode='22023'; end if;
 -- Notes are deliberately not retained: avoid a second store of personal content.
 if char_length(coalesce(p_note,''))>500 then raise exception 'Note too long' using errcode='22023'; end if;
 select * into item from public.forum_reports where id=p_report_id for update;
 if not found then raise exception 'Report unavailable' using errcode='22023'; end if;
 if item.status='resolved' then
  if item.resolution=p_action then return true; end if;
  raise exception 'Report already resolved with another action; refresh the queue' using errcode='22023';
 end if;
 if p_action='suspend' then
  if item.target_user_id is null or exists(select 1 from public.forum_moderators where user_id=item.target_user_id) then
   raise exception 'Cannot suspend this account through a report' using errcode='42501'; end if;
  insert into public.forum_suspensions(user_id) values(item.target_user_id) on conflict do nothing;
 end if;
 if p_action in ('remove','suspend') then
  if item.thread_id is not null then
   update public.forum_threads set user_id=null,author_name='Removed author',title='Removed thread',body='This post was removed by a moderator.',deleted_at=now(),updated_at=now() where forum_threads.id=item.thread_id;
   delete from public.forum_helpful where thread_id=item.thread_id;
  else
   update public.forum_replies set user_id=null,author_name='Removed author',body='This post was removed by a moderator.',deleted_at=now(),updated_at=now() where forum_replies.id=item.reply_id;
   delete from public.forum_helpful where reply_id=item.reply_id;
  end if;
 end if;
 update public.forum_reports set status='resolved',resolution=p_action,resolved_at=now() where forum_reports.id=item.id;
 insert into public.forum_moderation_audit(report_id,actor_id,subject_id,action) values(item.id,auth.uid(),item.target_user_id,p_action);
 return true;
end;
$$;
create or replace function public.list_forum_suspensions()
returns table(user_id uuid,created_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.forum_is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 return query select s.user_id,s.created_at from public.forum_suspensions s order by s.created_at;
end;
$$;
create or replace function public.set_forum_suspension(p_user_id uuid,p_suspended boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.forum_is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 if p_user_id is null or p_suspended is null then raise exception 'Invalid suspension request' using errcode='22023'; end if;
 if p_suspended then raise exception 'Suspend using a reviewed report' using errcode='22023'; end if;
 delete from public.forum_suspensions where forum_suspensions.user_id=p_user_id;
 if found then insert into public.forum_moderation_audit(actor_id,subject_id,action) values(auth.uid(),p_user_id,'restore'); end if;
 return true;
end;
$$;

create or replace function public.get_forum_helpful()
returns table(target_kind text,target_id uuid,helpful_count bigint,marked_helpful boolean)
language sql stable security definer set search_path='' as $$
 select case when h.thread_id is not null then 'thread' else 'reply' end,coalesce(h.thread_id,h.reply_id),count(*),coalesce(bool_or(h.user_id=auth.uid()),false)
 from public.forum_helpful h where public.forum_target_available(case when h.thread_id is not null then 'thread' else 'reply' end,coalesce(h.thread_id,h.reply_id))
 group by h.thread_id,h.reply_id;
$$;
create or replace function public.set_forum_helpful(p_kind text,p_id uuid,p_helpful boolean)
returns table(target_kind text,target_id uuid,helpful_count bigint,marked_helpful boolean)
language plpgsql security definer set search_path='' as $$
begin
 if not public.forum_can_post() then raise exception 'suspended: Sign in with an active account to mark posts helpful' using errcode='42501'; end if;
 if p_helpful is null or not public.forum_target_available(p_kind,p_id) then raise exception 'Post unavailable' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_kind || p_id::text,0));
 if p_helpful then insert into public.forum_helpful(user_id,thread_id,reply_id)
 values(auth.uid(),case when p_kind='thread' then p_id end,case when p_kind='reply' then p_id end) on conflict do nothing;
 else delete from public.forum_helpful h where h.user_id=auth.uid() and ((p_kind='thread' and h.thread_id=p_id) or (p_kind='reply' and h.reply_id=p_id)); end if;
 return query select p_kind,p_id,count(*),coalesce(bool_or(h.user_id=auth.uid()),false) from public.forum_helpful h
 where (p_kind='thread' and h.thread_id=p_id) or (p_kind='reply' and h.reply_id=p_id);
end;
$$;

revoke all on function public.forum_is_moderator(),public.forum_can_see_author(uuid),public.forum_can_post(),public.forum_target_available(text,uuid),public.forum_content_allowed(text),public.guard_forum_content(),public.get_forum_safety(),public.set_forum_block(uuid,boolean),public.report_forum_post(text,uuid,text,text),public.moderation_queue(text),public.moderate_forum_report(uuid,text,text),public.list_forum_suspensions(),public.set_forum_suspension(uuid,boolean) from public;
grant execute on function public.forum_can_see_author(uuid),public.forum_target_available(text,uuid) to anon,authenticated;
grant execute on function public.forum_is_moderator(),public.forum_can_post(),public.forum_content_allowed(text),public.get_forum_safety(),public.set_forum_block(uuid,boolean),public.report_forum_post(text,uuid,text,text),public.moderation_queue(text),public.moderate_forum_report(uuid,text,text),public.list_forum_suspensions(),public.set_forum_suspension(uuid,boolean) to authenticated;
revoke all on function public.forum_record_post() from public;
grant execute on function public.forum_record_post() to authenticated;
revoke all on function public.forum_post_under_review(text,uuid) from public;
grant execute on function public.forum_post_under_review(text,uuid) to authenticated;
revoke all on function public.delete_forum_reply(uuid) from public;
grant execute on function public.delete_forum_reply(uuid) to authenticated;
commit;
