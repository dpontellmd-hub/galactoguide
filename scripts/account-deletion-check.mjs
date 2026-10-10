// Executes real helper/screen with local fixtures; no fetch or live credentials.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const React = require('react');
const { create, act } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let calls = [], rpcResult = { data: true, error: null }, holdRpc, removedKeys = [], routes = [], onSignOut;
let sessionOwner = 'alice';
const supabase = {
  rpc: (name, args) => ({ setHeader: async (header, value) => {
    calls.push({ name, args, header, value });
    if (holdRpc) await holdRpc;
    return rpcResult;
  } }),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: sessionOwner }, access_token: `${sessionOwner}-fixture-token` } } }),
    signOut: async ({ scope }) => { assert.equal(scope, 'local'); calls.push({ signOut: true }); onSignOut?.(); return { error: null }; },
  },
};
let auth = {
  user: { id: 'alice', email: 'alice@example.test', identities: [{ provider: 'email' }, { provider: 'google' }] },
  hydrated: true, busy: false, configured: true, authCallbackError: null,
  signInWithPassword: async () => ({}), signInWithGoogle: async () => ({}), signInWithApple: async () => ({}), appleAvailable: false,
};
const modules = {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
  'expo-apple-authentication': {},
  '@react-native-async-storage/async-storage': { multiRemove: async (keys) => { removedKeys.push(...keys); } },
  '@/lib/supabase': { supabase, supabaseConfigured: true },
  'react-native': { Platform: { OS: 'web' }, Linking: { openURL: async () => {} }, StyleSheet: { create: x => x }, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' },
  'expo-router': { useRouter: () => ({ replace: p => routes.push(p), push: p => routes.push(p) }) },
  '@/components/ScreenHeader': { ScreenHeader: 'ScreenHeader' },
  '@/context/AuthContext': { useAuth: () => auth },
  '@/theme': { font: {}, radius: {}, spacing: {}, useThemedStyles: () => ({}) },
};
function load(file, name) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console })(id => {
    if (!(id in modules)) throw new Error(`Unexpected import ${id}`);
    return modules[id];
  }, module, module.exports);
  modules[name] = module.exports;
  return module.exports;
}
const helper = load('src/lib/account-deletion.ts', '@/lib/account-deletion');
assert.equal((await helper.deleteOwnAccount('delete', 'token')).deleted, false);
assert.equal(calls.length, 0, 'Incorrect consent never makes a request');
assert.equal((await helper.deleteOwnAccount('DELETE', '')).deleted, false);
assert.equal(calls.length, 0, 'Missing auth never makes a request');
for (const message of ['deletion_disabled', 'deletion_reauthentication_required', 'deletion_apple_revocation_required', 'deletion_session_invalid']) {
  rpcResult = { data: null, error: { message } };
  const result = await helper.deleteOwnAccount('DELETE', 'alice-token');
  assert.equal(result.deleted, false); assert.ok(result.error.length > 20);
}
rpcResult = { data: null, error: null };
assert.equal((await helper.deleteOwnAccount('DELETE', 'alice-token')).deleted, false, 'Only explicit server success counts');
rpcResult = { data: true, error: null };
await helper.deleteOwnAccount('DELETE', 'alice-token');
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), { name: 'delete_own_account', args: { p_confirmation: 'DELETE' }, header: 'Authorization', value: 'Bearer alice-token' });
calls = [];
const Screen = load('src/app/delete-account.tsx', 'screen').default;
let renderer;
await act(async () => { renderer = create(React.createElement(Screen)); });
const text = node => node.findAllByType('Text').map(t => t.children.join('')).join(' ');
const button = label => renderer.root.findAllByType('Pressable').find(n => text(n).includes(label));
const confirm = () => renderer.root.findByProps({ accessibilityLabel: 'Type DELETE to confirm permanent account deletion' });
const typeConfirm = value => act(async () => { confirm().props.onChangeText(value); });
assert.equal(button('Permanently delete').props.disabled, true);
await act(async () => { button('Cancel / Keep').props.onPress(); });
assert.deepEqual(routes, ['/account']); assert.equal(calls.length, 0);
await typeConfirm('DELETE');
await act(async () => { button('Verify with Google').props.onPress(); });
assert.equal(confirm().props.value, '', 'Cancelled/finished reauth always requires fresh consent');
assert.equal(calls.length, 0, 'Reauth never deletes');
await typeConfirm('DELETE');
auth = { ...auth, user: { ...auth.user, id: 'bob' } };
await act(async () => { renderer.update(React.createElement(Screen)); });
assert.equal(confirm().props.value, '', 'Account switch clears consent');
await typeConfirm('DELETE');
await act(async () => { await button('Permanently delete').props.onPress(); });
assert.equal(calls.length, 0, 'Changed live session fails before RPC');
auth = { ...auth, user: { ...auth.user, id: 'alice' } };
await act(async () => { renderer.update(React.createElement(Screen)); });
await typeConfirm('DELETE');
rpcResult = { data: null, error: { message: 'deletion_disabled' } };
await act(async () => { await button('Permanently delete').props.onPress(); });
assert.equal(removedKeys.length, 0); assert.ok(!calls.some(c => c.signOut), 'Failed deletion must preserve session/data');
await typeConfirm('DELETE');
let release;
holdRpc = new Promise(resolve => { release = resolve; });
rpcResult = { data: true, error: null };
let pending;
await act(async () => {
  const press = button('Permanently delete').props.onPress;
  pending = press();
  void press();
  await Promise.resolve();
});
assert.equal(calls.filter(c => c.name).length, 2, 'Only one additional RPC despite double press');
onSignOut = () => {
  // RootNavigator hides/remounts routes while account-scoped providers hydrate.
  renderer.unmount();
  auth = { ...auth, user: null };
  renderer = create(React.createElement(Screen));
};
await act(async () => { release(); await pending; });
assert.equal(calls.filter(c => c.signOut).length, 1);
assert.deepEqual(removedKeys, ['galactoguide.favorites.v2:alice', 'galactoguide.session.v2:alice', 'galactoguide.situations.v2:alice']);
assert.ok(text(renderer.root).includes('were deleted'));
assert.equal(helper.getDeletionReceipt().phase, 'complete', 'Confirmed server receipt survives sign-out route remount');
auth = { ...auth, user: { id: 'bob', email: 'bob@example.test', identities: [{ provider: 'email' }] } };
await act(async () => { renderer.update(React.createElement(Screen)); });
assert.equal(helper.getDeletionReceipt(), null, 'A different signed-in account expires the previous account receipt');
assert.ok(!text(renderer.root).includes('were deleted'), 'Never show deletion success for a different account');
assert.equal(confirm().props.value, '', 'New account can start its own independently confirmed deletion');
// Isolated completion-receipt fixture for the acknowledgement control.
await act(async () => { helper.setDeletionReceipt({ ownerId: 'bob', phase: 'complete' }); });
await act(async () => { button('Return to account').props.onPress(); });
assert.equal(helper.getDeletionReceipt(), null, 'Acknowledgement clears ephemeral receipt');
await act(async () => renderer.unmount());
console.log('Account deletion client checks passed: consent, errors, pinned token, cancellation, reauth, account switch, duplicate submit, local cleanup.');
