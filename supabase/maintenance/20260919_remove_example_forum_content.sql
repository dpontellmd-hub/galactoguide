-- One-time, explicitly approved cleanup. Run as a database administrator.
-- Export the targeted threads/replies/helpful rows before executing.
-- This is deliberately outside automatic migrations. No unrelated rows are deleted.
-- Confirmed scope: six seeded threads, fourteen seeded replies, and three
-- user-confirmed test replies attached to those threads, plus their helpful votes.
begin;
lock table public.forum_threads, public.forum_replies, public.forum_helpful
  in share row exclusive mode;

do $$
declare
  thread_ids uuid[] := array[
    '80c38587-75df-4f5f-a843-43ea5fdde001',
    '80c38587-75df-4f5f-a843-43ea5fdde002',
    '80c38587-75df-4f5f-a843-43ea5fdde003',
    '80c38587-75df-4f5f-a843-43ea5fdde004',
    '80c38587-75df-4f5f-a843-43ea5fdde005',
    '80c38587-75df-4f5f-a843-43ea5fdde006'
  ]::uuid[];
  sample_reply_ids uuid[] := array[
    '70c38587-75df-4f5f-a843-43ea5fdde001',
    '70c38587-75df-4f5f-a843-43ea5fdde002',
    '70c38587-75df-4f5f-a843-43ea5fdde003',
    '70c38587-75df-4f5f-a843-43ea5fdde004',
    '70c38587-75df-4f5f-a843-43ea5fdde005',
    '70c38587-75df-4f5f-a843-43ea5fdde006',
    '70c38587-75df-4f5f-a843-43ea5fdde007',
    '70c38587-75df-4f5f-a843-43ea5fdde008',
    '70c38587-75df-4f5f-a843-43ea5fdde009',
    '70c38587-75df-4f5f-a843-43ea5fdde010',
    '70c38587-75df-4f5f-a843-43ea5fdde011',
    '70c38587-75df-4f5f-a843-43ea5fdde012',
    '70c38587-75df-4f5f-a843-43ea5fdde013',
    '70c38587-75df-4f5f-a843-43ea5fdde014'
  ]::uuid[];
  test_reply_ids uuid[] := array[
    'ed2a7671-9de3-4d7a-816a-53c080647da7',
    '447406c3-3c5b-448e-8ce2-6dda74afa986',
    '7227c9af-8c76-4ec3-99d2-3f063e900f57'
  ]::uuid[];
  removed_threads integer;
  removed_replies integer;
begin
  if exists (select 1 from public.forum_threads where id = any(thread_ids) and not is_sample)
    or exists (select 1 from public.forum_replies where id = any(sample_reply_ids) and not is_sample) then
    raise exception 'A seed row is no longer marked as sample. Review before cleanup.';
  end if;
  if exists (
    select 1 from public.forum_replies
    where thread_id = any(thread_ids)
      and not (id = any(sample_reply_ids || test_reply_ids))
  ) then
    raise exception 'Unreviewed replies exist on sample threads. Cleanup cancelled.';
  end if;
  -- A reply outside the cleanup must not lose its parent through SET NULL.
  if exists (
    select 1 from public.forum_replies
    where parent_reply_id = any(sample_reply_ids || test_reply_ids)
      and not (thread_id = any(thread_ids) and id = any(sample_reply_ids || test_reply_ids))
  ) then
    raise exception 'An unrelated reply depends on a cleanup target. Review before cleanup.';
  end if;

  delete from public.forum_replies
    where thread_id = any(thread_ids) and id = any(sample_reply_ids || test_reply_ids);
  get diagnostics removed_replies = row_count;
  delete from public.forum_threads where id = any(thread_ids) and is_sample;
  get diagnostics removed_threads = row_count;
  raise notice 'Removed % sample threads and % approved replies.', removed_threads, removed_replies;
end $$;
commit;
