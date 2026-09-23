// Run with: node scripts/auth-callback-check.mjs
// Exercise the real AuthProvider actions with mocked browser and Supabase I/O.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const browserWindow = { addEventListener() {}, removeEventListener() {}, location: { origin: 'https://preview.example.invalid', href: 'https://preview.example.invalid/auth' } };
function load(file, modules = {}) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { URL, URLSearchParams,
    process: { env: {} }, window: browserWindow, console: { info() {} } })(
    (name) => {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    }, module, module.exports,
  );
  return module.exports;
}

// Use Expo's installed URL parser, including query and fragment handling.
const queryParams = load('node_modules/expo-auth-session/src/QueryParams.ts');
const states = [];
let stateIndex = 0;
let mounted = false;
let authListener;
let storedSession = null;
let browserResult;
let exchangeError = null;
let exchangeThrows = false;
let emptySession = false;
let releaseExchange;
let holdExchange = false;
const exchanges = [];
const tokenPairs = [];
const platform = { OS: 'android' };
let initError = null;
let updateError = null;
let updateThrows = false;
const resets = [];
const updates = [];
const signedInSession = { user: { id: 'test-user' }, access_token: 'test-access', refresh_token: 'test-refresh' };
const auth = {
  initialize: async () => ({ error: initError }),
  getSession: async () => ({ data: { session: storedSession } }),
  onAuthStateChange: (listener) => {
    authListener = listener;
    return { data: { subscription: { unsubscribe() {} } } };
  },
  signInWithOAuth: async ({ provider, options }) => {
    assert.equal(provider, 'google');
    assert.equal(options.redirectTo, platform.OS === 'web' ? 'https://preview.example.invalid/auth' : 'galactoguide://auth');
    assert.equal(options.skipBrowserRedirect, platform.OS === 'web' ? undefined : true);
    return { data: { url: 'https://example.invalid/authorize' }, error: null };
  },
  exchangeCodeForSession: async (code) => {
    exchanges.push(code);
    if (holdExchange) await new Promise((resolve) => { releaseExchange = resolve; });
    if (exchangeThrows) throw new Error('Transport failed');
    if (exchangeError || emptySession) return { data: { session: null }, error: exchangeError };
    storedSession = signedInSession;
    authListener('SIGNED_IN', storedSession);
    return { data: { session: storedSession }, error: null };
  },
  setSession: async (tokens) => { tokenPairs.push(tokens); return { error: null }; },
  resetPasswordForEmail: async (email, options) => { resets.push({ email, ...options }); return { error: null }; },
  updateUser: async (attributes) => {
    updates.push(attributes);
    if (updateThrows) throw new Error('Offline');
    return { data: { user: signedInSession.user }, error: updateError };
  },
};
const { AuthProvider } = load('src/context/AuthContext.tsx', {
  react: {
    createContext: () => ({ Provider: 'Provider' }),
    useState: (initial) => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next) => { states[index] = next; }];
    },
    useEffect: (effect) => { if (!mounted) effect(); },
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value }),
  },
  'react/jsx-runtime': { jsx: (_type, props) => props },
  'react-native': { Platform: platform, AppState: { addEventListener: () => ({ remove() {} }) } },
  'expo-auth-session': { makeRedirectUri: (options) => {
    assert.equal(options?.scheme, 'galactoguide');
    assert.ok(['auth', 'reset-password'].includes(options?.path));
    assert.equal(options?.native, `galactoguide://${options.path}`);
    return options.native;
  } },
  'expo-auth-session/build/QueryParams': queryParams,
  'expo-web-browser': {
    maybeCompleteAuthSession() {},
    openAuthSessionAsync: async () => browserResult,
  },
  '@/lib/supabase': { supabase: { auth }, supabaseConfigured: true },
  '@/lib/site': load('src/lib/site.ts'),
});
function render() {
  stateIndex = 0;
  const { value } = AuthProvider({ children: null });
  mounted = true;
  return value;
}
render();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(render().hydrated, true);

browserResult = { type: 'success', url: 'galactoguide://auth?code=test%2Bcode' };
holdExchange = true;
const pending = render().signInWithGoogle();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(exchanges[0], 'test+code', 'PKCE callback must exchange its decoded code');
assert.equal(render().busy, true, 'Keep sign-in busy until the session exchange finishes');
assert.equal(render().user, null);
releaseExchange();
assert.equal((await pending).error, undefined);
assert.equal(render().busy, false);
assert.equal(render().user.id, 'test-user', 'SIGNED_IN must update account state');
holdExchange = false;

// Simulate a remount reading the session saved by the Supabase boundary.
states.length = 0;
mounted = false;
render();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(render().user.id, 'test-user');

exchangeError = { message: 'Code expired. Please try again.' };
assert.equal((await render().signInWithGoogle()).error, exchangeError.message);
exchangeError = null;
exchangeThrows = true;
assert.match((await render().signInWithGoogle()).error, /Please try again/);
assert.equal(render().busy, false);
exchangeThrows = false;
emptySession = true;
assert.match((await render().signInWithGoogle()).error, /No session/);
emptySession = false;

const exchangeCount = exchanges.length;
for (const url of [
  'galactoguide://?error=access_denied&error_description=Access+denied',
  'galactoguide://#error=access_denied&error_description=Access+denied',
  'galactoguide://?errorCode=Access%20denied',
]) {
  browserResult = { type: 'success', url };
  assert.equal((await render().signInWithGoogle()).error, 'Access denied');
}
for (const url of ['galactoguide://', 'galactoguide://#access_token=test-access']) {
  browserResult = { type: 'success', url };
  assert.match((await render().signInWithGoogle()).error, /No session/);
}
assert.equal(tokenPairs.length, 0, 'Incomplete credentials must not be submitted');
browserResult = { type: 'success', url: 'galactoguide://#access_token=test-access&refresh_token=test-refresh' };
assert.equal((await render().signInWithGoogle()).error, undefined);
assert.equal(tokenPairs[0].refresh_token, 'test-refresh');
for (const type of ['cancel', 'dismiss']) {
  browserResult = { type };
  assert.equal((await render().signInWithGoogle()).error, undefined);
  assert.equal(render().busy, false);
}
platform.OS = 'web';
assert.equal((await render().signInWithGoogle()).error, undefined);
assert.equal(exchanges.length, exchangeCount, 'Web redirects, errors, and cancellations must not exchange codes');
await render().resetPassword(' member@example.invalid ');
assert.equal(resets[0].redirectTo, 'https://preview.example.invalid/reset-password');
assert.equal(resets[0].email, 'member@example.invalid');
platform.OS = 'android';
await render().resetPassword('member@example.invalid');
assert.equal(resets[1].redirectTo, 'galactoguide://reset-password');
authListener('PASSWORD_RECOVERY', signedInSession);
assert.equal(render().passwordRecovery, true);
assert.match((await render().updatePassword('short')).error, /at least 6/);
assert.equal(updates.length, 0);
updateError = { message: 'Use a different password' };
assert.equal((await render().updatePassword('new-password')).error, updateError.message);
assert.equal(render().passwordRecovery, true, 'Failure keeps recovery active for retry');
updateError = null;
updateThrows = true;
assert.match((await render().updatePassword('new-password')).error, /connection/);
assert.equal(render().busy, false);
updateThrows = false;
assert.equal((await render().updatePassword('new-password')).error, undefined);
assert.equal(render().passwordRecovery, false);
authListener('SIGNED_OUT', null);
assert.match((await render().updatePassword('new-password')).error, /new password reset link/);
// A failed callback may coexist with an old session; it must not allow a reset.
storedSession = signedInSession;
initError = { message: 'Expired code' };
states.length = 0; mounted = false;
render(); await new Promise((resolve) => setImmediate(resolve));
assert.equal(render().hydrated, true);
assert.match((await render().updatePassword('new-password')).error, /could not be verified/);
console.log('PASS: recovery callbacks, validation, failed saves/retry, successful update, sign-out, and expired links with an existing session.');
console.log('PASS: PKCE exchange, account state, hydration, busy state, failures, legacy links, cancellation, and web delegation.');
