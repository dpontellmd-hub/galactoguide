import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let platform='ios',enabled=true,available=true,mode='',calls=[];
const id='00000000-0000-4000-8000-000000000001',nonce='a'.repeat(64);
const modules={
  'react-native':{Platform:{get OS(){return platform;}}},
  'expo-constants':{get expoConfig(){return {extra:{appleSignInEnabled:enabled}};}},
  'expo-crypto':{CryptoDigestAlgorithm:{SHA256:'SHA256'},digestStringAsync:async(alg,n)=>{assert.equal(n,nonce);return 'hashed-nonce';}},
  'expo-apple-authentication':{
    isAvailableAsync:async()=>available,
    signInAsync:async options=>{
      calls.push('sheet');assert.equal(options.nonce,'hashed-nonce');assert.equal(options.state,id);assert.equal(options.requestedScopes.length,0);
      if(mode==='cancel')throw {code:'ERR_REQUEST_CANCELED'};
      return {state:mode==='state'?'other':id,authorizationCode:mode==='no-code'?null:'fixture-code'};
    },
  },
  '@/lib/supabase':{supabase:{functions:{invoke:async(name,options)=>{
    assert.equal(name,'apple-account-deletion');assert.equal(options.headers.Authorization,'Bearer original-owner-token');
    assert.equal(options.body.confirmation,'DELETE');assert.equal('ownerId' in options.body,false);
    calls.push(options.body.action);
    if(mode==='transport')throw new Error('private-provider-error');
    if(options.body.action==='challenge')return {data:{id,nonce:mode==='bad-challenge'?'bad':nonce},error:mode==='disabled'?{}:null};
    assert.equal(options.body.code,'fixture-code');assert.equal(options.body.requestId,id);
    return {data:{deleted:mode==='ambiguous'?undefined:true},error:mode==='revocation'?{}:null};
  }}}},
};
const source=ts.transpileModule(readFileSync('src/lib/apple-account-deletion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
vm.runInNewContext(`(function(require,module,exports){${source}\n})`,{})(name=>{assert.ok(name in modules);return modules[name];},mod,mod.exports);
const remove=()=>mod.exports.deleteAppleAccount('original-owner-token');
for(const p of ['web','android']){platform=p;assert.equal((await remove()).deleted,false);assert.equal(calls.length,0);}
platform='ios';enabled=false;assert.equal((await remove()).deleted,false);assert.equal(calls.length,0);
enabled=true;available=false;assert.equal((await remove()).deleted,false);assert.equal(calls.length,0);available=true;
for(mode of ['disabled','bad-challenge','transport','cancel','state','no-code','revocation','ambiguous']){
  calls=[];const r=await remove();assert.equal(r.deleted,false,mode);assert.ok(r.error);assert.ok(!r.error.includes('private-provider-error'));
  if(!['revocation','ambiguous'].includes(mode))assert.ok(!calls.includes('complete'),mode);
}
mode='';calls=[];assert.equal((await remove()).deleted,true);assert.deepEqual(calls,['challenge','sheet','complete']);
console.log('PASS: Apple client platform/config gates, server challenge/state/code binding, original-session pinning, cancellation, failure and explicit-success handling.');
