// Real React provider lifecycle. Every auth/browser/Apple/Linking boundary is fake.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const flush = () => new Promise(resolve => setImmediate(resolve));
const freshSession = { user: { id: 'recovered-user' }, access_token: 'fixture', refresh_token: 'fixture' };
const oldSession = { user: { id: 'old-user' }, access_token: 'old-fixture' };

async function fixture({ platform = 'android', launchUrl = null, initialSession = null, appleEnabled = false, holdSession = false, webUrl = 'https://preview.example.invalid/auth' } = {}) {
  let value, root, authListener, linkListener, stored = initialSession, releaseSession;
  const calls = { exchanges: [], updates: [], oauth: [], resets: [], apple: [], idTokens: [], removes: 0 };
  const controls = { exchangeError: false, exchangeThrows: false, emptySession: false, updateError: false, updateThrows: false,
    browserResult: { type: 'cancel' }, holdExchange: false, releaseExchange: null, appleError: null, appleBadState: false,
    appleNoToken: false, appleIdError: false, appleAvailable: true, holdApple: false, releaseApple: null, signOutError: false };
  const auth = {
    initialize: async () => ({ error: null }),
    getSession: async () => {
      const snapshot = stored;
      if (holdSession) await new Promise(resolve => { releaseSession = resolve; });
      return { data: { session: snapshot } };
    },
    onAuthStateChange: listener => { authListener = listener; return { data: { subscription: { unsubscribe() {} } } }; },
    exchangeCodeForSession: async code => {
      calls.exchanges.push(code);
      if (controls.holdExchange) await new Promise(resolve => { controls.releaseExchange = resolve; });
      if (controls.exchangeThrows) throw new Error('Fixture transport failure');
      if (controls.exchangeError || controls.emptySession) return { data: { session: null }, error: controls.exchangeError ? { message: 'Expired' } : null };
      const recovery = code.startsWith('recovery');
      stored = freshSession;
      authListener(recovery ? 'PASSWORD_RECOVERY' : 'SIGNED_IN', stored);
      return { data: { session: stored, redirectType: recovery ? 'recovery' : null }, error: null };
    },
    signInWithOAuth: async args => { calls.oauth.push(args); return { data: { url: 'https://provider.example.invalid' }, error: null }; },
    resetPasswordForEmail: async (email, options) => { calls.resets.push({ email, ...options }); return { error: null }; },
    updateUser: async args => { calls.updates.push(args); if (controls.updateThrows) throw new Error('Offline'); return { error: controls.updateError ? { message: 'Choose another password' } : null }; },
    signOut: async () => {
      if (controls.signOutError) return { error: { message: 'Fixture network failure' } };
      stored = null; authListener('SIGNED_OUT', null); return { error: null };
    },
    signInWithIdToken: async args => {
      calls.idTokens.push(args);
      if (controls.holdApple) await new Promise(resolve => { controls.releaseApple = resolve; });
      if (controls.appleIdError) return { data: { session: null }, error: { message: 'Fixture rejection' } };
      stored = freshSession; authListener('SIGNED_IN', stored);
      return { data: { session: stored }, error: null };
    },
  };
  const modules = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { Platform: { OS: platform } },
    'expo-constants': { expoConfig: { extra: { appleSignInEnabled: appleEnabled } } },
    'expo-auth-session': { makeRedirectUri: options => options.native },
    'expo-linking': {
      addEventListener: (_event, listener) => { linkListener = listener; return { remove() { calls.removes++; } }; },
      getInitialURL: async () => launchUrl,
    },
    'expo-web-browser': { maybeCompleteAuthSession() {}, openAuthSessionAsync: async () => controls.browserResult },
    'expo-crypto': { getRandomBytesAsync: async size => randomBytes(size), randomUUID,
      CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_algorithm, text) => createHash('sha256').update(text).digest('hex') },
    'expo-apple-authentication': {
      isAvailableAsync: async () => controls.appleAvailable,
      AppleAuthenticationScope: { EMAIL: 'email' },
      signInAsync: async args => {
        calls.apple.push(args);
        if (controls.appleError) throw { code: controls.appleError };
        return { identityToken: controls.appleNoToken ? null : 'fixture-apple-id-token', state: controls.appleBadState ? 'wrong' : args.state };
      },
    },
    '@/lib/site': { webPath: path => '/' + path },
    '@/lib/supabase': { supabaseConfigured: true, supabase: { auth } },
  };
  function load(file) {
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { URL, URLSearchParams,
      window: { location: { origin: 'https://preview.example.invalid', href: webUrl } }, console,
    })(id => { assert.ok(id in modules, `Unexpected import ${id}`); return modules[id]; }, module, module.exports);
    return module.exports;
  }
  modules['@/lib/native-auth-callback'] = load('src/lib/native-auth-callback.ts');
  modules['@/lib/apple-sign-in'] = load('src/lib/apple-sign-in.ts');
  const { AuthProvider, useAuth } = load('src/context/AuthContext.tsx');
  function Probe() { value = useAuth(); return null; }
  await act(async () => { root = create(React.createElement(AuthProvider, null, React.createElement(Probe))); await flush(); });
  return { get value() { return value; }, calls, controls,
    emit: async url => { await act(async () => { linkListener({ url }); await flush(); }); },
    releaseSession: async () => { await act(async () => { releaseSession(); await flush(); }); },
    action: async (name, ...args) => { let result; await act(async () => { result = await value[name](...args); }); return result; },
    get stored() { return stored; },
    close: async () => { await act(async () => root.unmount()); if (platform !== 'web') assert.equal(calls.removes, 1); },
  };
}

let f = await fixture({ launchUrl: 'galactoguide://reset-password?code=recovery-cold' });
assert.equal(f.value.hydrated, true); assert.equal(f.value.user.id, 'recovered-user'); assert.equal(f.value.passwordRecovery, true);
assert.equal(f.calls.exchanges.length, 1);
assert.match((await f.action('updatePassword', 'short')).error, /at least 6/);
f.controls.updateError = true;
assert.match((await f.action('updatePassword', 'long-password')).error, /another password/);
assert.equal(f.value.passwordRecovery, true);
f.controls.updateError = false; f.controls.updateThrows = true;
assert.match((await f.action('updatePassword', 'long-password')).error, /connection/);
f.controls.updateThrows = false;
assert.equal((await f.action('updatePassword', 'long-password')).error, undefined);
assert.equal(f.value.passwordRecovery, false);
await f.emit('galactoguide://reset-password?code=recovery-cold');
assert.equal(f.calls.exchanges.length, 1); assert.equal(f.value.passwordRecovery, false, 'Repeated link cannot reauthorize a completed reset');
assert.match((await f.action('updatePassword', 'another-password')).error, /new password reset link/);
await f.close();

f = await fixture({ initialSession: oldSession });
assert.equal(f.value.passwordRecovery, false);
f.controls.exchangeError = true;
await f.emit('galactoguide://reset-password?code=recovery-expired');
assert.equal(f.value.user.id, 'old-user'); assert.ok(f.value.authCallbackError);
assert.match((await f.action('updatePassword', 'long-password')).error, /could not be verified/);
assert.equal(f.calls.updates.length, 0);
f.controls.exchangeError = false;
await f.emit('galactoguide://reset-password?code=recovery-warm');
assert.equal(f.value.passwordRecovery, true); assert.equal(f.value.authCallbackError, null);
await f.action('signOut'); assert.equal(f.value.user, null); assert.equal(f.value.passwordRecovery, false);
await f.close();

f = await fixture({ initialSession: oldSession, holdSession: true });
await f.emit('galactoguide://reset-password?code=recovery-race');
await f.releaseSession();
assert.equal(f.value.user.id, 'recovered-user', 'Stale hydration must not overwrite the exchanged session');
await f.close();

f = await fixture();
f.controls.holdExchange = true;
await f.emit('galactoguide://auth?code=oauth-duplicate');
assert.equal(f.value.authCallbackPending, true); assert.equal(f.value.busy, true);
f.controls.browserResult = { type: 'success', url: 'galactoguide://auth?code=oauth-duplicate' };
let pending;
await act(async () => { pending = f.value.signInWithGoogle(); await flush(); });
assert.equal(f.calls.exchanges.length, 1);
await act(async () => { f.controls.releaseExchange(); await pending; });
assert.equal(f.value.busy, false); assert.equal(f.value.user.id, 'recovered-user');
f.controls.holdExchange = false;
for (const type of ['cancel', 'dismiss']) {
  f.controls.browserResult = { type };
  assert.equal((await f.action('signInWithGoogle')).error, undefined);
  assert.equal(f.value.busy, false);
}
await f.action('resetPassword', ' member@example.invalid ');
assert.equal(f.calls.resets[0].email, 'member@example.invalid');
assert.equal(f.calls.resets[0].redirectTo, 'galactoguide://reset-password');
await f.close();

f = await fixture({ initialSession: oldSession });
for (const url of ['https://evil.example.invalid/reset-password?code=evil', 'galactoguide://other?code=evil',
  'galactoguide://auth.evil?code=evil', 'galactoguide://user@auth?code=evil', 'not a URL']) await f.emit(url);
assert.equal(f.calls.exchanges.length, 0);
for (const url of ['galactoguide://reset-password', 'galactoguide://auth?code=a&code=b',
  'galactoguide://reset-password?error=expired', 'galactoguide://auth#access_token=x&refresh_token=y']) {
  await f.emit(url); assert.ok(f.value.authCallbackError); assert.equal(f.value.passwordRecovery, false);
}
assert.equal(f.calls.exchanges.length, 0);
await f.emit('galactoguide://reset-password?code=oauth-wrong-purpose');
assert.ok(f.value.authCallbackError); assert.equal(f.value.passwordRecovery, false);
f.controls.exchangeThrows = true;
await f.emit('galactoguide://reset-password?code=recovery-offline');
assert.equal(f.value.busy, false); assert.ok(f.value.authCallbackError);
f.controls.exchangeThrows = false; f.controls.emptySession = true;
await f.emit('galactoguide://reset-password?code=recovery-empty'); assert.ok(f.value.authCallbackError);
await f.close();

f = await fixture({ platform: 'web', initialSession: oldSession, webUrl: 'https://preview.example.invalid/reset-password?code=unresolved' });
assert.ok(f.value.authCallbackError);
assert.match((await f.action('updatePassword', 'long-password')).error, /could not be verified/);
await f.action('signInWithGoogle', 'delete-account');
assert.equal(f.calls.oauth[0].options.redirectTo, 'https://preview.example.invalid/delete-account');
assert.equal(f.calls.oauth[0].options.skipBrowserRedirect, undefined);
await f.action('resetPassword', 'member@example.invalid');
assert.equal(f.calls.resets[0].redirectTo, 'https://preview.example.invalid/reset-password');
await f.close();

for (const platform of ['web', 'android', 'ios']) {
  f = await fixture({ platform });
  assert.equal(f.value.appleAvailable, false);
  assert.match((await f.action('signInWithApple')).error, /not available/);
  assert.equal(f.calls.apple.length, 0); await f.close();
}
f = await fixture({ platform: 'ios', appleEnabled: true });
assert.equal(f.value.appleAvailable, true);
assert.equal((await f.action('signInWithApple')).sessionStarted, true);
assert.equal(f.calls.idTokens[0].provider, 'apple');
assert.equal(f.calls.idTokens[0].nonce.length, 64);
assert.equal(createHash('sha256').update(f.calls.idTokens[0].nonce).digest('hex'), f.calls.apple[0].nonce);
await f.action('signInWithApple');
assert.notEqual(f.calls.apple[0].nonce, f.calls.apple[1].nonce);
assert.notEqual(f.calls.apple[0].state, f.calls.apple[1].state);
f.controls.appleError = 'ERR_REQUEST_CANCELED';
assert.equal((await f.action('signInWithApple')).error, undefined);
f.controls.appleError = 'ERR_UNKNOWN'; assert.ok((await f.action('signInWithApple')).error);
f.controls.appleError = null; f.controls.appleBadState = true;
assert.ok((await f.action('signInWithApple')).error);
f.controls.appleBadState = false; f.controls.appleNoToken = true;
assert.ok((await f.action('signInWithApple')).error);
assert.equal(f.calls.idTokens.length, 2, 'Unverified Apple credentials never reach Supabase');
f.controls.appleNoToken = false; f.controls.appleIdError = true;
assert.ok((await f.action('signInWithApple')).error); assert.equal(f.value.busy, false);
await f.close();
console.log('PASS: native cold/warm recovery, hydration race, duplicate replay, stale sessions, invalid links, failed exchanges, reset validation/retry, cancellation, web/deletion redirects, Apple gate, hashed nonce/state and failure paths. No live I/O.');

f = await fixture({ initialSession: oldSession });
f.controls.holdExchange = true;
await f.emit('galactoguide://reset-password?code=recovery-signout-race');
let signingOut;
await act(async () => { signingOut = f.value.signOut(); await flush(); });
assert.equal(f.value.user, null);
await act(async () => { f.controls.releaseExchange(); await signingOut; });
assert.equal(f.value.user, null); assert.equal(f.stored, null); assert.equal(f.value.passwordRecovery, false);
await f.close();

f = await fixture(); f.controls.holdExchange = true;
await f.emit('galactoguide://reset-password?code=recovery-cancel-race');
await f.action('dismissPasswordRecovery');
await act(async () => { f.controls.releaseExchange(); await flush(); });
assert.equal(f.value.passwordRecovery, false, 'Cancelling pending recovery prevents late redirect/reactivation');
assert.match((await f.action('updatePassword', 'long-password')).error, /new password reset link/);
await f.close();

f = await fixture({ platform: 'ios', appleEnabled: true, initialSession: oldSession });
f.controls.holdApple = true;
let applePending;
await act(async () => { applePending = f.value.signInWithApple(); await flush(); });
await act(async () => { signingOut = f.value.signOut(); await flush(); });
assert.equal(f.value.user, null);
await act(async () => { f.controls.releaseApple(); await applePending; await signingOut; });
assert.equal(f.value.user, null); assert.equal(f.stored, null); assert.equal(f.value.passwordRecovery, false);
await f.close();
console.log('PASS: sign-out waits for pending native/Apple exchanges and clears persisted sessions; reset cancellation rejects late recovery completion.');

f = await fixture({ initialSession: oldSession });
f.controls.signOutError = true;
await f.action('signOut');
assert.equal(f.value.user, null); assert.match(f.value.signOutError, /signing out/);
assert.equal(f.value.busy, false, 'Retry button must become available after network failure');
assert.match((await f.action('signInWithGoogle')).error, /finish signing out/);
f.controls.signOutError = false;
await f.action('signOut');
assert.equal(f.value.signOutError, null); assert.equal(f.stored, null);
assert.equal((await f.action('signInWithGoogle')).cancelled, true, 'Auth actions work after successful sign-out retry');
await f.close();
console.log('PASS: failed sign-out exposes retry, keeps stale sessions suppressed, then clears stored session and unblocks auth.');

// Contract check against installed auth-js (not a mock of its response shape).
// All transport is intercepted by this isolated client; no external fetch exists.
const sdkStorage = new Map();
const sdk = createClient('https://auth-contract.invalid', 'fixture-public-key', {
  auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, flowType: 'pkce',
    storageKey: 'fixture-auth', storage: {
      getItem: key => sdkStorage.get(key) ?? null,
      setItem: (key, value) => sdkStorage.set(key, value),
      removeItem: key => sdkStorage.delete(key),
    } },
  global: { fetch: async (url, options) => {
    assert.equal(String(url), 'https://auth-contract.invalid/auth/v1/token?grant_type=pkce');
    const body = JSON.parse(options.body);
    assert.equal(body.auth_code, 'contract-code'); assert.equal(body.code_verifier, 'fixture-verifier');
    return new Response(JSON.stringify({ access_token: 'fixture-access', refresh_token: 'fixture-refresh',
      token_type: 'bearer', expires_in: 3600, user: { id: 'sdk-fixture-user' } }), { status: 200 });
  } },
});
await sdk.auth.initialize();
sdkStorage.set('fixture-auth-code-verifier', JSON.stringify('fixture-verifier/recovery'));
const sdkResult = await sdk.auth.exchangeCodeForSession('contract-code');
assert.equal(sdkResult.error, null);
assert.equal(sdkResult.data.redirectType, 'recovery', 'Upgrade must preserve persisted recovery marker or handler fails closed');
assert.equal(sdkResult.data.session.user.id, 'sdk-fixture-user');
assert.equal(sdkStorage.has('fixture-auth-code-verifier'), false);
console.log('PASS: installed auth-js exchanges the persisted PKCE verifier, returns its recovery marker, and removes the consumed verifier (transport fixture only).');

f = await fixture({ initialSession: oldSession, holdSession: true,
  launchUrl: 'galactoguide://reset-password?code=recovery-abandoned-launch' });
await f.action('signOut');
await f.releaseSession();
assert.equal(f.value.user, null); assert.equal(f.stored, null);
assert.equal(f.calls.exchanges.length, 0, 'Sign-out discards launch callback waiting behind hydration');
assert.equal(f.value.hydrated, true);
await f.close();
console.log('PASS: sign-out invalidates delayed initial session hydration and its abandoned launch callback.');
