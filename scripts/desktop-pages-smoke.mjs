// Fresh profiles and local forum fixtures only; no sign-in or service mutations.
// APP_URL=http://localhost:8214 node scripts/desktop-pages-smoke.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.env.APP_URL ?? 'http://localhost:8214';
const output = 'scripts/ui-shots/desktop';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    if (!localStorage.getItem('galactoguide.session.v2:guest')) {
      localStorage.setItem('galactoguide.session.v2:guest', JSON.stringify({ portal: 'mother', disclaimerAccepted: true }));
    }
  });
  // Test content lives only in this local fixture, never in the app bundle/database.
  let forumMode = 'content';
  await context.route('**/rest/v1/**', (route) => {
    if (forumMode === 'offline') return route.fulfill({ status: 503, json: { message: 'Local offline fixture' } });
    const isThread = new URL(route.request().url()).pathname.endsWith('/forum_threads');
    return route.fulfill({ status: 200, json: forumMode === 'content' && isThread ? [{
      id: 'local-test-thread', user_id: null, author_name: 'Test member', title: 'Local test discussion',
      body: 'Discussion content for browser verification.', topic: 'Pumping & work',
      created_at: '2026-09-19T12:00:00Z', is_sample: false, deleted_at: null,
    }] : [] });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(String(error)));
  const visible = (locator) => locator.filter({ visible: true }).waitFor({ state: 'visible', timeout: 30000 });
  const go = async (path, locator) => {
    await page.goto(`${url}${path}`, { waitUntil: 'domcontentloaded' });
    await visible(locator);
    await page.evaluate(() => document.fonts.ready);
  };
  const shot = (name) => page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  const overflow = async () => {
    const clipped = await page.evaluate(() => [...document.querySelectorAll('[data-testid="app-frame"] *')].filter((node) => {
      if (!(node instanceof HTMLElement) || node.closest('[aria-hidden="true"]') || !node.clientWidth || !node.textContent?.trim()) return false;
      return ['visible', 'clip'].includes(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 2;
    }).map((node) => ({ text: node.textContent?.slice(0, 70), clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, html: node.outerHTML.slice(0, 220) })));
    if (clipped.length) await shot('pages-overflow-failure');
    assert.deepEqual(clipped, [], `${page.url()} at ${page.viewportSize().width}px: no clipped text`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  };
  const resize = async (width) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(250);
  };
  const columns = async (id, side) => {
    for (const width of [390, 900, 1024, 1280, 1440, 1920]) {
      await resize(width);
      const main = await page.getByTestId(`${id}-main`).boundingBox();
      const aside = await page.getByTestId(`${id}-sidebar`).boundingBox();
      assert.ok(main && aside);
      if (width >= 1280) {
        assert.ok(Math.abs(main.y - aside.y) < 2, `${id}: aligned columns at ${width}`);
        assert.equal(aside.width, 300);
        const [left, right] = side === 'left' ? [aside, main] : [main, aside];
        assert.ok(right.x >= left.x + left.width + 20, `${id}: separate columns at ${width}`);
      } else {
        assert.ok(main.y >= aside.y + aside.height - 2, `${id}: stacked at ${width}`);
      }
      await overflow();
    }
    await resize(1440);
  };

  await go('/a-z', page.getByText('Filter results', { exact: true }));
  await columns('az-columns', 'left');
  await shot('az-desktop');
  await page.getByRole('button', { name: 'Type filter, Herbs & supplements', exact: true }).click();
  await page.getByRole('button', { name: 'Effect on milk production filter, May increase milk production', exact: true }).click();
  const search = page.getByPlaceholder(/^Search \d+ entries$/);
  await search.fill('fenugreek');
  await visible(page.getByRole('button', { name: /^Fenugreek,/ }));
  await resize(390);
  assert.equal(await search.inputValue(), 'fenugreek');
  assert.ok(page.url().includes('category=herbal') && page.url().includes('kind=gogue'));
  await search.fill('no-such-entry');
  await visible(page.getByText('No matches for “no-such-entry”', { exact: true }));
  await resize(1440);
  await overflow();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await page.getByRole('button', { name: 'Clear all filters', exact: true }).click();
  assert.equal(await search.inputValue(), '');
  await visible(page.getByRole('button', { name: /^Fenugreek,/ }));

  await go('/substance/fenugreek?kind=gogue', page.getByText('Good to know', { exact: true }));
  await columns('entry-columns', 'right');
  await page.getByRole('button', { name: /^View \d+ sources$/ }).click();
  const sources = page.getByRole('link', { name: /opens in browser$/ });
  assert.equal(await sources.count(), 3);
  for (const width of [390, 1280, 1440]) {
    await resize(width);
    assert.equal(await sources.count(), 3, 'Source expansion survives resize');
    await overflow();
  }
  await shot('entry-sources-desktop');

  await go('/safety', page.getByText('Your situation', { exact: true }));
  await visible(page.getByText('Choose a situation to get started', { exact: true }));
  await shot('guide-empty-desktop');
  await page.getByRole('checkbox', { name: 'PCOS / insulin resistance', exact: true }).click();
  const group = page.getByRole('button', { name: /^Avoid \/ get specialist input,/ });
  await group.click();
  await columns('guide-columns', 'left');
  assert.equal(await group.getAttribute('aria-expanded'), 'true', 'Expanded guide group survives resize');
  assert.equal(await page.getByRole('checkbox', { name: 'PCOS / insulin resistance', exact: true }).getAttribute('aria-checked'), 'true');
  await page.getByRole('button', { name: 'May decrease', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'May decrease', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await group.click();
  await shot('guide-results-desktop');

  forumMode = 'empty';
  await go('/threads', page.getByText('No discussions yet', { exact: true }));
  await overflow();
  await shot('threads-empty-desktop');
  forumMode = 'offline';
  await go('/threads', page.getByText("Couldn't load discussions", { exact: true }));
  assert.equal(await page.getByText('No discussions yet', { exact: true }).count(), 0);
  forumMode = 'content';
  await page.getByRole('button', { name: 'Retry loading discussions', exact: true }).click();
  await visible(page.getByRole('button', { name: /^Local test discussion,/ }));
  await page.getByRole('progressbar').waitFor({ state: 'hidden', timeout: 30000 });
  await columns('threads-columns', 'right');
  await shot('threads-desktop');
  await page.getByRole('radio', { name: 'Pumping & work', exact: true }).click();
  await page.getByRole('radio', { name: 'Popular', exact: true }).click();
  await resize(390);
  assert.equal(await page.getByRole('radio', { name: 'Popular', exact: true }).getAttribute('aria-checked'), 'true');
  await resize(1440);
  const thread = page.getByRole('button', { name: /^Local test discussion,/ });
  await visible(thread);
  assert.equal(await page.getByTestId('threads-columns-main').getByRole('button').count(), 1);
  await thread.click();
  await visible(page.getByRole('heading', { name: 'Thread', exact: true }));
  await visible(page.getByText('Local test discussion', { exact: true }));
  await overflow();
  await shot('thread-detail-desktop');
  await page.goBack();
  assert.equal(await page.getByRole('radio', { name: 'Pumping & work', exact: true }).getAttribute('aria-checked'), 'true');

  await go('/about', page.getByRole('heading', { name: 'About GalactoGuide', exact: true }));
  await columns('about-columns', 'left');
  await shot('about-desktop');

  // Supporting pages share readable widths, including compact signed-out forms.
  for (const [path, title, width] of [
    ['/resources', 'Resources', 800],
    ['/essentials', 'Trusted Essentials', 800], ['/grading', 'How we grade evidence', 800],
    ['/account', 'My Account', 640], ['/feedback', 'Send feedback', 640],
    ['/threads/new', 'Start a thread', 640],
  ]) {
    await go(path, page.getByRole('heading', { name: title, exact: true }));
    assert.equal((await page.getByTestId('app-content').boundingBox()).width, width);
    await overflow();
    await shot(`${path.slice(1).replaceAll('/', '-')}-desktop`);
  }
  await go('/feedback', page.getByRole('heading', { name: 'Send feedback', exact: true }));
  await page.getByPlaceholder('Share your thoughts…').fill('Local layout check; never submitted.');
  await resize(390);
  await overflow();
  await resize(1440);
  assert.equal(await page.getByPlaceholder('Share your thoughts…').inputValue(), 'Local layout check; never submitted.');
  await go('/auth', page.getByPlaceholder('you@example.com'));
  assert.equal((await page.getByTestId('app-content').boundingBox()).width, 640);
  await page.getByPlaceholder('you@example.com').fill('layout-check@example.com');
  await resize(390);
  await overflow();
  await resize(1440);
  assert.equal(await page.getByPlaceholder('you@example.com').inputValue(), 'layout-check@example.com');
  await overflow();
  await shot('auth-desktop');
  await go('/account', page.getByRole('heading', { name: 'My Account', exact: true }));
  await page.getByLabel('Dark appearance').click();
  await go('/safety', page.getByText('Your situation', { exact: true }));
  await overflow();
  await shot('guide-dark-desktop');

  // Provider-specific entry copy must also fit the same two-column layout.
  await page.evaluate(() => localStorage.setItem('galactoguide.session.v2:guest', JSON.stringify({ portal: 'provider', disclaimerAccepted: true })));
  await go('/substance/fenugreek?kind=gogue', page.getByText('Mechanism', { exact: true }));
  await columns('entry-columns', 'right');
  await shot('provider-entry-dark-desktop');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Desktop pages passed: all four column layouts at six widths, filters, sources, guide state, fixture threads, supporting pages, draft preservation, dark mode, and provider content.');
} finally {
  await browser.close();
}
