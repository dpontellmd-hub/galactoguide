// Run with FORUM_TEST_RUNTIME pointing to temporary react-test-renderer dependencies.
// Executes the actual provider and action component against a disposable API fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const testRequire = createRequire(path.resolve(process.env.FORUM_TEST_RUNTIME ?? '.', 'package.json'));
const React = testRequire('react');
const { create, act } = testRequire('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let user = { id: 'alice' };
let api;
let failVote = false;
let failDelete = false;
let forumMode = 'content';
let releaseVote;
let holdVote = false;
const calls = [];
const remoteThreads = [{ id: 'thread', user_id: 'alice', author_name: 'Alice', title: 'Original title',
  body: 'Original post content', topic: 'Everyday support', created_at: new Date().toISOString(), is_sample: false }];
let remoteReplies = [
  { id: 'reply', user_id: 'alice', author_name: 'Alice', body: 'My reply', parent_reply_id: null },
  { id: 'nested', user_id: 'bob', author_name: 'Bob', body: 'Keep my response', parent_reply_id: 'reply' },
].map((row) => ({ ...row, thread_id: 'thread', is_sample: false, created_at: new Date().toISOString() }));
const votes = new Map();
const helpfulRows = () => [...votes].map(([key, voters]) => {
  const [kind, id] = key.split(':');
  return { target_kind: kind, target_id: id, helpful_count: voters.size, marked_helpful: voters.has(user?.id) };
});
const supabase = {
  rpc: async (name, input) => {
    calls.push({ name, input });
    if (name === 'get_forum_helpful') return { data: helpfulRows() };
    if (name === 'set_forum_helpful') {
      const voter = user.id;
      if (holdVote) await new Promise((resolve) => { releaseVote = resolve; });
      if (failVote) return { error: { message: 'Offline' } };
      const key = `${input.p_kind}:${input.p_id}`;
      const voters = votes.get(key) ?? new Set();
      if (input.p_helpful) voters.add(voter);
      else voters.delete(voter);
      votes.set(key, voters);
      return { data: [{ target_kind: input.p_kind, target_id: input.p_id,
        helpful_count: voters.size, marked_helpful: voters.has(voter) }] };
    }
    if (name === 'delete_forum_thread') {
      if (failDelete) return { error: { message: 'Offline' } };
      Object.assign(remoteThreads[0], { title: 'Deleted thread', body: 'This thread was deleted by its author.',
        user_id: null, author_name: 'Deleted author', deleted_at: new Date().toISOString() });
      return { data: input.p_id };
    }
    throw new Error(name);
  },
  from: (table) => {
    let deleting = false;
    const filters = {};
    const query = {
      select: () => query, order: () => query,
      delete: () => { deleting = true; return query; },
      eq: (key, value) => { filters[key] = value; return query; },
      then: (resolve, reject) => Promise.resolve().then(() => {
        if (deleting) {
          calls.push({ name: 'delete_reply', filters });
          if (failDelete) return { error: { message: 'Offline' } };
          const removed = remoteReplies.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
          remoteReplies = remoteReplies.filter((row) => !removed.includes(row)).map((row) =>
            row.parent_reply_id === filters.id ? { ...row, parent_reply_id: null } : row);
          return { data: removed.map(({ id }) => ({ id })) };
        }
        if (forumMode === 'offline') throw new Error('Offline');
        if (forumMode === 'error') return { error: { message: 'Service unavailable' } };
        if (forumMode === 'empty') return { data: [] };
        const samples = table === 'forum_threads'
          ? [{ ...remoteThreads[0], id: 'sample-thread', is_sample: true }]
          : [
            { ...remoteReplies[0], id: 'sample-reply', is_sample: true },
            { ...remoteReplies[0], id: 'test-reply', thread_id: 'sample-thread' },
          ];
        return { data: structuredClone([...(table === 'forum_threads' ? remoteThreads : remoteReplies), ...samples]) };
      }).then(resolve, reject),
    };
    return query;
  },
};
const colors = new Proxy({}, { get: () => '#123456' });
const mockModules = {
  react: React,
  'react/jsx-runtime': testRequire('react/jsx-runtime'),
  'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: (styles) => styles } },
  '@expo/vector-icons': { Ionicons: 'Icon' },
  '@/context/AuthContext': { useAuth: () => ({ user }) },
  '@/lib/supabase': { supabase, supabaseConfigured: true },
  '@/components/forum-auth-prompt': { ForumAuthPrompt: (props) => React.createElement('AuthPrompt', props) },
  '@/theme': { font: {}, fontSize: {}, radius: {}, spacing: {}, useTheme: () => ({ colors }), useThemedStyles: (make) => make(colors) },
};
function load(relative) {
  const file = path.resolve(relative);
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { setTimeout, clearTimeout, console })(
    (name) => { if (mockModules[name]) return mockModules[name]; throw new Error(`Unexpected import: ${name}`); }, module, module.exports);
  return module.exports;
}
mockModules['@/data/forum'] = load('src/data/forum.ts');
mockModules['@/context/ForumContext'] = load('src/context/ForumContext.tsx');
const { ForumProvider, useForum } = mockModules['@/context/ForumContext'];
const { ForumPostActions, helpfulCountLabel } = load('src/components/forum-post-actions.tsx');
assert.equal(helpfulCountLabel(1), '1 person found this helpful');
assert.equal(helpfulCountLabel(12), '12 people found this helpful');
function Harness() {
  api = useForum();
  const thread = api.getThread('thread');
  return React.createElement('Screen', null,
    thread && !thread.deletedAt && React.createElement(ForumPostActions, { kind: 'thread', id: thread.id, userId: thread.userId, isSample: false }),
    ...api.getReplies('thread').map((reply) => React.createElement(ForumPostActions,
      { key: reply.id, kind: 'reply', id: reply.id, userId: reply.userId, isSample: false })));
}
const app = () => React.createElement(ForumProvider, null, React.createElement(Harness));
let renderer;
const button = (id, label) => renderer.root.findByProps({ testID: `post-actions-${id}` }).findAllByType('Pressable')
  .find((item) => item.props.accessibilityLabel === label);
const click = async (id, label) => { const item = button(id, label); assert.ok(item, label); await act(() => item.props.onPress()); };
try {
  await act(async () => { renderer = create(app()); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  assert.equal(api.threads.length, 1, 'Sample threads are excluded');
  assert.equal(api.replies.length, 2, 'Sample replies and replies on sample threads are excluded');
  assert.equal(api.getThread('thread').replyCount, 2, 'Only visible replies count');
  assert.ok(button('thread', 'Delete thread'));
  assert.ok(!button('nested', 'Delete reply'), 'Other authors do not get a delete control');
  assert.ok((await api.deletePost('reply', 'nested')).error);
  await click('thread', 'Delete thread');
  await click('thread', 'Cancel deletion');
  assert.equal(calls.filter((call) => call.name === 'delete_forum_thread').length, 0);
  failVote = true;
  await click('thread', 'Was this helpful?');
  assert.equal(api.getHelpful('thread', 'thread').count, 0, 'Failed votes do not inflate counts');
  assert.ok(renderer.root.findAllByProps({ accessibilityRole: 'alert' }).length);
  failVote = false;
  await click('thread', 'Was this helpful?');
  assert.equal(api.getHelpful('thread', 'thread').count, 1);
  assert.equal(button('thread', 'Undo helpful vote').props['aria-pressed'], true);
  await act(() => api.refresh());
  assert.equal(api.getHelpful('thread', 'thread').marked, true, 'Selection survives reload');
  await click('thread', 'Undo helpful vote');
  assert.equal(api.getHelpful('thread', 'thread').count, 0);
  holdVote = true;
  const voteCallsBefore = calls.filter((call) => call.name === 'set_forum_helpful').length;
  await act(async () => { const onPress = button('nested', 'Was this helpful?').props.onPress; onPress(); onPress(); });
  assert.equal(calls.filter((call) => call.name === 'set_forum_helpful').length, voteCallsBefore + 1, 'Rapid taps save once');
  await act(async () => { releaseVote(); });
  holdVote = false;
  assert.equal(api.getHelpful('reply', 'nested').count, 1);
  failDelete = true;
  await click('thread', 'Delete thread');
  await click('thread', 'Confirm delete thread');
  assert.equal(api.getThread('thread').title, 'Original title', 'Failed deletion preserves content');
  failDelete = false;
  const before = JSON.stringify(api.getReplies('thread'));
  await click('thread', 'Confirm delete thread');
  assert.ok(api.getThread('thread').deletedAt);
  assert.equal(JSON.stringify(api.getReplies('thread')), before);
  await act(() => api.refresh());
  assert.ok(api.getThread('thread').deletedAt, 'Placeholder survives reload');
  await click('reply', 'Delete reply');
  await click('reply', 'Confirm delete reply');
  assert.equal(api.getReplies('thread').length, 1);
  assert.equal(api.getReplies('thread')[0].parentReplyId, null);
  assert.equal(api.getThread('thread').replyCount, 1);
  // An old account's in-flight vote must not replace the new viewer's selection.
  holdVote = true;
  await act(async () => { button('nested', 'Undo helpful vote').props.onPress(); });
  await act(async () => { user = { id: 'bob' }; renderer.update(app()); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  await act(async () => { releaseVote(); });
  holdVote = false;
  assert.equal(api.getHelpful('reply', 'nested').marked, false);
  await act(async () => { user = null; renderer.update(app()); });
  await click('nested', 'Was this helpful?');
  assert.equal(renderer.root.findAllByType('AuthPrompt').length, 1);
  assert.ok((await api.setHelpful('reply', 'nested', true)).error);
  forumMode = 'offline';
  await act(() => api.refresh());
  assert.equal(api.liveAvailable, false);
  assert.equal(api.threads.length, 1, 'Failed refresh retains previously loaded real content');
  forumMode = 'empty';
  await act(() => api.refresh());
  assert.equal(api.liveAvailable, true);
  assert.equal(api.threads.length, 0, 'An empty database stays empty');
  assert.equal(api.replies.length, 0);
  forumMode = 'error';
  await act(() => api.refresh());
  assert.equal(api.liveAvailable, false);
  assert.equal(api.threads.length, 0, 'Service errors never introduce examples');
  assert.equal(api.loading, false);
  assert.equal(api.refreshing, false);
  await act(() => renderer.unmount());
  renderer = undefined;
  await act(async () => { renderer = create(app()); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  assert.equal(api.threads.length, 0, 'A failed first load has no fallback examples');
  forumMode = 'content';
  await act(() => api.refresh());
  assert.equal(api.liveAvailable, true, 'Retry recovers from initial failure');
  assert.equal(api.threads.length, 1);
  console.log('PASS: example filtering, accurate reply counts, empty database, offline/service errors, stale content, and retry.');
  console.log('PASS: confirmation/cancel, owner controls, failed saves and retry, count/undo, rapid taps, refresh, preserved replies, reply counts, account switching, signed-out gating.');
} finally { if (renderer) await act(() => renderer.unmount()); }
