// Local-only: exercise the real report transport and thread screen with mocked delivery.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const testRequire = createRequire(path.resolve(process.env.FORUM_TEST_RUNTIME ?? '.tmp/report-test-runtime', 'package.json'));
const React = testRequire('react');
const { create, act } = testRequire('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const thread = { id: 'thread', title: 'Test thread', body: 'Thread body', topic: 'Everyday support', isSample: false };
const replies = [
  { id: 'root', threadId: 'thread', parentReplyId: null, userId: 'alice', authorName: 'Alice', body: 'First comment' },
  { id: 'nested', threadId: 'thread', parentReplyId: 'root', userId: 'bob', authorName: 'Bob', body: '@Alice A & B?\nSecond line 🌸' },
].map((reply) => ({ ...reply, createdAt: '2026-09-14T12:00:00Z', isSample: false }));
let mode = 'success';
let release;
let onTimeout;
const calls = [];
const fetchMock = async (url, options) => {
  calls.push({ url, ...options, body: JSON.parse(options.body) });
  if (mode === 'hold') await new Promise((resolve) => { release = resolve; });
  if (mode === 'offline') throw new Error('Offline');
  if (mode === 'timeout') return new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  });
  return {
    ok: mode !== 'http-error',
    json: async () => {
      if (mode === 'malformed') throw new Error('Invalid JSON');
      return { ok: mode !== 'rejected' };
    },
  };
};
const colors = new Proxy({}, { get: () => '#123456' });
const mocks = {
  react: React,
  'react/jsx-runtime': testRequire('react/jsx-runtime'),
  'react-native': {
    ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'RefreshControl', 'ScrollView', 'Text', 'TextInput', 'View'].map((key) => [key, key])),
    StyleSheet: { create: (styles) => styles },
  },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
  '@expo/vector-icons': { Ionicons: 'Icon' },
  'expo-router': { useLocalSearchParams: () => ({ id: 'thread' }), Redirect: 'Redirect' },
  '@/context/AuthContext': { useAuth: () => ({ user: null }) },
  '@/context/PortalContext': { usePortal: () => ({ portal: 'mother', disclaimerAccepted: true }) },
  '@/context/ForumContext': { useForum: () => ({ getThread: () => thread, getReplies: () => replies }) },
  '@/components/forum-auth-prompt': { ForumAuthPrompt: 'AuthPrompt' },
  '@/components/forum-author-row': { ForumAuthorRow: 'AuthorRow' },
  '@/components/forum-post-actions': { ForumPostActions: ({ children }) => React.createElement('Actions', null, children) },
  '@/components/ScreenHeader': { ScreenHeader: 'ScreenHeader' },
  '@/components/form-scroll-view': { FormScrollView: 'ScrollView' },
  '@/components/SectionLabel': { SectionLabel: 'SectionLabel' },
  '@/theme': { font: {}, fontSize: {}, radius: {}, spacing: {}, useTheme: () => ({ colors }), useThemedStyles: (make) => make(colors) },
};
function load(file, env = {}) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    console, process: { env }, fetch: fetchMock, AbortController,
    setTimeout: (callback) => { onTimeout = callback; return 1; }, clearTimeout: () => { onTimeout = null; },
  })((name) => { if (mocks[name]) return mocks[name]; throw new Error(`Unexpected import: ${name}`); }, module, module.exports);
  return module.exports;
}
const service = load('src/lib/forum-report.ts');
mocks['@/lib/forum-report'] = service;
await service.sendCommentReport(thread, replies[1], '  Please review  ');
assert.equal(calls[0].url, 'https://formspree.io/f/xlgokjgl');
assert.equal(calls[0].body.comment_id, 'nested');
assert.equal(calls[0].body.parent_comment_id, 'root');
assert.equal(calls[0].body.comment_body, replies[1].body);
assert.equal(calls[0].body.thread_id, thread.id);
assert.equal(calls[0].body.reason, 'Please review');
assert.equal(calls[0].body.subject, 'GalactoGuide: reported comment');
assert.equal(onTimeout, null);
for (const failure of ['http-error', 'rejected', 'malformed', 'offline']) {
  mode = failure;
  await assert.rejects(service.sendCommentReport(thread, replies[0], ''), /Could not confirm/);
  assert.equal(onTimeout, null);
}
mode = 'timeout';
const pendingTimeout = service.sendCommentReport(thread, replies[0], '');
onTimeout();
await assert.rejects(pendingTimeout, /Could not confirm/);
const count = calls.length;
await assert.rejects(load('src/lib/forum-report.ts', { EXPO_PUBLIC_FORUM_REPORT_ENDPOINT: 'http://invalid.test' })
  .sendCommentReport(thread, replies[0], ''), /being set up/);
assert.equal(calls.length, count, 'Invalid configuration sends nothing');

const Screen = load('src/app/threads/[id].tsx').default;
let renderer;
const buttons = (label) => renderer.root.findAllByType('Pressable').filter((node) => node.props.accessibilityLabel === label);
const button = (label) => { const nodes = buttons(label); assert.equal(nodes.length, 1, label); return nodes[0]; };
const click = (label) => act(() => button(label).props.onPress());
const reason = () => renderer.root.findByProps({ accessibilityLabel: 'Reason for reporting (optional)' });
try {
  await act(async () => { renderer = create(React.createElement(Screen)); });
  await click('Report comment by Alice');
  await click('Cancel report');
  assert.equal(calls.length, count, 'Opening and cancelling sends nothing');
  await click('Report comment by Bob');
  await act(() => reason().props.onChangeText('Keep this reason'));
  mode = 'offline';
  await click('Send report');
  assert.equal(reason().props.value, 'Keep this reason', 'Failure preserves the reason');
  assert.equal(button('Send report').props.disabled, false, 'Failure allows retry');
  assert.ok(renderer.root.findAllByProps({ accessibilityRole: 'alert' }).length);
  mode = 'hold';
  const before = calls.length;
  await act(() => { const send = button('Send report').props.onPress; send(); send(); });
  assert.equal(calls.length, before + 1, 'Rapid taps submit once');
  assert.equal(button('Report comment by Alice').props.disabled, true, 'Cannot switch reports during submission');
  assert.equal(button('Cancel report').props.disabled, true);
  assert.equal(button('Send report').props.accessibilityState.busy, true);
  await act(async () => { release(); });
  assert.equal(button('Report comment by Bob').props.disabled, true, 'Successful report cannot be resubmitted on this screen');
  assert.equal(button('Report comment by Alice').props.disabled, false);
  assert.equal(buttons('Send report').length, 0);
  assert.equal(calls.at(-1).body.comment_id, 'nested');
  assert.equal(calls.at(-1).body.reason, 'Keep this reason');
  mode = 'success';
  await click('Report comment by Alice');
  await click('Send report');
  assert.equal(calls.at(-1).body.comment_id, 'root');
  assert.equal(calls.at(-1).body.reason, 'No additional details provided.');
  assert.equal(replies.length, 2, 'Reporting does not remove comments');
  console.log('PASS: report payload, HTTP/rejection/JSON/offline/timeout errors, config validation, cancel, retry, duplicate taps, nested/root comments, signed-out reporting, and success states. No emails sent.');
} finally {
  if (renderer) await act(() => renderer.unmount());
}
