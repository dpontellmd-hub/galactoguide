// Actual PostgreSQL and WebCrypto; fake Auth/Apple HTTP. No network or real keys.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createAppleDeletionHandler } from '../supabase/functions/apple-account-deletion/handler.ts';
const require = createRequire(path.resolve(process.env.FORUM_TEST_RUNTIME ?? '.', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const rsa = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
const ec = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']);
const publicKey = { ...await crypto.subtle.exportKey('jwk', rsa.publicKey), kid: 'fixture-rsa', alg: 'RS256', use: 'sig' };
const b64 = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const config = { enabled: true, isolatedProjectRef: 'aaaaaaaaaaaaaaaaaaaa', supabaseUrl: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co', anonKey: 'fixture-anon', serviceKey: 'fixture-service', teamId: 'TESTTEAM00', keyId: 'TESTKEY000', privateKey: `-----BEGIN PRIVATE KEY-----\n${Buffer.from(await crypto.subtle.exportKey('pkcs8', ec.privateKey)).toString('base64')}\n-----END PRIVATE KEY-----` };
let mode = '', calls = [], current, nonceHash, dbFailure = false;
const users = new Map();
const rows = async (s,args=[]) => (await db.query(s,args)).rows;
const scalar = async (s,args=[]) => Object.values((await rows(s,args))[0])[0];
const makeUser = async () => {
  const u = { id: randomUUID(), session: randomUUID(), subject: randomUUID() };
  u.token = `${b64({alg:'fixture'})}.${b64({sub:u.id,session_id:u.session,role:'authenticated'})}.fixture`;
  users.set(u.token,u);
  await db.query('insert into auth.users values($1)',[u.id]);
  await db.query("insert into auth.identities values($1,'apple',$2)",[u.id,JSON.stringify({sub:u.subject})]);
  await db.query('insert into auth.sessions values($1,$2)',[u.session,u.id]);
  return u;
};
async function appleJwt() {
  const now = Math.floor(Date.now()/1000);
  const c = { iss: 'https://appleid.apple.com', aud: 'com.dyadhealthcollective.galactoguide', sub: current.subject, nonce: nonceHash, exp: now+300, iat: now };
  if(mode==='subject') c.sub='other-account';
  if(mode==='audience') c.aud='wrong-app';
  if(mode==='nonce') c.nonce='wrong-nonce';
  if(mode==='issuer') c.iss='https://attacker.invalid';
  if(mode==='expired') c.exp=now-1;
  if(mode==='old') c.iat=now-301;
  if(mode==='future') c.iat=now+60;
  const input=`${b64({alg:mode==='algorithm'?'none':'RS256',kid:'fixture-rsa'})}.${b64(c)}`;
  const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',rsa.privateKey,Buffer.from(input)));
  if(mode==='signature') signature[0]^=255;
  return `${input}.${signature.toString('base64url')}`;
}
async function transport(url, init) {
  calls.push(url);
  assert.equal(init.redirect,'error'); assert.ok(init.signal);
  if(url===config.supabaseUrl+'/auth/v1/user') {
    const user=users.get(init.headers.Authorization.slice(7));
    return user ? Response.json({id:user.id}) : new Response('',{status:401});
  }
  if(url.startsWith(config.supabaseUrl+'/rest/v1/rpc/')) {
    assert.equal(init.headers.Authorization,'Bearer fixture-service');
    const name=url.split('/').at(-1), a=JSON.parse(init.body);
    const names={begin_apple_account_deletion:['p_owner','p_session','p_nonce_sha256'],claim_apple_account_deletion:['p_owner','p_session','p_request'],finish_apple_account_deletion:['p_owner','p_session','p_request','p_confirmation']};
    assert.ok(names[name]);
    if(name==='begin_apple_account_deletion') nonceHash=a.p_nonce_sha256;
    if(name==='finish_apple_account_deletion') {
      assert.equal(calls.at(-2),'https://appleid.apple.com/auth/revoke','Never finalize before revocation');
      if(dbFailure) return new Response('',{status:500});
    }
    try {
      await db.exec('set role service_role');
      const data=await scalar(`select public.${name}(${names[name].map((_,i)=>'$'+(i+1)).join(',')})`,names[name].map(k=>a[k]));
      return Response.json(data);
    } catch { return new Response('',{status:400}); }
    finally { await db.exec('reset role'); }
  }
  if(url==='https://appleid.apple.com/auth/token') {
    assert.equal(init.body.get('grant_type'),'authorization_code');
    assert.equal(init.body.get('client_id'),'com.dyadhealthcollective.galactoguide');
    const secret=init.body.get('client_secret').split('.');
    assert.equal(JSON.parse(Buffer.from(secret[1],'base64url')).iss,config.teamId);
    assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},ec.publicKey,Buffer.from(secret[2],'base64url'),Buffer.from(secret.slice(0,2).join('.'))),true);
    if(mode==='exchange') return new Response('',{status:400});
    return Response.json({id_token:await appleJwt(),refresh_token:mode==='missing-token'?undefined:'fixture-refresh'});
  }
  if(url==='https://appleid.apple.com/auth/keys') return Response.json({keys: mode==='unknown-key'?[]:[publicKey]});
  if(url==='https://appleid.apple.com/auth/revoke') {
    assert.equal(init.body.get('token'),'fixture-refresh');
    assert.equal(init.body.get('token_type_hint'),'refresh_token');
    if(mode==='timeout') throw new Error('fixture-secret-must-not-leak');
    return new Response(null,{status:mode==='revoke'?503:200});
  }
  assert.fail('Unexpected network destination');
}
const handler=createAppleDeletionHandler(config,transport);
const request = (body,token=current.token,options={}) => new Request('https://function.invalid', {method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options},body:JSON.stringify(body)});
const start=()=>handler(request({action:'challenge',confirmation:'DELETE'}));
const finish=id=>handler(request({action:'complete',confirmation:'DELETE',requestId:id,code:'fixture-code'}));
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text,identity_data jsonb);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
  for(const file of ['supabase/schema.sql','supabase/migrations/20261010_forum_moderation.sql','supabase/migrations/20261011_account_deletion.sql','supabase/migrations/20261014_apple_account_deletion.sql','supabase/migrations/20261014_apple_account_deletion.sql']) await db.exec(readFileSync(file,'utf8'));
  current=await makeUser();
  assert.equal((await start()).status,400,'Database gate defaults off');
  await db.exec("update private.account_deletion_config set enabled=true,retention_strategy='erase_owned_content_v1'");
  assert.equal((await start()).status,400,'Apple gate separately defaults off');
  await db.exec('update private.account_deletion_config set apple_revocation_enabled=true');
  for(const role of ['anon','authenticated']) {
    await db.exec('set role '+role);
    for(const fn of ["begin_apple_account_deletion(null,null,null)","claim_apple_account_deletion(null,null,null)","finish_apple_account_deletion(null,null,null,'DELETE')"]) await assert.rejects(db.query('select public.'+fn),/permission denied/);
    await assert.rejects(db.query('select * from private.apple_deletion_requests'),/permission denied/);
    await assert.rejects(db.query('select private.erase_account_data(null)'),/permission denied/);
    await db.exec('reset role');
  }
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[current.id,JSON.stringify({amr:[{method:'oauth',timestamp:Math.floor(Date.now()/1000)}]})]);
  await db.exec('set role authenticated');
  await assert.rejects(db.query("select public.delete_own_account('DELETE')"),/deletion_apple_revocation_required/);
  await db.exec('reset role');
  console.log('PASS: repeatable migration; both gates default off; anon/member cannot forge server proof or bypass Apple deletion gate.');

  calls=[];
  for(const override of [{enabled:false},{isolatedProjectRef:'axxuefnkoxfifftjnuxo',supabaseUrl:'https://axxuefnkoxfifftjnuxo.supabase.co'},{privateKey:''}]) assert.equal((await createAppleDeletionHandler({...config,...override},transport)(request({}))).status,503);
  assert.equal(calls.length,0);
  assert.equal((await handler(request({action:'challenge',confirmation:'delete'}))).status,400);
  assert.equal((await handler(request({action:'challenge',confirmation:'DELETE',ownerId:randomUUID()}))).status,400);
  assert.equal((await handler(request({action:'challenge',confirmation:'DELETE'},current.token,{Origin:'https://attacker.invalid'}))).status,400);
  assert.equal((await handler(request({action:'challenge',confirmation:'DELETE'},'forged'))).status,400);
  assert.equal((await handler(new Request('https://function.invalid'))).status,405);
  assert.equal((await handler(request({action:'challenge',confirmation:'DELETE',large:'x'.repeat(9000)}))).status,400);
  console.log('PASS: production/disabled/credential gates, exact consent, unknown fields, browser origin, forged bearer and oversized bodies fail closed.');

  for(const failure of ['subject','audience','nonce','issuer','expired','old','future','algorithm','signature','unknown-key','exchange','missing-token','revoke','timeout']) {
    current=await makeUser(); mode=failure; calls=[];
    const {id}=await (await start()).json(); assert.ok(id);
    const r=await finish(id);assert.equal(r.status,400,failure);assert.deepEqual(await r.json(),{error:'apple_deletion_unconfirmed'});
    assert.ok(!calls.some(c=>c.endsWith('finish_apple_account_deletion')),failure);
    assert.equal(await scalar('select count(*)::int from auth.users where id=$1',[current.id]),1);
    const exchanged=calls.filter(c=>c.endsWith('/auth/token')).length;
    await finish(id);
    assert.equal(calls.filter(c=>c.endsWith('/auth/token')).length,exchanged,'Claim cannot replay');
  }
  console.log('PASS: real JWT signatures and all identity/nonce/time checks; exchange/revocation failures/timeouts never delete or replay.');

  mode='';current=await makeUser();
  const owner=current, {id}=await (await start()).json();
  current=await makeUser();assert.equal((await finish(id)).status,400,'Wrong owner');
  current=owner;
  const newSession=randomUUID();await db.query('insert into auth.sessions values($1,$2)',[newSession,current.id]);
  const otherToken=`${b64({alg:'fixture'})}.${b64({sub:current.id,session_id:newSession,role:'authenticated'})}.fixture`;
  users.set(otherToken,current);
  assert.equal((await handler(request({action:'complete',confirmation:'DELETE',requestId:id,code:'fixture-code'},otherToken))).status,400,'Wrong session');
  await db.query("update private.apple_deletion_requests set expires_at=now()-interval '1 second' where id=$1",[id]);
  assert.equal((await finish(id)).status,400,'Expired request');
  current=await makeUser();const unclaimed=await (await start()).json();
  await assert.rejects(db.query("select public.finish_apple_account_deletion($1,$2,$3,'DELETE')",[current.id,current.session,unclaimed.id]),/apple_challenge_invalid/);
  for(let i=0;i<4;i++)assert.equal((await start()).status,200);
  assert.equal((await start()).status,400,'Rate limited');
  await db.query('delete from auth.sessions where id=$1',[current.session]);
  assert.equal((await finish(unclaimed.id)).status,400,'Revoked Supabase session');
  current=await makeUser();const changed=await (await start()).json();
  await db.query("update auth.identities set identity_data=$1 where user_id=$2",[JSON.stringify({sub:'changed'}),current.id]);
  assert.equal((await finish(changed.id)).status,400,'Changed Apple identity');
  console.log('PASS: wrong owner/session, expired/revoked session, unclaimed proof, changed identity, rate limit and replay rejection.');

  current=await makeUser();const retained=await makeUser();const post=randomUUID(),response=randomUUID();
  await db.query("insert into public.forum_threads(id,user_id,author_name,title,body,topic) values($1,$2,'Fixture','Fixture title','Erase this content','Everyday support')",[post,current.id]);
  await db.query("insert into public.forum_replies(id,thread_id,user_id,author_name,body) values($1,$2,$3,'Other','Keep this response')",[response,post,retained.id]);
  await db.query("insert into public.favorites(user_id,substance_id) values($1,'fixture')",[current.id]);
  let challenge=await (await start()).json(); dbFailure=true;
  assert.equal((await finish(challenge.id)).status,400);
  assert.equal(await scalar('select count(*)::int from auth.users where id=$1',[current.id]),1);
  dbFailure=false;
  await db.exec("create function private.fixture_abort() returns trigger language plpgsql as $$ begin raise exception 'fixture rollback'; end $$;create trigger fixture_abort before delete on auth.users for each row execute function private.fixture_abort();");
  challenge=await (await start()).json();assert.equal((await finish(challenge.id)).status,400);
  assert.equal(await scalar('select title from public.forum_threads where id=$1',[post]),'Fixture title','SQL rollback preserves content');
  await db.exec('drop trigger fixture_abort on auth.users;drop function private.fixture_abort();');
  challenge=await (await start()).json();calls=[];
  const success=await finish(challenge.id);assert.equal(success.status,200);assert.deepEqual(await success.json(),{deleted:true});
  assert.equal(await scalar('select count(*)::int from auth.users where id=$1',[current.id]),0);
  assert.equal(await scalar('select count(*)::int from auth.sessions where user_id=$1',[current.id]),0);
  assert.equal(await scalar('select count(*)::int from private.apple_deletion_requests where owner_id=$1',[current.id]),0);
  assert.equal(await scalar('select count(*)::int from public.favorites where user_id=$1',[current.id]),0);
  assert.equal(await scalar('select title from public.forum_threads where id=$1',[post]),'Deleted thread');
  assert.equal(await scalar('select body from public.forum_replies where id=$1',[response]),'Keep this response');
  assert.equal(await scalar('select count(*)::int from auth.users where id=$1',[retained.id]),1);
  assert.equal((await finish(challenge.id)).status,400);
  console.log('PASS: valid ES256 client secret, verified Apple exchange, revoke-before-delete, transient DB failure, atomic SQL rollback/retry, cascades/tombstones and other-account survival.');
  current=await makeUser();
  await db.query("update auth.identities set provider='email' where user_id=$1",[current.id]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[current.id,JSON.stringify({amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-600}]})]);
  await db.exec('set role authenticated');
  await assert.rejects(db.query("select public.delete_own_account('DELETE')"),/deletion_reauthentication_required/);
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})]);
  await db.exec('set role authenticated');
  assert.equal(await scalar("select public.delete_own_account('DELETE')"),true);
  await db.exec('reset role');
  console.log('PASS: non-Apple self-delete retains fresh-AMR enforcement after the shared cleanup refactor.');
} finally { await db.close(); }
