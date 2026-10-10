// Real SQL in a disposable in-memory PostgreSQL fixture. No Supabase connections.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(process.env.FORUM_TEST_RUNTIME ?? '.', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
const thread = '00000000-0000-4000-8000-000000000003';
const reply = '00000000-0000-4000-8000-000000000004';
const ownReply = '00000000-0000-4000-8000-000000000005';
const report = '00000000-0000-4000-8000-000000000006';
const now = () => Math.floor(Date.now() / 1000);
const claims = (time = now()) => ({ amr: [{ method: 'password', timestamp: time }], iat: now() });
const asUser = async (id, jwt = claims()) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [id ?? '', JSON.stringify(jwt)]);
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
};
const remove = (confirmation = 'DELETE') => db.query('select public.delete_own_account($1) as deleted', [confirmation]);
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade, provider text);
    create table auth.sessions(user_id uuid references auth.users(id) on delete cascade);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid(),auth.jwt() to anon,authenticated;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
  `);
  for (const file of ['supabase/schema.sql', 'supabase/migrations/20261010_forum_moderation.sql', 'supabase/migrations/20261011_account_deletion.sql']) await db.exec(readFileSync(file, 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261011_account_deletion.sql', 'utf8')); // migration retry
  await db.query('insert into auth.users values($1),($2)', [alice, bob]);
  await db.query("insert into auth.identities values($1,'email'),($2,'email')", [alice, bob]);
  await db.query('insert into auth.sessions values($1),($2)', [alice, bob]);
  await db.query(`insert into public.forum_threads(id,user_id,author_name,title,body,topic)
    values($1,$2,'Alice','Alice private title','Alice personal content','Everyday support')`, [thread, alice]);
  await db.query(`insert into public.forum_replies(id,thread_id,user_id,author_name,body)
    values($1,$2,$3,'Bob','Keep Bob response'),($4,$2,$5,'Alice','Erase Alice response')`, [reply, thread, bob, ownReply, alice]);
  await db.query("insert into public.favorites(user_id,substance_id) values($1,'oats'),($2,'oats')", [alice, bob]);
  await db.query('insert into public.user_prefs(user_id) values($1),($2)', [alice, bob]);
  await db.query('insert into public.forum_helpful(user_id,reply_id) values($1,$2),($3,$4)', [alice, reply, bob, ownReply]);
  await db.query('insert into public.forum_blocks(user_id,blocked_user_id) values($1,$2)', [bob, alice]);
  await db.query('insert into public.forum_moderators(user_id) values($1)', [alice]);
  await db.query('insert into public.forum_suspensions(user_id) values($1)', [alice]);
  await db.query(`insert into public.forum_reports(id,reporter_id,target_user_id,thread_id,category,reason)
    values($1,$2,$3,$4,'privacy','Private reported content')`, [report, bob, alice, thread]);
  await db.query("insert into public.forum_moderation_audit(report_id,actor_id,subject_id,action) values($1,$2,$3,'remove')", [report, bob, alice]);

  await asUser(null);
  await assert.rejects(remove(), /permission denied/);
  await asUser(alice);
  await assert.rejects(db.exec('update private.account_deletion_config set enabled=true'), /permission denied/);
  await assert.rejects(remove(), /deletion_disabled/);
  await db.exec('reset role; update private.account_deletion_config set enabled=true');
  await asUser(alice);
  await assert.rejects(remove(), /deletion_disabled/, 'Retention strategy must be approved too');
  await db.exec("reset role; update private.account_deletion_config set retention_strategy='erase_owned_content_v1'");
  await asUser(alice);
  for (const input of ['', 'delete', 'DELETE ', null]) await assert.rejects(remove(input), /deletion_confirmation_required/);
  for (const jwt of [claims(now() - 301), claims(now() + 60), {}, { amr: 'bad' }, { amr: [{ method: 'token_refresh', timestamp: now() }] }, { amr: [{ method: 'password', timestamp: 'oops' }] }]) {
    await asUser(alice, jwt);
    await assert.rejects(remove(), /deletion_reauthentication_required/);
  }
  await db.exec('reset role');
  await db.query("insert into auth.identities values($1,'apple')", [alice]);
  await asUser(alice);
  await assert.rejects(remove(), /deletion_apple_revocation_required/);
  await db.exec("reset role; delete from auth.identities where provider='apple'");

  // Prove the privacy scrub cannot partly commit if the final auth delete fails.
  await db.exec(`create function auth.prevent_fixture_delete() returns trigger language plpgsql as
    $$ begin raise exception 'fixture blocked'; end $$;
    create trigger fixture_block before delete on auth.users for each row execute function auth.prevent_fixture_delete();`);
  await asUser(alice);
  await assert.rejects(remove(), /fixture blocked/);
  await db.exec('reset role');
  assert.equal((await rows('select title from public.forum_threads where id=$1', [thread]))[0].title, 'Alice private title');
  assert.equal((await rows('select * from public.forum_helpful')).length, 2);
  await db.exec('drop trigger fixture_block on auth.users');

  const bobBefore = (await rows('select * from public.forum_replies where id=$1', [reply]))[0];
  await asUser(alice);
  assert.equal((await remove()).rows[0].deleted, true);
  await assert.rejects(remove(), /deletion_session_invalid/, 'Replay cannot act as an already deleted account');
  await db.exec('reset role');
  assert.deepEqual(await rows('select id from auth.users'), [{ id: bob }], 'Only JWT owner deleted');
  assert.deepEqual((await rows('select * from public.forum_replies where id=$1', [reply]))[0], bobBefore, 'Other author response preserved verbatim');
  const removed = (await rows('select * from public.forum_threads where id=$1', [thread]))[0];
  assert.equal(removed.user_id, null); assert.equal(removed.author_name, 'Deleted account'); assert.equal(removed.title, 'Deleted thread'); assert.ok(removed.deleted_at);
  const tombstone = (await rows('select * from public.forum_replies where id=$1', [ownReply]))[0];
  assert.equal(tombstone.user_id, null); assert.equal(tombstone.author_name, 'Deleted account'); assert.ok(tombstone.deleted_at); assert.ok(!tombstone.body.includes('Alice'));
  for (const table of ['favorites', 'user_prefs']) assert.deepEqual(await rows(`select user_id from public.${table}`), [{ user_id: bob }]);
  for (const table of ['forum_helpful', 'forum_reports', 'forum_blocks', 'forum_moderators', 'forum_suspensions', 'forum_moderation_audit']) assert.equal((await rows(`select * from public.${table}`)).length, 0, `${table} private references removed`);
  for (const table of ['identities', 'sessions']) assert.deepEqual(await rows(`select user_id from auth.${table}`), [{ user_id: bob }]);
  console.log('Account deletion SQL checks passed: disabled gate, grants, consent, freshness, Apple, rollback, erasure/cascades, preserved replies, replay.');
} finally { await db.close(); }
