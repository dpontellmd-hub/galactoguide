-- Apply ONCE while Confirm email is still enabled. Do not backfill again after
-- disabling it: Supabase then auto-confirms email without proving ownership.
begin;
create table public.email_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  email_started_at timestamptz not null default now(),
  verified_at timestamptz
);
alter table public.email_verifications enable row level security;
revoke all on public.email_verifications from anon, authenticated;

insert into public.email_verifications(user_id, email, email_started_at, verified_at)
select id, email, created_at, email_confirmed_at from auth.users where email is not null;

create function public.track_email_verification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null then
    insert into public.email_verifications(user_id, email, email_started_at)
    values(new.id, new.email, now())
    on conflict(user_id) do update set email = excluded.email,
      email_started_at = excluded.email_started_at, verified_at = null;
  else
    delete from public.email_verifications where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.track_email_verification() from public, anon, authenticated;
create trigger track_email_verification_insert after insert on auth.users
for each row execute function public.track_email_verification();
create trigger track_email_verification_change after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.track_email_verification();

-- PostgREST validates the JWT before this RPC runs. Only its signed AMR claims
-- (not user_metadata, email_confirmed_at, or client parameters) prove a link was
-- used. OTP alone is deliberately excluded: it may have been delivered by SMS.
create function public.email_verification_status() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_id uuid := auth.uid();
  claims jsonb := auth.jwt();
  record public.email_verifications;
  email_proven boolean;
begin
  if current_id is null then raise exception 'Sign in first'; end if;
  select v.* into record from public.email_verifications v
    join auth.users u on u.id = v.user_id and u.email = v.email
    where v.user_id = current_id for update of v;
  if not found then return false; end if;
  if record.verified_at is not null then return true; end if;
  if claims->>'email' is distinct from record.email then return false; end if;

  select exists (
    select 1 from jsonb_array_elements(coalesce(claims->'amr', '[]'::jsonb)) evidence
    where evidence->>'method' in ('magiclink', 'recovery', 'email_change')
      and (evidence->>'timestamp')::numeric >= floor(extract(epoch from record.email_started_at))
  ) into email_proven;

  -- Google supplies verified ownership; auth.identities is not client-writable.
  if not email_proven then
    select exists (select 1 from auth.identities i
      where i.user_id = current_id and i.provider = 'google'
        and i.identity_data->>'email' = record.email
        and i.identity_data->>'email_verified' = 'true') into email_proven;
  end if;
  if email_proven then
    update public.email_verifications set verified_at = now() where user_id = current_id;
  end if;
  return email_proven;
end;
$$;
revoke all on function public.email_verification_status() from public, anon;
grant execute on function public.email_verification_status() to authenticated;
commit;
