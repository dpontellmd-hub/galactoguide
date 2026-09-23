// Exercise the real AuthProvider with a fake Supabase client. No account or email is created.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let value;
let listener;
let session = null;
let codeValid = false;
const calls = { signUp: [], verify: [], resend: [] };
const auth = {
  initialize: async () => ({ error: null }),
  getSession: async () => ({ data: { session } }),
  onAuthStateChange: cb => { listener = cb; return { data: { subscription: { unsubscribe() {} } } }; },
  signUp: async args => {
    calls.signUp.push(args);
    return { data: { session: null, user: { id: 'pending', email: args.email } }, error: null };
  },
  verifyOtp: async args => {
    calls.verify.push(args);
    if (!codeValid) return { data: { session: null }, error: { message: 'Token expired' } };
    session = { user: { id: 'confirmed', email: args.email }, access_token: 'fake-session' };
    listener('SIGNED_IN', session);
    return { data: { session }, error: null };
  },
  resend: async args => { calls.resend.push(args); return { error: null }; },
  signOut: async () => { session = null; listener('SIGNED_OUT', null); },
};
const modules = {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { Platform: { OS: 'web' } },
  'expo-auth-session': { makeRedirectUri: () => 'unused' },
  'expo-auth-session/build/QueryParams': {},
  'expo-web-browser': { maybeCompleteAuthSession() {} },
  '@/lib/site': { webPath: route => '/' + route },
  '@/lib/supabase': { supabaseConfigured: true, supabase: { auth } },
};
const compiled = ts.transpileModule(readFileSync('src/context/AuthContext.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
  console, URL, URLSearchParams,
  window: { location: { origin: 'https://preview.example.test', href: 'https://preview.example.test/auth' } },
})(id => { assert.ok(modules[id], `Unexpected import ${id}`); return modules[id]; }, module, module.exports);
const { AuthProvider, useAuth } = module.exports;
function Probe() { value = useAuth(); return null; }
let root;
await act(async () => { root = create(React.createElement(AuthProvider, null, React.createElement(Probe))); });

let result;
await act(async () => { result = await value.signUp(' new@example.test ', 'test-password'); });
assert.equal(result.sessionStarted, false);
assert.equal(value.user, null, 'Signup alone must not grant account access');
assert.equal(calls.signUp[0].email, 'new@example.test');
assert.equal(calls.signUp[0].options.emailRedirectTo, 'https://preview.example.test/auth');

await act(async () => { result = await value.verifySignupCode('new@example.test', '000000'); });
assert.match(result.error, /invalid or expired/i);
assert.equal(value.user, null, 'Wrong code must not start a session');
assert.equal(calls.verify[0].type, 'email');

await act(async () => { result = await value.resendSignupCode('new@example.test'); });
assert.equal(result.error, undefined);
assert.deepEqual(JSON.parse(JSON.stringify(calls.resend[0])), {
  type: 'signup', email: 'new@example.test',
  options: { emailRedirectTo: 'https://preview.example.test/auth' },
});

await act(async () => { codeValid = true; result = await value.verifySignupCode('new@example.test', '123456'); });
assert.equal(result.error, undefined);
assert.equal(result.sessionStarted, true);
assert.equal(value.user.email, 'new@example.test');
assert.equal(value.busy, false);
await act(async () => { await value.signOut(); });
assert.equal(value.user, null);
await act(async () => { root.unmount(); });
console.log('PASS: signup waits for code; invalid code cannot sign in; resend uses signup template; valid code starts session');
