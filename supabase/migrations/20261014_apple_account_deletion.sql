-- Isolated preparation only. Both deletion gates remain disabled by default.
begin;
alter table private.account_deletion_config add column if not exists apple_revocation_enabled boolean not null default false;

-- One transaction implementation for both existing self-delete and verified Apple deletion.
create or replace function private.erase_account_data(owner_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
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
end; $$;
revoke all on function private.erase_account_data(uuid) from public, anon, authenticated, service_role;

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
  -- Apple must use the separate service-only path after verified revocation.
  -- No client flag or public RPC argument can bypass this hard gate.
  if exists (select 1 from auth.identities where user_id = owner_id and provider = 'apple') then
    raise exception 'deletion_apple_revocation_required' using errcode = '42501';
  end if;

  return private.erase_account_data(owner_id);
end;
$$;
revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

create table if not exists private.apple_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  apple_subject text not null,
  nonce_sha256 text not null check (nonce_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check (status in ('pending','exchanging')),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default clock_timestamp() + interval '5 minutes'
);
create index if not exists apple_deletion_owner_created on private.apple_deletion_requests(owner_id,created_at);
alter table private.apple_deletion_requests enable row level security;
revoke all on private.apple_deletion_requests from public,anon,authenticated,service_role;

-- Backend-only helper. Inputs are derived from Auth-validated bearer claims,
-- never from a user-supplied owner/subject. Re-check the DB session and identity.
create or replace function private.check_apple_deletion(p_owner uuid,p_session uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare subject text; identity_count integer;
begin
  if not exists(select 1 from private.account_deletion_config where singleton and enabled
    and apple_revocation_enabled and retention_strategy='erase_owned_content_v1') then
    raise exception 'apple_deletion_disabled' using errcode='42501';
  end if;
  perform 1 from auth.users where id=p_owner for update;
  if not found or not exists(select 1 from auth.sessions where id=p_session and user_id=p_owner) then
    raise exception 'deletion_session_invalid' using errcode='42501';
  end if;
  select count(*),min(identity_data->>'sub') into identity_count,subject
    from auth.identities where user_id=p_owner and provider='apple';
  if identity_count<>1 or subject is null or length(subject)=0 then
    raise exception 'apple_identity_required' using errcode='42501';
  end if;
  return subject;
end; $$;
revoke all on function private.check_apple_deletion(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.begin_apple_account_deletion(p_owner uuid,p_session uuid,p_nonce_sha256 text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare subject text; request_id uuid;
begin
  subject:=private.check_apple_deletion(p_owner,p_session);
  -- No tokens/codes in storage. Opportunistic 24-hour metadata cleanup.
  delete from private.apple_deletion_requests where created_at < clock_timestamp()-interval '24 hours';
  if (select count(*) from private.apple_deletion_requests where owner_id=p_owner
      and created_at>clock_timestamp()-interval '10 minutes')>=5 then
    raise exception 'apple_deletion_rate_limited' using errcode='42501';
  end if;
  insert into private.apple_deletion_requests(owner_id,session_id,apple_subject,nonce_sha256)
    values(p_owner,p_session,subject,p_nonce_sha256) returning id into request_id;
  return request_id;
end; $$;

create or replace function public.claim_apple_account_deletion(p_owner uuid,p_session uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare subject text; challenge private.apple_deletion_requests%rowtype;
begin
  subject:=private.check_apple_deletion(p_owner,p_session);
  update private.apple_deletion_requests set status='exchanging' where id=p_request
    and owner_id=p_owner and session_id=p_session and apple_subject=subject
    and status='pending' and expires_at>clock_timestamp() returning * into challenge;
  if not found then raise exception 'apple_challenge_invalid' using errcode='42501'; end if;
  return jsonb_build_object('apple_subject',challenge.apple_subject,'nonce_sha256',challenge.nonce_sha256);
end; $$;

-- Only the Edge Function's service role can call this, ONLY after an Apple 200
-- revocation response and verified signature/audience/subject/nonce. Public
-- delete_own_account keeps its hard Apple gate, including for multi-provider users.
create or replace function public.finish_apple_account_deletion(p_owner uuid,p_session uuid,p_request uuid,p_confirmation text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare subject text;
begin
  if p_confirmation is distinct from 'DELETE' then
    raise exception 'deletion_confirmation_required' using errcode='22023';
  end if;
  subject:=private.check_apple_deletion(p_owner,p_session);
  perform 1 from private.apple_deletion_requests where id=p_request
    and owner_id=p_owner and session_id=p_session and apple_subject=subject
    and status='exchanging' and expires_at>clock_timestamp() for update;
  if not found then raise exception 'apple_challenge_invalid' using errcode='42501'; end if;
  return private.erase_account_data(p_owner);
end; $$;
revoke all on function public.begin_apple_account_deletion(uuid,uuid,text),
  public.claim_apple_account_deletion(uuid,uuid,uuid),
  public.finish_apple_account_deletion(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.begin_apple_account_deletion(uuid,uuid,text),
  public.claim_apple_account_deletion(uuid,uuid,uuid),
  public.finish_apple_account_deletion(uuid,uuid,uuid,text) to service_role;
commit;
