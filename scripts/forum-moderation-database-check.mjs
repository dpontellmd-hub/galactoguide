// Actual disposable PostgreSQL: no URLs, service credentials or network requests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(process.env.FORUM_TEST_RUNTIME ?? '.', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const alice=id(1), bob=id(2), moderator=id(3), stranger=id(4), thread=id(10), reply=id(11), nested=id(12), other=id(13);
const q = async (sql,args=[]) => (await db.query(sql,args)).rows;
const as = async (user) => {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
 await db.exec(`set role ${user ? 'authenticated' : 'anon'}`);
};
const deny = (sql,args=[],pattern=/permission denied|row-level security|Moderator access required/) => assert.rejects(q(sql,args),pattern);
const report = async (kind,target,reason='Please review this post') => (await q('select public.report_forum_post($1,$2,$3,$4) id',[kind,target,'harassment',reason]))[0].id;
try {
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
 await db.exec(readFileSync('supabase/schema.sql','utf8'));
 const migration=readFileSync('supabase/migrations/20261010_forum_moderation.sql','utf8');
 await db.exec(migration);
 await db.exec(migration); // repeat-safe migration
 for (const user of [alice,bob,moderator,stranger]) await q('insert into auth.users(id) values($1)',[user]);
 await q('insert into public.forum_moderators(user_id) values($1)',[moderator]);
 await q(`insert into public.forum_threads(id,user_id,author_name,title,body,topic) values
 ($1,$2,'Alice','A support question','Breastfeeding and breast milk are welcome clinical terms','Everyday support'),
 ($3,$4,'Bob','Other support question','A second supportive conversation','Everyday support')`,[thread,alice,other,bob]);
 await q(`insert into public.forum_replies(id,thread_id,user_id,author_name,body) values($1,$2,$3,'Bob','Preserve this reply')`,[reply,thread,bob]);
 await q(`insert into public.forum_replies(id,thread_id,parent_reply_id,user_id,author_name,body) values($1,$2,$3,$4,'Alice','Preserve this nested reply')`,[nested,thread,reply,alice]);
 await as(null);
 for (const sql of ['select public.get_forum_safety()','select * from public.moderation_queue()','select * from public.list_forum_suspensions()',`select public.report_forum_post('thread','${thread}','other','Report reason')`,`select public.set_forum_block('${alice}',true)`]) await deny(sql);
 for (const table of ['forum_moderators','forum_reports','forum_blocks','forum_suspensions','forum_moderation_audit','forum_post_events']) await deny(`select * from public.${table}`);
 await as(stranger);
 await deny('select * from public.moderation_queue()');
 await deny('select * from public.list_forum_suspensions()');
 await deny('insert into public.forum_moderators(user_id) values($1)',[stranger]);
 await deny('insert into public.forum_suspensions(user_id) values($1)',[alice]);
 await deny('insert into public.forum_blocks(user_id,blocked_user_id) values($1,$2)',[alice,bob]);
 await deny('insert into public.forum_reports(reporter_id,thread_id,category,reason) values($1,$2,\'other\',\'spoofed report\')',[alice,thread]);
 await deny('delete from public.forum_moderators');
 await deny('update public.forum_reports set status=\'resolved\'');
 // User-editable profile metadata can never grant a moderator role.
 await db.exec('reset role');
 await q(`update auth.users set raw_user_meta_data='{"is_moderator":true,"role":"moderator"}' where id=$1`,[stranger]);
 await as(stranger);
 assert.equal((await q('select public.get_forum_safety() s'))[0].s.is_moderator,false);
 await deny('select public.moderate_forum_report($1,\'remove\',\'\')',[id(99)]);
 for(const text of ['Breastfeeding nipples and pumping breast milk','A 5 mg dose on 2026-10-10','Skyscape and skylines']) {
  assert.equal((await q('select public.forum_content_allowed($1) ok',[text]))[0].ok,true,text);
 }
 for(const text of ['k.y.s','I will   kill you','mail me at person@example.test','call 555-123-4567','x'.repeat(25)]) {
  assert.equal((await q('select public.forum_content_allowed($1) ok',[text]))[0].ok,false,text);
 }
 // Direct REST-equivalent table writes run the same filter and immutable guards.
 await as(alice);
 await deny(`insert into public.forum_threads(user_id,author_name,title,body,topic) values($1,'Alice','An abusive title','I will kill you right now','Everyday support')`,[alice],/content_filter/);
 await deny(`update public.forum_threads set body='kill yourself right now' where id=$1`,[thread],/content_filter/);
 await deny(`update public.forum_threads set created_at=now()+interval '1 day' where id=$1`,[thread],/metadata/);
 await deny(`update public.forum_replies set thread_id=$1 where id=$2`,[other,nested],/destination/);
 await deny(`insert into public.forum_replies(thread_id,parent_reply_id,user_id,author_name,body) values($1,$2,$3,'Alice','Cross thread parent')`,[other,reply,alice],/Reply unavailable/);
 await deny(`insert into public.forum_replies(thread_id,user_id,author_name,body) values($1,$2,'Alice',$3)`,[thread,alice,'abc '.repeat(501)],/length/);
 await deny(`insert into public.forum_replies(thread_id,user_id,author_name,body) values($1,$2,'Alice',$3)`,[thread,alice,'https://a.test https://b.test https://c.test https://d.test'],/content_filter/);
 assert.equal((await q('delete from public.forum_threads where id=$1 returning id',[thread])).length,0);
 assert.equal((await q('delete from public.forum_replies where id=$1 returning id',[reply])).length,0);
 await q('select public.set_forum_block($1,true)',[bob]);
 assert.deepEqual((await q('select public.get_forum_safety() s'))[0].s.blocked_users,[{user_id:bob,author_name:'Blocked member'}]);
 assert.equal((await q('select * from public.forum_threads where id=$1',[other])).length,0);
 assert.equal((await q('select * from public.forum_replies where id=$1',[reply])).length,0);
 await deny('select public.set_forum_helpful(\'reply\',$1,true)',[reply],/unavailable/);
 await deny(`insert into public.forum_helpful(user_id,reply_id) values($1,$2)`,[alice,reply]);
 await deny(`insert into public.forum_replies(thread_id,user_id,author_name,body) values($1,$2,'Alice','Blocked root bypass')`,[other,alice],/blocked/);
 await deny(`insert into public.forum_replies(thread_id,parent_reply_id,user_id,author_name,body) values($1,$2,$3,'Alice','Blocked reply bypass')`,[thread,reply,alice],/blocked/);
 await as(bob);
 assert.equal((await q('select * from public.forum_threads where id=$1',[thread])).length,0,'Block also protects blocker from blocked account');
 assert.equal((await q('select * from public.forum_replies where thread_id=$1',[thread])).length,0,'Hidden root does not leak its replies');
 await deny('select public.set_forum_helpful(\'thread\',$1,true)',[thread],/unavailable/);
 await as(alice); await q('select public.set_forum_block($1,false)',[bob]);
 assert.equal((await q('select * from public.forum_replies where id=$1',[reply])).length,1);
 const r1=await report('reply',reply);
 assert.equal(await report('reply',reply,'A retry returns the existing report'),r1);
 const r2=await report('thread',other);
 await as(bob);
 await deny(`update public.forum_replies set body='Changed after the report was filed' where id=$1`,[reply],/awaiting moderator review/);
 assert.equal((await q('delete from public.forum_replies where id=$1 returning id',[reply])).length,0,'Authors cannot cascade-delete reports or replies');
 await q('select public.delete_forum_reply($1)',[reply]);
 await as(alice);
 await deny('select public.delete_forum_reply($1)',[nested.replace(/12$/,'13')],/unavailable or not yours/);
 await deny('select public.report_forum_post(\'thread\',$1,\'invalid\',\'Reason\')',[thread],/category/);
 await deny('select public.report_forum_post(\'thread\',$1,\'other\',$2)',[thread,'x'.repeat(501)],/500/);
 await as(moderator);
 const queue=await q('select * from public.moderation_queue()');
 assert.equal(queue.length,2);
 assert.equal(queue.find(x=>x.id===r1).body,'This reply was deleted by its author.','Queue reads current authoritative tombstone, never retained content');
 assert.equal(queue.find(x=>x.id===r1).author_id,bob,'Report preserves target identity for review after post deletion');
 await q('select public.moderate_forum_report($1,\'suspend\',\'\')',[r1]);
 await q('select public.moderate_forum_report($1,\'suspend\',\'\')',[r1]); // idempotent
 await deny('select public.moderate_forum_report($1,\'dismiss\',\'\')',[r1],/already resolved/);
 const kept=(await q('select * from public.forum_replies where id=$1',[nested]))[0];
 assert.equal(kept.body,'Preserve this nested reply'); assert.equal(kept.parent_reply_id,reply);
 const removed=(await q('select * from public.forum_replies where id=$1',[reply]))[0];
 assert.equal(removed.user_id,null); assert.ok(removed.deleted_at);
 await as(bob);
 assert.equal((await q('select public.get_forum_safety() s'))[0].s.is_suspended,true);
 await deny(`insert into public.forum_threads(user_id,author_name,title,body,topic) values($1,'Bob','A new topic','Trying to bypass suspension','Everyday support')`,[bob],/suspended/);
 await deny(`insert into public.forum_replies(thread_id,user_id,author_name,body) values($1,$2,'Bob','A new reply')`,[thread,bob],/suspended/);
 assert.equal((await q(`update public.forum_threads set body='An edited post to bypass suspension' where id=$1 returning id`,[other])).length,0);
 await deny('select public.set_forum_helpful(\'thread\',$1,true)',[thread],/suspended/);
 await report('thread',thread,'Safety reporting remains available while suspended');
 await as(moderator);
 await q('select public.set_forum_suspension($1,false)',[bob]);
 assert.equal((await q('select * from public.list_forum_suspensions()')).length,0);
 await q('select public.moderate_forum_report($1,\'remove\',\'\')',[r2]);
 assert.ok((await q('select deleted_at from public.forum_threads where id=$1',[other]))[0].deleted_at);
 const open=await q('select * from public.moderation_queue()');
 await q('select public.moderate_forum_report($1,\'dismiss\',\'\')',[open[0].id]);
 assert.equal((await q('select * from public.moderation_queue()')).length,0);
 // 5 combined posts/minute, timestamp spoof does not expand the allowance.
 await as(stranger);
 for(let i=0;i<5;i++) {
  const posted=(await q(`insert into public.forum_replies(thread_id,user_id,author_name,body,created_at) values($1,$2,'Sam',$3,'2000-01-01') returning id`,[thread,stranger,`Helpful fixture reply ${i}`]))[0].id;
  await q('select public.delete_forum_reply($1)',[posted]);
 }
 await deny(`insert into public.forum_replies(thread_id,user_id,author_name,body) values($1,$2,'Sam','One too many replies')`,[thread,stranger],/rate_limit/);
 // Report rate limit is server-enforced and a blank optional reason is valid.
 await db.exec('reset role');
 for(let i=0;i<21;i++) await q(`insert into public.forum_threads(id,user_id,author_name,title,body,topic) values($1,$2,'Alice',$3,'A legitimate fixture body for a report','Everyday support')`,[id(100+i),alice,`Fixture topic ${i}`]);
 await as(stranger);
 for(let i=0;i<20;i++) await report('thread',id(100+i),'');
 await deny('select public.report_forum_post(\'thread\',$1,\'other\',\'\')',[id(120)],/rate_limit/);
 await db.exec('reset role');
 await q('delete from auth.users where id=$1',[bob]);
 assert.equal((await q('select * from public.forum_reports where target_user_id=$1 or reporter_id=$1',[bob])).length,0);
 assert.equal((await q('select * from public.forum_moderation_audit where subject_id=$1',[bob])).length,0);
 assert.equal((await q('select * from public.forum_replies where id=$1',[nested])).length,1);
 console.log('PASS: repeat migration; anonymous/member privilege rejection; metadata self-grant rejection; direct-write filters/immutable metadata; bilateral block RLS and interaction checks; authoritative report queue; report validation/retry; moderator removal/suspension/restoration/dismissal; suspended safety reporting; preserved replies; 5/minute rate cap; account deletion cascades.');
} finally { await db.close(); }
