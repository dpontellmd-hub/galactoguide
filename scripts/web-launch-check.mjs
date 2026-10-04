// Test a local production export. Every auth/database request is intercepted;
// no email, account change, or other live write is sent.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.env.WEB_EXPORT_DIR ?? '.tmp/website-launch-web');
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const app = JSON.parse(await readFile('app.json', 'utf8'));
const storageKey = `sb-${new URL(app.expo.extra.supabaseUrl).hostname.split('.')[0]}-auth-token`;
const output = 'scripts/ui-shots/launch';
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const exists = (file) => stat(file).then((s) => s.isFile()).catch(() => false);
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = decodeURIComponent(url.pathname);
    if (config.cleanUrls && route.endsWith('.html')) {
      res.writeHead(308, { Location: route.slice(0, -5) + url.search }); res.end(); return;
    }
    let file = path.resolve(root, '.' + route);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if (route === '/') file = path.join(root, 'index.html');
    if (!await exists(file) && !path.extname(file) && await exists(file + '.html')) file += '.html';
    if (!await exists(file)) {
      const rewrite = config.rewrites.find(({ source }) => new RegExp(`^${source.replace(':id', '[^/]+')}$`).test(route));
      if (rewrite) file = path.join(root, rewrite.destination + (config.cleanUrls ? '.html' : ''));
    }
    if (!await exists(file)) { res.writeHead(404); res.end('Not found'); return; }
    for (const rule of config.headers ?? []) if (rule.source === route) for (const header of rule.headers) res.setHeader(header.key, header.value);
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(500); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const pageErrors = [];
try {
  assert.equal(config.outputDirectory, 'dist');
  for (const route of ['/', '/auth', '/reset-password', '/privacy.html', '/terms.html', '/threads/new', '/substance/fenugreek?kind=gogue', '/threads/test-thread']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /text\/html/);
  }
  assert.equal((await fetch(origin + '/_expo/missing.js')).status, 404, 'Missing assets are not rewritten to HTML');
  assert.equal((await fetch(origin + '/unknown-route')).status, 404);
  assert.equal((await fetch(origin + '/reset-password')).headers.get('referrer-policy'), 'no-referrer');
  browser = await chromium.launch();
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
    email: 'test@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, identities: [], created_at: '2026-09-19T00:00:00Z' };
  const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'fixture'].join('.');
  const session = { access_token: jwt, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
  async function profile({ expired = false, existingSession = false, verifier = true } = {}) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ storageKey, existingSession, session, verifier }) => {
      const prefs = JSON.stringify({ portal: 'mother', disclaimerAccepted: true });
      localStorage.setItem('galactoguide.session.v2:guest', prefs);
      localStorage.setItem(`galactoguide.session.v2:${session.user.id}`, prefs);
      if (verifier && location.search.includes('code=')) localStorage.setItem(storageKey + '-code-verifier', JSON.stringify('fixture-verifier/recovery'));
      if (existingSession) localStorage.setItem(storageKey, JSON.stringify(session));
    }, { storageKey, existingSession, session, verifier });
    const requests = [];
    const state = { failUpdate: false, holdUpdate: false, release: null };
    await context.route('https://**.supabase.co/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      requests.push({ method: request.method(), url, body: request.postDataJSON() });
      if (url.pathname.endsWith('/token')) {
        if (expired) return route.fulfill({ status: 400, json: { code: 'flow_state_expired', msg: 'Reset link expired' } });
        assert.equal(request.postDataJSON().code_verifier, 'fixture-verifier');
        return route.fulfill({ json: session });
      }
      if (url.pathname.endsWith('/user') && request.method() === 'PUT') {
        if (state.holdUpdate) await new Promise((resolve) => { state.release = resolve; });
        if (state.failUpdate) return route.fulfill({ status: 400, json: { code: 'weak_password', msg: 'Choose a different password.' } });
        return route.fulfill({ json: user });
      }
      if (url.pathname.endsWith('/user')) return route.fulfill({ json: user });
      if (url.pathname.endsWith('/recover')) return route.fulfill({ json: {} });
      if (url.pathname.endsWith('/user_prefs')) return route.fulfill({ json: null });
      return route.fulfill({ json: [] });
    });
    // Fail closed if the app attempts to use an unexpected external endpoint.
    await context.route('https://formspree.io/**', (route) => route.abort());
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    return { context, page, requests, state };
  }

  const main = await profile();
  await main.page.goto(origin + '/reset-password?code=valid-recovery');
  await main.page.getByLabel('New password', { exact: true }).waitFor();
  assert.equal(new URL(main.page.url()).pathname, '/reset-password');
  await main.page.getByLabel('New password', { exact: true }).fill('short');
  await main.page.getByRole('button', { name: 'Save new password' }).click();
  await main.page.getByRole('alert').filter({ hasText: 'at least 6' }).waitFor();
  await main.page.getByLabel('New password', { exact: true }).fill('new-password');
  await main.page.getByLabel('Confirm new password', { exact: true }).fill('different');
  await main.page.getByRole('button', { name: 'Save new password' }).click();
  await main.page.getByRole('alert').filter({ hasText: 'do not match' }).waitFor();
  assert.equal(main.requests.filter((r) => r.method === 'PUT').length, 0);
  await main.page.getByLabel('Confirm new password', { exact: true }).fill('new-password');
  main.state.failUpdate = true;
  await main.page.getByRole('button', { name: 'Save new password' }).click();
  await main.page.getByRole('alert').filter({ hasText: 'Choose a different password' }).waitFor();
  assert.equal(await main.page.getByLabel('New password', { exact: true }).inputValue(), 'new-password');
  await main.page.screenshot({ path: `${output}/reset-retry-phone.png`, fullPage: true });
  main.state.failUpdate = false;
  main.state.holdUpdate = true;
  await main.page.getByRole('button', { name: 'Save new password' }).click();
  await main.page.waitForFunction(() => document.querySelector('[aria-label="Save new password"]')?.getAttribute('aria-disabled') === 'true');
  main.state.release();
  await main.page.getByText('Password updated', { exact: true }).waitFor();
  assert.equal(main.requests.filter((r) => r.method === 'PUT').length, 2);
  await main.page.getByRole('button', { name: 'Continue to GalactoGuide' }).click();
  await main.page.waitForURL('**/home');
  await main.context.close();

  for (const existingSession of [false, true]) {
    const invalid = await profile({ expired: true, existingSession });
    await invalid.page.goto(origin + '/reset-password?code=expired');
    await invalid.page.getByRole('alert').filter({ hasText: 'could not be verified' }).waitFor();
    assert.equal(await invalid.page.getByLabel('New password', { exact: true }).count(), 0);
    await invalid.page.getByPlaceholder('you@example.com').fill('test@example.invalid');
    await invalid.page.getByRole('button', { name: 'Send reset link', exact: true }).click();
    await invalid.page.getByText('If that email has an account, a reset link is on its way.', { exact: true }).waitFor();
    assert.equal(invalid.requests.find((r) => r.url.pathname.endsWith('/recover')).url.searchParams.get('redirect_to'), origin + '/reset-password');
    await invalid.context.close();
  }
  const legacy = await profile();
  await legacy.page.goto(origin + '/auth?code=valid-recovery');
  await legacy.page.getByLabel('New password', { exact: true }).waitFor();
  assert.equal(new URL(legacy.page.url()).pathname, '/reset-password', 'Older callback routes enter recovery');
  await legacy.page.reload();
  await legacy.page.getByLabel('New password', { exact: true }).waitFor();
  await legacy.context.close();

  const wrongBrowser = await profile({ verifier: false, existingSession: true });
  await wrongBrowser.page.goto(origin + '/reset-password?code=no-verifier');
  await wrongBrowser.page.getByRole('alert').filter({ hasText: 'could not be verified' }).waitFor();
  assert.equal(await wrongBrowser.page.getByLabel('New password', { exact: true }).count(), 0);
  assert.equal(wrongBrowser.requests.filter((r) => r.url.pathname.endsWith('/token')).length, 0);
  await wrongBrowser.context.close();

  const guest = await profile({ verifier: false });
  await guest.page.goto(origin + '/reset-password');
  await guest.page.getByRole('alert').filter({ hasText: 'Open a password reset link' }).waitFor();
  await guest.page.goto(origin + '/auth');
  await guest.page.getByRole('link', { name: 'Privacy Policy', exact: true }).waitFor();
  assert.equal(await guest.page.getByRole('link', { name: 'Privacy Policy', exact: true }).getAttribute('href'), '/privacy.html');
  for (const width of [390, 1440]) {
    await guest.page.setViewportSize({ width, height: 900 });
    for (const [route, title] of [['privacy.html', 'Privacy Policy'], ['terms.html', 'Terms of Use']]) {
      await guest.page.goto(origin + '/' + route);
      await guest.page.getByRole('heading', { name: title, exact: true }).waitFor();
      assert.equal(await guest.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await guest.page.screenshot({ path: `${output}/${route}-${width}.png`, fullPage: true });
    }
  }
  await guest.page.goto(origin + '/substance/fenugreek?kind=gogue');
  await guest.page.getByText('Good to know', { exact: true }).waitFor();
  for (const src of await guest.page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')))) {
    assert.ok(src.startsWith('/_expo/'), 'Production asset paths have no Pages prefix');
    assert.equal((await fetch(origin + src)).status, 200);
  }
  await guest.page.goto(origin + '/threads/new');
  await guest.page.getByRole('heading', { name: 'Start a thread', exact: true }).waitFor();
  await guest.context.close();
  assert.deepEqual(pageErrors, []);
  console.log('PASS: root hosting/assets, static/dynamic deep links, legacy legal URLs, responsive policies, PKCE recovery, old callbacks, refresh, validation, retry, expiration with/without an existing session, success, and reset-email redirect. All remote I/O mocked.');
  if (process.env.CHECK_DESKTOP === '1') {
    process.env.APP_URL = origin;
    await import('./desktop-pages-smoke.mjs');
    await import('./desktop-smoke.mjs');
  }
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
