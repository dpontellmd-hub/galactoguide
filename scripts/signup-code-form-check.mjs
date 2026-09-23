// Verify the shared signup form moves to an in-place code step, without a live account.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const colors = new Proxy({}, { get: () => '#123456' });
const numbers = new Proxy({}, { get: () => 10 });
const auth = {
  user: null, busy: false, configured: true,
  signUp: async () => ({ sessionStarted: false }),
  verifySignupCode: async (_email, code) => code === '123456' ? { sessionStarted: true } : { error: 'Invalid code' },
  resendSignupCode: async () => ({}),
};
const modules = {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
  '@expo/vector-icons': { Ionicons: () => null },
  'react-native': {
    ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text',
    TextInput: 'TextInput', View: 'View', StyleSheet: { create: value => value },
  },
  '@/context/AuthContext': { useAuth: () => auth },
  '@/components/legal-links': { LegalLinks: () => null },
  '@/theme': {
    font: { regular: {}, semibold: {}, bold: {}, extrabold: {} },
    fontSize: numbers, radius: numbers, spacing: numbers,
    useTheme: () => ({ colors }), useThemedStyles: factory => factory(colors),
  },
};
const compiled = ts.transpileModule(readFileSync('src/components/AuthForm.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { setInterval, clearInterval })(
  id => { assert.ok(modules[id], `Unexpected import ${id}`); return modules[id]; }, module, module.exports,
);
const { AuthForm } = module.exports;
const pending = [];
let root;
await act(async () => { root = create(React.createElement(AuthForm, {
  accent: '#123456', initialMode: 'signup', onVerificationPendingChange: value => pending.push(value),
})); });
const inputs = () => root.root.findAllByType('TextInput');
const button = label => root.root.findAllByType('Pressable').find(node => node.props.accessibilityLabel === label);
const visibleText = () => root.root.findAllByType('Text').map(node => node.children.join('')).join(' ');

await act(async () => {
  inputs()[0].props.onChangeText('new@example.test');
  inputs()[1].props.onChangeText('test-password');
});
await act(async () => { await button('Create account').props.onPress(); });
assert.match(visibleText(), /Check your email/);
assert.match(visibleText(), /new@example.test/);
assert.equal(inputs().length, 1, 'Password field must be replaced with the code field');
assert.equal(inputs()[0].props.accessibilityLabel, 'Verification code');
assert.equal(pending.at(-1), true, 'Onboarding Next is held during verification');
assert.equal(button('Resend verification code').props.disabled, true, 'Resend waits for the first email');

await act(async () => { inputs()[0].props.onChangeText('000000'); });
await act(async () => { await button('Verify email').props.onPress(); });
assert.match(visibleText(), /Invalid code/);
assert.equal(pending.at(-1), true, 'Wrong code must remain on the verification step');

await act(async () => { inputs()[0].props.onChangeText('123456'); });
await act(async () => { await button('Verify email').props.onPress(); });
assert.match(visibleText(), /Email verified/);
await act(async () => { root.unmount(); });
assert.equal(pending.at(-1), false);
console.log('PASS: account creation shows code entry; wrong code stays put; correct code can continue');
