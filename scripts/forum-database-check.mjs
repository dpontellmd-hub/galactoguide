// Disposable local PostgreSQL only. Set FORUM_TEST_RUNTIME to a directory containing
// node_modules/@electric-sql/pglite (or install that package locally).
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
const nested = '00000000-0000-4000-8000-000000000005';
const ownResponse = '00000000-0000-4000-8000-000000000006';
const asUser = async (id) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? '']);
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
};
const vote = (kind, id, value) => db.query('select * from public.set_forum_helpful($1, $2, $3)', [kind, id, value]);
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
  `);
  const schema = readFileSync('supabase/schema.sql', 'utf8');
  const migration = readFileSync('supabase/migrations/20260914_forum_helpful.sql', 'utf8');
  assert.ok(schema.endsWith(migration), 'Fresh schema includes exactly the incremental migration');
  await db.exec(schema);
  await db.exec(migration); // repeat application is safe
  await db.query('insert into auth.users values ($1), ($2)', [alice, bob]);
  await asUser(alice);
  await db.query(`insert into public.forum_threads (id,user_id,author_name,title,body,topic)
    values ($1,$2,'Alice','Private original title','Original content to remove','Everyday support')`, [thread, alice]);
  await asUser(bob);
  await db.query(`insert into public.forum_replies (id,thread_id,user_id,author_name,body)
    values ($1,$2,$3,'Bob','Keep this response')`, [reply, thread, bob]);
  await asUser(alice);
  await db.query(`insert into public.forum_replies (id,thread_id,parent_reply_id,user_id,author_name,body)
    values ($1,$2,$3,$4,'Alice','Keep the nested response')`, [nested, thread, reply, alice]);
  await db.query(`insert into public.forum_replies (id,thread_id,user_id,author_name,body)
    values ($1,$2,$3,'Alice','My removable response')`, [ownResponse, thread, alice]);

  await asUser(null);
  await assert.rejects(vote('thread', thread, true), /permission denied/);
  await assert.rejects(db.query('select public.delete_forum_thread($1)', [thread]), /permission denied/);
  assert.equal((await rows('delete from public.forum_replies where id=$1 returning id', [reply])).length, 0);

  await asUser(alice);
  assert.equal((await vote('thread', thread, true)).rows[0].helpful_count, 1);
  assert.equal((await vote('thread', thread, true)).rows[0].helpful_count, 1, 'Retry does not double count');
  await asUser(bob);
  assert.equal((await vote('thread', thread, true)).rows[0].helpful_count, 2);
  assert.equal((await rows('select * from public.forum_helpful')).length, 1, 'Voter rows are private');
  await assert.rejects(db.query(`insert into public.forum_helpful(user_id,reply_id) values ($1,$2)`, [alice, reply]), /row-level security/);
  await asUser(null);
  const publicCount = (await rows('select * from public.get_forum_helpful()'))[0];
  assert.deepEqual(Object.keys(publicCount).sort(), ['helpful_count', 'marked_helpful', 'target_id', 'target_kind']);
  assert.equal(publicCount.helpful_count, 2);
  assert.equal(publicCount.marked_helpful, false);
  assert.equal((await rows('select * from public.forum_helpful')).length, 0);
  await asUser(alice);
  assert.equal((await vote('thread', thread, false)).rows[0].helpful_count, 1);
  assert.equal((await vote('thread', thread, false)).rows[0].helpful_count, 1, 'Undo is idempotent');
  await vote('reply', reply, true);
  await vote('reply', nested, true);
  await vote('reply', ownResponse, true);
  await assert.rejects(vote('invalid', thread, true), /Invalid helpful target/);
  await assert.rejects(vote('thread', bob, true), /no longer available/);

  await asUser(bob);
  await assert.rejects(db.query('select public.delete_forum_thread($1)', [thread]), /unavailable or not yours/);
  assert.equal((await rows('delete from public.forum_replies where id=$1 returning id', [nested])).length, 0);
  await asUser(alice);
  assert.equal((await rows('delete from public.forum_threads where id=$1 returning id', [thread])).length, 0, 'Old clients cannot hard-delete');
  const beforeReplies = await rows('select * from public.forum_replies where thread_id=$1 order by id', [thread]);
  await db.query('select public.delete_forum_thread($1)', [thread]);
  assert.deepEqual(await rows('select * from public.forum_replies where thread_id=$1 order by id', [thread]), beforeReplies, 'Thread deletion preserves every response verbatim');
  const deleted = (await rows('select * from public.forum_threads where id=$1', [thread]))[0];
  assert.equal(deleted.title, 'Deleted thread');
  assert.equal(deleted.body, 'This thread was deleted by its author.');
  assert.equal(deleted.user_id, null);
  assert.equal(deleted.author_name, 'Deleted author');
  assert.ok(deleted.deleted_at);
  assert.equal((await rows('select * from public.get_forum_helpful() where target_id=$1', [thread])).length, 0);
  await assert.rejects(vote('thread', thread, true), /no longer available/);
  assert.equal((await vote('reply', reply, true)).rows[0].helpful_count, 1, 'Responses remain votable');
  await db.query(`insert into public.forum_replies(thread_id,user_id,author_name,body)
    values ($1,$2,'Alice','Can still continue this conversation')`, [thread, alice]);
  await db.query('delete from public.forum_replies where id=$1', [ownResponse]);
  assert.equal((await rows('select * from public.get_forum_helpful() where target_id=$1', [ownResponse])).length, 0, 'Deleting a reply removes its votes');
  await asUser(bob);
  await db.query('delete from public.forum_replies where id=$1', [reply]);
  const surviving = (await rows('select * from public.forum_replies where id=$1', [nested]))[0];
  assert.equal(surviving.parent_reply_id, null);
  assert.equal(surviving.body, 'Keep the nested response');
  console.log('PASS: author permissions, private votes, duplicate prevention, undo, tombstones, preserved responses, continued discussion, vote cleanup, repeat migration.');
} finally { await db.close(); }
