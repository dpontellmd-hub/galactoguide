-- REVIEW ONLY. Apply to an isolated project after the base schema and moderation
-- migration. Disabled until a separately approved operator configures retention.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.account_deletion_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  retention_strategy text check (retention_strategy = 'erase_owned_content_v1')
);
revoke all on private.account_deletion_config from public, anon, authenticated;
insert into private.account_deletion_config(singleton) values (true) on conflict do nothing;

create or replace function public.delete_own_account(p_confirmation text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  login_time numeric;
  now_seconds numeric := extract(epoch from clock_timestamp());
begin
  if owner_id is null then raise exception 'deletion_session_invalid' using errcode = '42501'; end if;
  if p_confirmation is distinct from 'DELETE' then
    raise exception 'deletion_confirmation_required' using errcode = '22023';
  end if;
  if not exists (select 1 from private.account_deletion_config
    where singleton and enabled and retention_strategy = 'erase_owned_content_v1') then
    raise exception 'deletion_disabled' using errcode = '42501';
  end if;

  -- AMR is signed by GoTrue. JWT iat/exp only show a token refresh, not a fresh
  -- sign-in. Missing/malformed AMR must fail closed. Do not accept client dates.
  if jsonb_typeof(auth.jwt()->'amr') = 'array' then
    select max((entry->>'timestamp')::numeric) into login_time
    from jsonb_array_elements(auth.jwt()->'amr') entry
    where entry->>'method' in ('password', 'oauth', 'otp')
      and jsonb_typeof(entry->'timestamp') = 'number';
  end if;
  if login_time is null or login_time < now_seconds - 300 or login_time > now_seconds + 30 then
    raise exception 'deletion_reauthentication_required' using errcode = '42501';
  end if;

  -- Lock the authenticated user before writes; concurrent deletes cannot race.
  perform 1 from auth.users where id = owner_id for update;
  if not found then raise exception 'deletion_session_invalid' using errcode = '42501'; end if;
  -- Apple requires server-side authorization revocation. No key or token is
  -- available in this phase. A config flag alone cannot bypass this hard gate.
  if exists (select 1 from auth.identities where user_id = owner_id and provider = 'apple') then
    raise exception 'deletion_apple_revocation_required' using errcode = '42501';
  end if;

  -- Do not hard-delete discussion trees: other people's responses are theirs.
  -- Clear votes on removed content as well as the departing user's own votes.
  delete from public.forum_helpful where
    thread_id in (select id from public.forum_threads where user_id = owner_id)
    or reply_id in (select id from public.forum_replies where user_id = owner_id);
  update public.forum_threads set title = 'Deleted thread',
    body = 'This content was removed when its author deleted their account.',
    author_name = 'Deleted account', user_id = null, deleted_at = now(), updated_at = now()
    where user_id = owner_id;
  update public.forum_replies set
    body = 'This content was removed when its author deleted their account.',
    author_name = 'Deleted account', user_id = null, deleted_at = now(), updated_at = now()
    where user_id = owner_id;

  -- All steps share one transaction. An FK/trigger failure rolls everything back.
  -- Existing user-data FKs cascade favorites/prefs/votes/auth sessions/identities.
  -- Moderation FKs also erase reports by/about this user and their report audit,
  -- blocks, suspensions and moderator membership. No content snapshots remain.
  delete from auth.users where id = owner_id;
  return true;
end;
$$;
revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;
commit;
