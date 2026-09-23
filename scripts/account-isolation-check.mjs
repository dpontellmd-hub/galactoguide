// Run with FORUM_TEST_RUNTIME pointing to the existing temporary React test runtime.
// Executes the real providers; storage, accounts, and database requests are fixtures.
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
let authHydrated = true;
let api;
let renderer;
let showOnboarding = false;
let routeParams = {};
let routeMounts = 0;
let Onboarding;
let releaseSignupReads;
const storage = new Map([
  ['galactoguide.favorites.v1', JSON.stringify({ ids: ['unowned-legacy-save'] })],
  ['galactoguide.situations.v1', JSON.stringify({ situations: ['legacy-private'], updatedAt: 999999 })],
]);
const writes = [];
const reads = [];
const holds = new Map();
const remoteFavorites = new Map([['alice', ['fenugreek']], ['bob', ['oats']]]);
const remotePrefs = new Map([
  ['alice', { portal: 'mother', disclaimer_accepted: true, situations: ['pregnant'], updated_at: new Date(2000).toISOString() }],
  ['bob', { portal: 'provider', disclaimer_accepted: true, situations: ['diabetes'], updated_at: new Date(1000).toISOString() }],
]);
const modules = {
  react: React, 'react/jsx-runtime': testRequire('react/jsx-runtime'),
  '@react-native-async-storage/async-storage': {
    getItem: async (key) => {
      const value = storage.get(key) ?? null;
      const held = holds.get(`storage:${key}`);
      if (held) await held.promise;
      return value;
    },
    setItem: async (key, value) => { storage.set(key, value); },
  },
  '@/context/AuthContext': { useAuth: () => ({
    user, hydrated: authHydrated, configured: true, busy: false,
    signUp: async () => ({ signupUserId: 'new-signup', sessionStarted: false }),
    verifySignupCode: async (_email, code) => {
      if (code !== '12345678') return { error: 'Invalid code' };
      // Auth events can arrive before verifyOtp's promise resolves. Delay account
      // storage as well, forcing the real screen to unmount behind the root gate.
      releaseSignupReads = ['session', 'situations'].map(name => hold('storage', `galactoguide.${name}.v2:new-signup`));
      user = { id: 'new-signup', email: 'new@example.test' };
      renderer.update(app());
      return { sessionStarted: true };
    },
  }) },
  '@/lib/supabase': { supabaseConfigured: true, supabase: { from: (table) => {
    let operation = 'read';
    let payload;
    const filters = {};
    const query = {
      select: () => query, maybeSingle: () => query,
      eq: (key, value) => { filters[key] = value; return query; },
      upsert: (data) => { operation = 'upsert'; payload = data; return query; },
      delete: () => { operation = 'delete'; return query; },
      then: (resolve, reject) => Promise.resolve().then(async () => {
        if (operation !== 'read') {
          writes.push({ table, operation, payload, filters: { ...filters } });
          return { data: null, error: null };
        }
        const owner = filters.user_id;
        reads.push({ table, owner });
        const hold = holds.get(`${table}:${owner}`);
        if (hold) await hold.promise;
        if (table === 'favorites') return { data: (remoteFavorites.get(owner) ?? []).map(substance_id => ({ substance_id })), error: null };
        return { data: remotePrefs.get(owner) ?? null, error: null };
      }).then(resolve, reject),
    };
    return query;
  } } },
};
function load(relative, name) {
  const compiled = ts.transpileModule(readFileSync(relative, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { setTimeout, clearTimeout, setInterval, clearInterval, console })(
    (id) => { if (modules[id]) return modules[id]; throw new Error(`Unexpected import: ${id}`); }, module, module.exports);
  modules[name] = module.exports;
  return module.exports;
}
const { PortalProvider, usePortal } = load('src/context/PortalContext.tsx', '@/context/PortalContext');
const { SituationsProvider, useSituations } = load('src/context/SituationsContext.tsx', '@/context/SituationsContext');
const { PrefsSyncProvider } = load('src/context/PrefsSyncContext.tsx', '@/context/PrefsSyncContext');
const { FavoritesProvider, useFavorites } = load('src/context/FavoritesContext.tsx', '@/context/FavoritesContext');
function Harness() { api = { favorites: useFavorites(), portal: usePortal(), situations: useSituations() }; return null; }
function MountedRoute() {
  React.useEffect(() => { routeMounts++; }, []);
  return React.createElement(Onboarding);
}
function RouteGate() {
  const portal = usePortal();
  const situations = useSituations();
  return showOnboarding && portal.hydrated && situations.hydrated ? React.createElement(MountedRoute) : null;
}
const app = () => React.createElement(PortalProvider, null,
  React.createElement(SituationsProvider, null, React.createElement(PrefsSyncProvider, null,
    React.createElement(FavoritesProvider, null, React.createElement(Harness), React.createElement(RouteGate)))));
const settle = async (ms = 20) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const switchTo = async (id) => {
  user = id ? { id } : null;
  await act(async () => { renderer.update(app()); });
  await settle();
};
const saved = () => Array.from(api.favorites.favorites).sort();
const situations = () => Array.from(api.situations.situations);
function hold(table, id) {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  holds.set(`${table}:${id}`, { promise });
  return () => { holds.delete(`${table}:${id}`); release(); };
}

try {
  await act(async () => { renderer = create(app()); });
  await settle();
  assert.deepEqual(saved(), ['fenugreek'], 'Unknown-owner legacy favorites must not upload into an account');
  assert.deepEqual(situations(), ['pregnant'], 'Unknown-owner legacy situations must not override account data');

  await switchTo('bob');
  assert.deepEqual(saved(), ['oats'], 'Bob must not inherit Alice favorites');
  assert.deepEqual(situations(), ['diabetes'], 'Bob must not inherit Alice situations');
  assert.equal(api.portal.portal, 'provider');
  assert.equal(writes.length, 0, 'Loading existing accounts must not upload foreign local data');

  await act(() => api.favorites.toggleFavorite('ginger'));
  await act(() => api.situations.setSituations(['low-supply']));
  await switchTo('alice'); // cancel Bob's pending preference debounce
  await settle(850);
  assert.deepEqual(saved(), ['fenugreek']);
  assert.deepEqual(situations(), ['pregnant']);
  assert.ok(writes.filter(w => w.table === 'favorites').every(w => w.payload?.user_id === 'bob'));
  assert.ok(!writes.some(w => w.table === 'user_prefs'), 'Switching users cancels the previous pending preference upload');

  await switchTo(null);
  assert.deepEqual(saved(), []);
  assert.deepEqual(situations(), [], 'Signing out restores guest preferences');
  await act(() => api.situations.setSituations(['guest-choice']));
  await switchTo('bob');
  assert.deepEqual(saved(), ['ginger', 'oats'], 'Same-account cached favorites remain available');
  assert.deepEqual(situations(), ['low-supply'], 'Same-account pending preferences remain available');
  await switchTo(null);
  assert.deepEqual(situations(), ['guest-choice'], 'Guest preferences remain separate');

  const releaseFavorites = hold('favorites', 'carol');
  const releasePrefs = hold('user_prefs', 'carol');
  remoteFavorites.set('carol', ['carol-private']);
  remotePrefs.set('carol', { portal: 'mother', disclaimer_accepted: true, situations: ['carol-private'], updated_at: new Date().toISOString() });
  await switchTo('carol');
  assert.deepEqual(saved(), []);
  assert.deepEqual(situations(), []);
  await switchTo('alice');
  await act(async () => { releaseFavorites(); releasePrefs(); });
  await settle();
  assert.deepEqual(saved(), ['fenugreek'], 'Late responses cannot replace the active account');
  assert.deepEqual(situations(), ['pregnant']);

  const releaseStorage = ['favorites', 'session', 'situations'].map(name => hold('storage', `galactoguide.${name}.v2:bob`));
  await switchTo('bob');
  assert.equal(api.favorites.hydrated, false);
  assert.deepEqual(saved(), [], 'Do not display another account while storage is loading');
  assert.deepEqual(situations(), []);
  await switchTo('alice');
  await act(async () => { releaseStorage.forEach(release => release()); });
  await settle();
  assert.deepEqual(saved(), ['fenugreek'], 'Rapid A -> B -> A switching preserves the correct cache');
  assert.deepEqual(situations(), ['pregnant']);
  assert.deepEqual(JSON.parse(storage.get('galactoguide.favorites.v2:alice')).ids, ['fenugreek']);

  await switchTo(null);
  const releaseReconciliation = hold('user_prefs', 'alice');
  const writeCount = writes.length;
  await switchTo('alice');
  await act(() => api.situations.setSituations(['alice-newer']));
  await settle(850);
  assert.equal(writes.length, writeCount, 'Wait for the remote read before uploading local preferences');
  await act(async () => { releaseReconciliation(); });
  await settle();
  assert.deepEqual(situations(), ['alice-newer'], 'Edits made during reconciliation survive the delayed read');
  assert.deepEqual(Array.from(writes.at(-1).payload.situations), ['alice-newer']);
  assert.equal(writes.at(-1).payload.user_id, 'alice');

  await act(async () => { renderer.unmount(); });
  authHydrated = false;
  const readsBeforeHydration = reads.length;
  await act(async () => { renderer = create(app()); });
  await settle();
  assert.equal(api.favorites.hydrated, false);
  assert.equal(api.situations.hydrated, false);
  assert.equal(reads.length, readsBeforeHydration, 'Wait for authentication before reading account data');
  authHydrated = true;
  await switchTo('alice');
  assert.deepEqual(saved(), ['fenugreek'], 'Account data survives remount');
  assert.deepEqual(situations(), ['alice-newer']);
  // Exercise the actual onboarding screen and shared form through the same
  // provider hydration gate as RootNavigator, not only isolated auth callbacks.
  const colors = new Proxy({}, { get: () => '#123456' });
  const numbers = new Proxy({}, { get: () => 10 });
  Object.assign(modules, {
    '@expo/vector-icons': { Ionicons: () => null },
    'expo-image': { Image: 'Image' },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'expo-router': {
      Redirect: 'Redirect', useLocalSearchParams: () => routeParams,
      useRouter: () => ({
        setParams: params => { routeParams = { ...routeParams, ...params }; renderer.update(app()); },
        push: path => { routeParams.destination = path; },
      }),
    },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text',
      TextInput: 'TextInput', View: 'View', StyleSheet: { create: value => value },
      useWindowDimensions: () => ({ width: 1280, height: 900, fontScale: 1 }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/legal-links': { LegalLinks: () => null },
    '@/components/form-scroll-view': { FormScrollView: 'ScrollView' },
    '@/components/EntryRow': { EntryRow: () => null },
    '@/components/ListCard': { ListCard: 'ListCard' },
    '@/hooks/use-responsive-layout': { useResponsiveLayout: () => ({ isDesktop: true }) },
    '@/data/repository': { getSubstanceById: () => undefined },
    '@/lib/format': { situationOrder: ['preterm', 'diabetes'], situationSelectorLabels: { preterm: 'Preterm', diabetes: 'Diabetes' } },
    '@/assets/images/dyad-health-collective.png': {},
    '@/assets/images/welcome-botanical-border.png': {},
    '@/theme': {
      font: { regular: {}, semibold: {}, bold: {}, extrabold: {} }, fontSize: numbers, radius: numbers, spacing: numbers,
      getPortalAccent: () => ({ main: '#123456', light: '#eeeeee' }),
      useTheme: () => ({ colors }), useThemedStyles: factory => factory(colors),
    },
  });
  const { prepareSignupOnboarding } = load('src/lib/signup-onboarding.ts', '@/lib/signup-onboarding');
  load('src/components/AuthForm.tsx', '@/components/AuthForm');
  Onboarding = load('src/app/onboarding.tsx', '@/app/onboarding').default;
  await switchTo(null);
  await act(() => { api.portal.selectPortal('mother'); api.situations.setSituations(['diabetes']); });
  showOnboarding = true;
  await act(() => renderer.update(app()));
  const button = label => renderer.root.findAllByType('Pressable').find(node => node.props.accessibilityLabel === label);
  const tap = async label => act(async () => { assert.ok(button(label), `Missing button ${label}`); await button(label).props.onPress(); });
  const text = () => renderer.root.findAllByType('Text').map(node => node.children.join('')).join(' ');
  for (let i = 0; i < 4; i++) await tap('Next');
  await tap('Preterm');
  await tap('Next');
  assert.match(text(), /6 of 7/);
  await act(() => renderer.root.findAllByType('Pressable').find(node => node.findAllByType('Text').some(child => child.children.join('') === 'Create one')).props.onPress());
  await act(() => {
    const inputs = renderer.root.findAllByType('TextInput');
    inputs[0].props.onChangeText('new@example.test');
    inputs[1].props.onChangeText('test-password');
  });
  await tap('Create account');
  await act(() => renderer.root.findByType('TextInput').props.onChangeText('00000000'));
  await tap('Verify email');
  assert.match(text(), /Invalid code/);
  assert.equal(user, null);
  await act(() => renderer.root.findByType('TextInput').props.onChangeText('12345678'));
  await tap('Verify email');
  assert.equal(api.portal.hydrated, false, 'Must exercise the navigator unmount during auth hydration');
  await act(async () => releaseSignupReads.forEach(release => release()));
  await settle(850);
  assert.equal(routeMounts, 2, 'The actual onboarding screen remounted after verification');
  assert.equal(renderer.root.findAllByType('Redirect').length, 0, 'Verification must never redirect to the landing page');
  assert.match(text(), /6 of 7/);
  assert.match(text(), /Signed in/);
  assert.equal(button('Next').props.disabled, false);
  assert.equal(api.portal.portal, 'mother');
  assert.equal(api.portal.disclaimerAccepted, false);
  assert.deepEqual(situations(), ['preterm'], 'Only choices made in this tour transfer; old guest clinical data stays separate');
  assert.deepEqual(saved(), [], 'Guest or other account favorites never transfer');
  assert.deepEqual(Array.from(writes.filter(w => w.table === 'user_prefs' && w.payload?.user_id === 'new-signup').at(-1).payload.situations), ['preterm']);
  await tap('Next');
  assert.match(text(), /7 of 7/);
  await tap('Review disclaimer');
  assert.equal(routeParams.destination, '/notices');
  showOnboarding = false;
  await switchTo('bob');
  assert.equal(api.portal.portal, 'provider');
  assert.deepEqual(situations(), ['low-supply']);
  const existingCache = storage.get('galactoguide.session.v2:bob');
  await prepareSignupOnboarding('bob', 'mother', ['preterm']);
  assert.equal(storage.get('galactoguide.session.v2:bob'), existingCache, 'An existing account cache must not be overwritten');
  console.log('Onboarding signup passed: full-code form, wrong-code retry, delayed owner hydration, route remount, same step, Next, notices, and isolated preferences.');
  console.log('Account isolation passed: legacy caches, account switching, guest separation, pending writes, stale responses, and hydration.');
} finally {
  if (renderer) await act(async () => { renderer.unmount(); });
}
