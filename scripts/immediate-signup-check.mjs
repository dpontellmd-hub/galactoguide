// Actual provider with React rendering; no real signup, credentials, or email.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(path.resolve('.tmp/report-test-runtime/package.json'));
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let value;
let listener;
let session = null;
let releaseMail;
let failMail = false;
let noSession = false;
let rpcError = false;
let verified = false;
const emails = [];
const auth = {
  initialize: async () => ({ error: null }),
  getSession: async () => ({ data: { session } }),
  onAuthStateChange: cb => { listener = cb; return { data: { subscription: { unsubscribe() {} } } }; },
  signUp: async ({ email }) => {
    if (noSession) return { data: { session: null, user: { id: 'pending', email } }, error: null };
    session = { user: { id: email, email }, access_token: email };
    listener('SIGNED_IN', session);
    return { data: { session, user: session.user }, error: null };
  },
  signInWithOtp: async args => {
    emails.push(args);
    await new Promise(resolve => { releaseMail = resolve; });
    if (failMail) throw new Error('Mail service offline');
    return { error: null };
  },
  signOut: async () => { session = null; listener('SIGNED_OUT', null); },
};
const modules = {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { Platform: { OS: 'web' }, AppState: { addEventListener: () => ({ remove() {} }) } },
  'expo-auth-session': { makeRedirectUri: () => 'unused' },
  'expo-auth-session/build/QueryParams': {},
  'expo-web-browser': { maybeCompleteAuthSession() {} },
  '@/lib/site': { webPath: path => '/' + path },
  '@/lib/supabase': { supabaseConfigured: true, supabase: { auth, rpc: async () => ({ data: verified, error: rpcError ? {} : null }) } },
};
const compiled = ts.transpileModule(readFileSync('src/context/AuthContext.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
  console, URL, URLSearchParams, window: { location: { origin: 'https://preview.example.test', href: 'https://preview.example.test/auth' }, addEventListener() {}, removeEventListener() {} },
})(id => { assert.ok(modules[id], `Unexpected import ${id}`); return modules[id]; }, module, module.exports);
const { AuthProvider, useAuth } = module.exports;
function Probe() { value = useAuth(); return null; }
let root;
await act(async () => { root = create(React.createElement(AuthProvider, null, React.createElement(Probe))); });
let result;
await act(async () => { result = await value.signUp('first@example.test', 'not-a-real-password'); });
assert.equal(result.sessionStarted, true);
assert.equal(value.user.email, 'first@example.test');
assert.equal(value.busy, false, 'Account access does not wait for email');
assert.equal(value.emailVerified, false);
assert.equal(emails.length, 1);
assert.equal(emails[0].options.shouldCreateUser, false);
assert.equal(emails[0].options.emailRedirectTo, 'https://preview.example.test/auth');
await act(async () => { void value.sendVerification(); });
assert.equal(emails.length, 1, 'No duplicate in-flight mail');
await act(async () => { failMail = true; releaseMail(); });
assert.equal(value.user.email, 'first@example.test');
assert.match(value.verificationNotice, /could not be sent/);
await act(async () => { failMail = false; void value.sendVerification(); });
assert.equal(emails.length, 2, 'Delivery failure can retry');
await act(async () => { releaseMail(); });
assert.match(value.verificationNotice, /sent/);
await act(async () => { await value.sendVerification(); });
assert.equal(emails.length, 2, 'Resend cooldown');
await act(async () => { verified = true; value.refreshVerification(); });
assert.equal(value.emailVerified, true);
await act(async () => { await value.signOut(); });
assert.equal(value.emailVerified, null);
assert.equal(value.verificationNotice, null);
await act(async () => { verified = false; await value.signUp('second@example.test', 'not-a-real-password'); });
assert.equal(value.emailVerified, false, 'New account never inherits verification');
await act(async () => { await value.signOut(); releaseMail(); });
assert.equal(value.verificationNotice, null, 'Late mail completion does not leak account state');
await act(async () => { noSession = true; result = await value.signUp('pending@example.test', 'not-a-real-password'); });
assert.equal(result.sessionStarted, false, 'Staged server confirmation still respected');
assert.equal(emails.length, 3, 'No second verification email when server already requires confirmation');
await act(async () => { root.unmount(); });
console.log('PASS: immediate session, background delivery, failure/retry, duplicate protection, cooldown, verification refresh, account isolation, staged rollout');
