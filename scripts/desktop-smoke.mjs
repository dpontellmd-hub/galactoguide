// Uses a fresh browser profile; never signs in or writes to the live service.
// APP_URL=http://localhost:8214 node scripts/desktop-smoke.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.env.APP_URL ?? 'http://localhost:8214';
const output = 'scripts/ui-shots/desktop';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    if (!localStorage.getItem('galactoguide.session.v2:guest')) {
      localStorage.setItem('galactoguide.session.v2:guest', JSON.stringify({ portal: 'mother', disclaimerAccepted: true }));
    }
  });
  const home = page.getByRole('heading', { name: 'Support your milk production goals' });
  const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
  const visible = async (locator) => {
    try { await locator.waitFor({ state: 'visible', timeout: 30000 }); }
    catch (error) {
      await page.screenshot({ path: `${output}/failure.png` });
      console.error('Page:', page.url(), (await page.locator('body').innerText()).slice(0, 2400), errors);
      throw error;
    }
  };
  const box = async (locator) => { await visible(locator); return locator.boundingBox(); };
  const shot = (name) => page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  const overflow = async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal page overflow');
    const overflowing = await page.evaluate(() => [...document.querySelectorAll('[data-testid="app-frame"] *')].filter((node) => {
      if (!(node instanceof HTMLElement) || node.closest('[aria-hidden="true"]') || node.clientWidth === 0) return false;
      const style = getComputedStyle(node);
      return ['visible', 'clip'].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 2;
    }).map((node) => node.textContent?.slice(0, 70)));
    assert.deepEqual(overflowing, [], 'No clipped or overflowing content');
  };

  await page.goto(`${url}/home`, { waitUntil: 'domcontentloaded' });
  await visible(home);
  for (const width of [390, 900, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(250);
    assert.equal(await sidebar.isVisible(), width >= 1024, `Sidebar at ${width}px`);
    assert.equal(await page.getByTestId('navigation-rail').count(), 0, 'Web never uses the app navigation rail');
    const discovery = await box(page.getByTestId('home-discovery'));
    const support = await box(page.getByTestId('home-support'));
    if (width >= 1280) {
      assert.ok(support.x >= discovery.x + discovery.width + 20, 'Supporting column beside discovery');
      assert.ok(Math.abs(support.y - discovery.y) < 2, 'Columns aligned');
    } else {
      assert.ok(support.y >= discovery.y + discovery.height, 'Supporting content stacks at narrower widths');
    }
    if (width < 1024) {
      await visible(page.getByRole('tab', { name: 'Home', exact: true }));
      assert.ok((await box(page.getByTestId('app-frame'))).width <= (width < 768 ? 480 : 720));
    } else {
      assert.equal(await page.getByRole('tab', { name: 'Home', exact: true }).isVisible(), false);
      assert.ok((await box(page.getByTestId('app-frame'))).width <= 1440);
      const homeLink = sidebar.getByRole('link', { name: 'Home', exact: true });
      assert.ok((await box(homeLink)).height >= 48, 'Sidebar links retain their full interaction area');
      assert.equal(await homeLink.evaluate((node) => getComputedStyle(node).flexDirection), 'row', 'Sidebar icons and labels align horizontally');
    }
    await overflow();
    await shot(`home-${width}-light`);
  }

  // Search and route state survive crossing the navigation breakpoint.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: /Increasing milk production/ }).click();
  await visible(page.getByText('Filter results', { exact: true }));
  const input = page.locator('input').filter({ visible: true });
  await input.fill('fenugreek');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(250);
    assert.equal(await input.inputValue(), 'fenugreek', 'Resizing preserves the search query');
    assert.ok(page.url().includes('kind=gogue'), 'Resizing preserves the selected collection');
    await overflow();
  }
  await page.getByRole('button', { name: /^Fenugreek,/ }).click();
  await visible(page.getByText('Good to know', { exact: true }));
  await visible(sidebar);
  await shot('entry-desktop');
  await page.goBack();
  assert.equal(await input.inputValue(), 'fenugreek', 'Browser Back restores the filtered search');
  await sidebar.getByRole('link', { name: 'Home', exact: true }).click();
  await visible(home);

  // The sidebar uses real links, with visible keyboard focus and active location.
  const guide = sidebar.getByRole('link', { name: 'For you', exact: true });
  assert.ok((await guide.getAttribute('href')).endsWith('/safety'));
  await sidebar.getByRole('link', { name: 'Home', exact: true }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await guide.evaluate((node) => node === document.activeElement), true);
  await page.waitForFunction(() => getComputedStyle(document.activeElement).boxShadow !== 'none');
  assert.notEqual(await guide.evaluate((node) => getComputedStyle(node).boxShadow), 'none');
  await page.keyboard.press('Enter');
  await visible(page.getByText('Your situation', { exact: true }));
  assert.equal(await guide.getAttribute('aria-current'), 'page');
  await page.getByRole('checkbox', { name: 'PCOS / insulin resistance' }).click();
  await page.setViewportSize({ width: 390, height: 1000 });
  await visible(page.getByText('Considering 1 situation', { exact: true }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visible(page.getByText('Considering 1 situation', { exact: true }));
  await sidebar.getByRole('link', { name: 'Threads', exact: true }).click();
  await visible(page.getByText('Community threads', { exact: true }));
  await sidebar.getByRole('link', { name: 'About', exact: true }).click();
  await visible(page.getByText('About GalactoGuide', { exact: true }));
  await sidebar.getByRole('link', { name: 'My account', exact: true }).click();
  await page.getByLabel('Dark appearance').click();
  await sidebar.getByRole('link', { name: 'Home', exact: true }).click();
  await visible(home);
  await overflow();
  await shot('home-1440-dark');
  await page.setViewportSize({ width: 1440, height: 600 });
  await visible(sidebar.getByRole('link', { name: 'My account', exact: true }));
  await overflow();
  await shot('home-short-window-dark');
  // Browser zoom reduces the CSS viewport; this also covers compact desktop windows.
  await page.setViewportSize({ width: 720, height: 500 });
  await visible(page.getByRole('tab', { name: 'Home', exact: true }));
  await overflow();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${url}/substance/fenugreek?kind=gogue`, { waitUntil: 'domcontentloaded' });
  await visible(page.getByText('Good to know', { exact: true }));
  await visible(sidebar);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await visible(page.getByText('Good to know', { exact: true }));
  await visible(sidebar);
  await sidebar.getByRole('link', { name: 'Home', exact: true }).click();
  await visible(home);
  await page.goto(`${url}/browse`, { waitUntil: 'domcontentloaded' });
  await visible(home);
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Desktop smoke passed: six widths, compact height, shared navigation, resize state, keyboard, browser Back, dark mode, and deep links.');
} finally {
  await browser.close();
}
