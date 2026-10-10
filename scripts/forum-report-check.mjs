// Disposable component fixtures only. No network or production configuration.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(path.resolve(process.env.FORUM_TEST_RUNTIME ?? '.', 'package.json'));
const React = require('react');
const { create, act } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let user = { id: 'viewer' };
let mode = 'success'; let release;
const calls = [];
const result = async (call) => {
  calls.push(call);
  if (mode === 'hold') await new Promise((resolve) => { release = resolve; });
  return mode === 'offline' ? { error: 'Offline. Please retry.' } : { data: true };
};
const colors = new Proxy({}, { get: () => '#123456' });
const mocks = {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', StyleSheet: { create: (s) => s } },
  'expo-router': { useRouter: () => ({ push: () => {} }) },
  '@/context/AuthContext': { useAuth: () => ({ user }) },
  '@/context/ForumContext': { useForum: () => ({ reportPost: (...args) => result({ name: 'report', args }), setBlocked: (...args) => result({ name: 'block', args }) }) },
  '@/theme': { font: {}, fontSize: {}, radius: {}, spacing: {}, useTheme: () => ({ colors }), useThemedStyles: (make) => make(colors) },
};
const source = readFileSync('src/components/forum-safety-actions.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { console })((name) => {
  if (!mocks[name]) throw new Error(name); return mocks[name];
}, module, module.exports);
const { ForumSafetyActions } = module.exports;
let renderer;
const app = (kind = 'thread', id = 'post') => React.createElement(ForumSafetyActions, { kind, id, userId: 'author' });
const find = (label) => renderer.root.findAllByType('Pressable').find((n) => n.props.accessibilityLabel === label);
const click = async (label) => { assert.ok(find(label), label); await act(() => find(label).props.onPress()); };
const textButton = (label) => renderer.root.findAllByType('Pressable').find((n) => n.findAllByType('Text').some((t) => t.children.join('') === label));
try {
  await act(() => { renderer = create(app()); });
  await click('Report thread');
  await act(() => textButton('Cancel').props.onPress());
  assert.equal(calls.length, 0, 'Cancel sends nothing');
  await click('Report thread');
  const reason = () => renderer.root.findByProps({ accessibilityLabel: 'Report details (optional)' });
  await act(() => reason().props.onChangeText('Please review'));
  mode = 'offline'; await click('Send report');
  assert.equal(reason().props.value, 'Please review');
  assert.ok(renderer.root.findAllByProps({ accessibilityRole: 'alert' }).length);
  mode = 'hold'; const before = calls.length;
  await act(() => { const send = find('Send report').props.onPress; send(); send(); });
  assert.equal(calls.length, before + 1, 'Concurrent taps submit once');
  assert.equal(find('Send report').props.disabled, true);
  await act(async () => release());
  assert.equal(find('Report thread').props.disabled, true);
  assert.deepEqual(calls.at(-1).args, ['thread', 'post', 'other', 'Please review']);
  mode = 'success'; await click('Block member');
  await act(() => textButton('Cancel').props.onPress());
  assert.equal(calls.filter((c) => c.name === 'block').length, 0);
  await click('Block member'); await click('Confirm block member');
  assert.deepEqual(calls.at(-1).args, ['author', true]);
  await act(() => renderer.update(app('reply', 'reply')));
  await click('Report reply'); await click('Send report');
  assert.deepEqual(calls.at(-1).args, ['reply', 'reply', 'other', '']);
  user = { id: 'new-viewer' };
  await act(() => renderer.update(app('reply', 'reply')));
  assert.equal(find('Report reply').props.disabled, false, 'Account switch resets submitted state');
  await click('Report reply');
  await act(() => renderer.root.findByProps({ accessibilityLabel: 'Report details (optional)' }).props.onChangeText('Private draft'));
  user = null; await act(() => renderer.update(app('reply', 'reply')));
  assert.equal(renderer.root.findAllByType('TextInput').length, 0, 'Signout erases report draft');
  const count = calls.length; await click('Report reply');
  assert.equal(find('Send report'), undefined, 'Anonymous reports require sign in or contact');
  assert.equal(calls.length, count);
  console.log('PASS: thread/reply report, optional category details, cancel, retry, duplicate taps, block confirmation, account-switch privacy, anonymous contact fallback. No network calls.');
} finally { if (renderer) await act(() => renderer.unmount()); }

// Execute moderator controls against a disposable RPC fixture as well.
let roleAllowed = false;
const moderationCalls = [];
const queueRows = [{ id: 'report-1', thread_id: 'thread', target_kind: 'thread', target_id: 'post',
  category: 'harassment', reason: 'Please review', status: 'open', created_at: '2026-10-10T00:00:00Z',
  author_id: 'author', author_name: 'Author', title: 'Post title', body: 'Fixture post body', resolution: null }];
mocks['react-native'].ScrollView = 'ScrollView';
mocks['@/components/ScreenHeader'] = { ScreenHeader: 'ScreenHeader' };
mocks['@/context/ForumContext'] = { useForum: () => ({ safety: { is_moderator: roleAllowed }, refresh: async () => {} }) };
mocks['@/lib/supabase'] = { supabase: { rpc: async (name, args) => {
  moderationCalls.push({ name, args });
  if (name === 'moderation_queue') return { data: queueRows };
  if (name === 'list_forum_suspensions') return { data: [] };
  return { data: true };
} } };
const queueCompiled = ts.transpileModule(readFileSync('src/app/moderation.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const queueModule = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${queueCompiled}\n})`, { console, setTimeout, clearTimeout })((name) => {
  if (!mocks[name]) throw new Error(name); return mocks[name];
}, queueModule, queueModule.exports);
user = { id: 'moderator' };
const Queue = queueModule.exports.default;
try {
  await act(() => { renderer = create(React.createElement(Queue)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  assert.equal(moderationCalls.length, 0, 'Unknown/nonmoderator role does not request private queue');
  roleAllowed = true; await act(() => renderer.update(React.createElement(Queue)));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  assert.ok(textButton('Remove post'));
  await act(() => textButton('Remove post').props.onPress());
  await act(() => textButton('Cancel').props.onPress());
  assert.equal(moderationCalls.filter((c) => c.name === 'moderate_forum_report').length, 0);
  await act(() => textButton('Remove & suspend author').props.onPress());
  await act(() => textButton('Confirm action').props.onPress());
  assert.equal(moderationCalls.find((c) => c.name === 'moderate_forum_report').args.p_action, 'suspend');
  user = null; roleAllowed = false; await act(() => renderer.update(React.createElement(Queue)));
  assert.equal(textButton('Remove post'), undefined, 'Signout hides report content and actions');
  console.log('PASS: moderator queue role gate, author suspension explicit confirmation, cancellation, and signout privacy. SQL suite separately verifies server authorization.');
} finally { if (renderer) await act(() => renderer.unmount()); }

// Multiple blocked accounts must remain distinguishable when names match/reorder.
let blockedMembers = [
  { user_id: 'blocked-a', author_name: 'Alex', reference: '18AC9F74B130' },
  { user_id: 'blocked-b', author_name: 'Alex', reference: 'B52D418209C6' },
];
let unblockMode = 'success'; let finishUnblock;
const unblockCalls = [];
mocks['react-native'].Linking = { openURL: async () => {} };
mocks['@/context/ForumContext'] = { useForum: () => ({
  safety: { blocked_users: blockedMembers, is_moderator: false, is_suspended: false }, refresh: async () => {},
  setBlocked: async (id, blocked) => {
    unblockCalls.push({ id, blocked });
    if (unblockMode === 'hold') await new Promise((resolve) => { finishUnblock = resolve; });
    if (unblockMode === 'error') return { error: 'Could not remove this block.' };
    blockedMembers = blockedMembers.filter((member) => member.user_id !== id);
    return { data: true };
  },
}) };
const rulesCompiled = ts.transpileModule(readFileSync('src/app/community-rules.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const rulesModule = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${rulesCompiled}\n})`, { console })((name) => {
  if (!mocks[name]) throw new Error(name); return mocks[name];
}, rulesModule, rulesModule.exports);
const Rules = rulesModule.exports.default;
const alexA = 'Alex (ref 18AC9F74B130)'; const alexB = 'Alex (ref B52D418209C6)';
user = { id: 'viewer' };
try {
  await act(() => { renderer = create(React.createElement(Rules)); });
  assert.ok(find(`Unblock ${alexA}`)); assert.ok(find(`Unblock ${alexB}`));
  await click(`Unblock ${alexB}`);
  assert.ok(JSON.stringify(renderer.toJSON()).includes(`Remove your block on `));
  assert.ok(find(`Confirm unblock ${alexB}`), 'Confirmation identifies selected account, not list position');
  await click('Cancel unblock');
  assert.equal(unblockCalls.length, 0, 'Cancel leaves both blocks intact');
  await click(`Unblock ${alexB}`);
  blockedMembers = [...blockedMembers].reverse();
  await act(() => renderer.update(React.createElement(Rules)));
  assert.ok(find(`Confirm unblock ${alexB}`), 'Reordering does not retarget a pending confirmation');
  unblockMode = 'error'; await click(`Confirm unblock ${alexB}`);
  assert.equal(blockedMembers.length, 2, 'Failure preserves both blocks');
  assert.ok(find(`Confirm unblock ${alexB}`), 'Failure can be retried');
  unblockMode = 'hold'; const before = unblockCalls.length;
  await act(() => { const confirm = find(`Confirm unblock ${alexB}`).props.onPress; confirm(); confirm(); });
  assert.equal(unblockCalls.length, before + 1, 'Double taps unblock once');
  assert.equal(find(`Confirm unblock ${alexB}`).props.disabled, true);
  await act(async () => finishUnblock());
  assert.deepEqual(unblockCalls.at(-1), { id: 'blocked-b', blocked: false });
  assert.deepEqual(blockedMembers.map((member) => member.user_id), ['blocked-a']);
  assert.ok(find(`Unblock ${alexA}`), 'Remaining account keeps the same name/reference after another is removed');
  assert.equal(find(`Unblock ${alexB}`), undefined);
  await click(`Unblock ${alexA}`);
  user = { id: 'another-viewer' }; await act(() => renderer.update(React.createElement(Rules)));
  assert.equal(find(`Confirm unblock ${alexA}`), undefined, 'Account change clears pending confirmation');
  console.log('PASS: duplicate display names distinguished by stable references; account-specific unblock confirmation; cancel/error/retry; reordering; duplicate taps; only selected block removed; account-switch reset.');
} finally { if (renderer) await act(() => renderer.unmount()); }
