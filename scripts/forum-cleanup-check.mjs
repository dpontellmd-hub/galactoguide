// Disposable PostgreSQL only; never connects to Supabase.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(process.env.FORUM_TEST_RUNTIME ?? '.tmp/report-test-runtime', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const cleanup = readFileSync('supabase/maintenance/20260919_remove_example_forum_content.sql', 'utf8');
const seedThread = (n) => `80c38587-75df-4f5f-a843-43ea5fdde${String(n).padStart(3, '0')}`;
const seedReply = (n) => `70c38587-75df-4f5f-a843-43ea5fdde${String(n).padStart(3, '0')}`;
const testIds = ['ed2a7671-9de3-4d7a-816a-53c080647da7', '447406c3-3c5b-448e-8ce2-6dda74afa986', '7227c9af-8c76-4ec3-99d2-3f063e900f57'];
const retainedThread = '00000000-0000-4000-8000-000000000001';
const retainedReply = '00000000-0000-4000-8000-000000000002';
const extraReply = '00000000-0000-4000-8000-000000000003';
const voter = '00000000-0000-4000-8000-000000000004';
const rows = async (sql) => (await db.query(sql)).rows;
const addReply = (id, thread, sample) => db.query(`insert into public.forum_replies(id,thread_id,author_name,body,is_sample)
  values($1,$2,'Test author','Disposable test reply',$3)`, [id, thread, sample]);
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
  await db.exec(readFileSync('supabase/schema.sql', 'utf8'));
  assert.deepEqual(await rows('select id from public.forum_threads'), [], 'Fresh schema has no examples');
  for (let n = 1; n <= 6; n++) await db.query(`insert into public.forum_threads(id,author_name,title,body,topic,is_sample)
    values($1,'Test author','Sample title','Disposable test body','Everyday support',true)`, [seedThread(n)]);
  for (let n = 1; n <= 14; n++) await addReply(seedReply(n), seedThread((n % 6) + 1), true);
  for (const id of testIds) await addReply(id, seedThread(1), false);
  await db.query(`insert into public.forum_threads(id,author_name,title,body,topic)
    values($1,'Keep author','Keep title','Keep this content','Everyday support')`, [retainedThread]);
  await addReply(retainedReply, retainedThread, false);
  await db.query('insert into auth.users values($1)', [voter]);
  await db.query('insert into public.forum_helpful(user_id,thread_id) values($1,$2)', [voter, seedThread(1)]);
  await db.query('insert into public.forum_helpful(user_id,reply_id) values($1,$2)', [voter, testIds[0]]);
  await db.query('insert into public.forum_helpful(user_id,reply_id) values($1,$2)', [voter, retainedReply]);
  const keepThread = await rows(`select * from public.forum_threads where id='${retainedThread}'`);
  const keepReply = await rows(`select * from public.forum_replies where id='${retainedReply}'`);
  await addReply(extraReply, seedThread(1), false);
  await assert.rejects(db.exec(cleanup), /Unreviewed replies/);
  await db.exec('rollback');
  assert.equal((await rows('select id from public.forum_threads')).length, 7, 'Guard aborts before deleting');
  await db.query('delete from public.forum_replies where id=$1', [extraReply]);
  await db.query('update public.forum_threads set is_sample=false where id=$1', [seedThread(1)]);
  await assert.rejects(db.exec(cleanup), /no longer marked as sample/);
  await db.exec('rollback');
  await db.query('update public.forum_threads set is_sample=true where id=$1', [seedThread(1)]);
  await db.query('update public.forum_replies set parent_reply_id=$1 where id=$2', [seedReply(1), retainedReply]);
  await assert.rejects(db.exec(cleanup), /unrelated reply depends/);
  await db.exec('rollback');
  await db.query('update public.forum_replies set parent_reply_id=null where id=$1', [retainedReply]);
  await db.exec(cleanup);
  assert.deepEqual(await rows('select * from public.forum_threads'), keepThread);
  assert.deepEqual(await rows('select * from public.forum_replies'), keepReply);
  assert.deepEqual(await rows('select reply_id from public.forum_helpful'), [{ reply_id: retainedReply }]);
  await db.exec(cleanup);
  assert.deepEqual(await rows('select * from public.forum_threads'), keepThread, 'Cleanup is repeatable');
  console.log('PASS: empty fresh schema, exact cleanup, retained content/votes, new-reply and changed-seed guards, parent preservation, and repeat execution. No live database touched.');
} finally { await db.close(); }
