// Full exported app + real Expo navigator; all auth/data requests are local fixtures.
// Run npm run build:web first. No accounts or emails are created by this check.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.resolve('dist');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  try {
    let file = path.resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(dist + path.sep) && file !== dist) throw new Error('Invalid path');
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    else if (!path.extname(file)) file += '.html';
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    const jwt = [ { alg: 'HS256', typ: 'JWT' }, { sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 } ].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.fixture';
    const session = { access_token: jwt, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, user };
    const requests = [];
    let prefs;
    await context.routeWebSocket('**/*', ws => ws.close());
    await context.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === origin) return route.continue();
      const respond = (json, status = 200) => route.fulfill({ status, json, headers: { 'access-control-allow-origin': '*' } });
      if (url.pathname.startsWith('/auth/v1/')) {
        requests.push(url.pathname);
        if (url.pathname === '/auth/v1/signup') return respond({ ...user, identities: [] });
        if (url.pathname === '/auth/v1/verify') {
          if (req.postDataJSON().token !== '12345678') return respond({ msg: 'Invalid code', error_code: 'otp_expired' }, 403);
          return respond(session);
        }
        if (url.pathname === '/auth/v1/user') return respond(user);
        throw new Error(`Unexpected auth request ${url.pathname}`);
      }
      if (url.pathname.startsWith('/rest/v1/')) {
        if (url.pathname.endsWith('/user_prefs')) {
          if (req.method() === 'GET') {
            await new Promise(resolve => setTimeout(resolve, 300));
            return respond(prefs ?? null);
          }
          prefs = req.postDataJSON();
        }
        return respond([]);
      }
      // Never let a fixture session or any other request reach a real service.
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(origin);
    await page.getByRole('radio', { name: 'Parent or caregiver', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to onboarding', exact: true }).click();
    for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Preterm infant', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Create one', exact: true }).click();
    await page.getByPlaceholder('you@example.com', { exact: true }).fill(user.email);
    await page.getByPlaceholder('••••••••', { exact: true }).fill('local-fixture-password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    const code = page.getByRole('textbox', { name: 'Verification code', exact: true });
    await code.fill('00000000');
    await page.getByRole('button', { name: 'Verify email', exact: true }).click();
    await page.getByText('That code is invalid or expired. Check the latest email and try again.', { exact: true }).waitFor();
    await code.fill('12345678');
    await page.getByRole('button', { name: 'Verify email', exact: true }).click();
    await page.waitForTimeout(1500); // Include owner hydration and delayed remote reconciliation.
    assert.equal(new URL(page.url()).pathname, '/onboarding', 'Real navigator must not reset to the landing route after verification');
    await page.getByText('Signed in', { exact: true }).waitFor({ timeout: 3000 });
    assert.equal(new URL(page.url()).searchParams.get('step'), '5');
    assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isEnabled(), true);
    assert.equal(prefs.portal, 'mother');
    assert.deepEqual(prefs.situations, ['preterm']);
    assert.equal(prefs.disclaimer_accepted, false);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('heading', { name: "You're all set", exact: true }).waitFor();
    await page.getByRole('button', { name: 'Review disclaimer', exact: true }).click();
    await page.getByText('Before you continue', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/notices');
    assert.deepEqual(errors, []);
    assert.equal(requests.filter(req => req === '/auth/v1/verify').length, 2);
    console.log(`PASS ${width}px: real navigator retains step 6 after verification, Next reaches step 7 and notices; preferences preserved.`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
