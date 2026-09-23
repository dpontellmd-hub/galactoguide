// Drives the Expo web app through first-run (portal → onboarding → notices)
// and screenshots the redesigned screens (Home discovery, Entry) in light and
// dark mode, plus the save → Home-saved flow and the Situation Guide. Run with:
//   node scripts/ui-smoke.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.APP_URL ?? 'http://localhost:8200';
const OUT = 'scripts/ui-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 480, height: 950 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const source = m.location().url;
  errors.push(source ? `${m.text()} (${source})` : m.text());
});

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.getByText('Choose your view').waitFor({ timeout: 60000 });
await shot('01-welcome');

// Portal pick → onboarding
await page.getByRole('radio', { name: 'Parent or caregiver' }).click();
await shot('01b-welcome-selected');
await page.setViewportSize({ width: 390, height: 844 });
await shot('01c-welcome-selected-compact');
await page.setViewportSize({ width: 480, height: 950 });
await page.getByRole('button', { name: 'Continue to onboarding' }).click();
await page.waitForTimeout(800);
await shot('02-onboarding');

// Click "Next"-style button until the notices screen appears (max 8 steps).
for (let i = 0; i < 8; i++) {
  if (await page.getByText('I understand and continue').count()) break;
  const next = page
    .getByRole('button')
    .filter({ hasText: /next|continue|got it|start|review/i })
    .last();
  if (!(await next.count())) break;
  await next.click();
  await page.waitForTimeout(600);
}
await shot('03-pre-notices');
await page.setViewportSize({ width: 390, height: 844 });
await shot('03a-pre-notices-compact');
await page.setViewportSize({ width: 480, height: 950 });
if (await page.getByText('I understand and continue').count()) {
  await page.getByText('I understand and continue').scrollIntoViewIfNeeded();
  await shot('03b-notices-acknowledgement');
  await page.getByText('I understand and continue').click();
  await page.waitForTimeout(800);
}

// Home discovery, light
await page.getByText('Support your milk production goals').waitFor({ timeout: 30000 });
await page.getByText('Search by name or brand').waitFor({ timeout: 15000 });
const azButton = page.getByRole('button', {
  name: 'Everything, A to Z — full alphabetical index',
});
await azButton.waitFor({ timeout: 15000 });
const azBox = await azButton.boundingBox();
const searchSectionBox = await page.getByRole('search', { name: 'Search by name or brand' }).boundingBox();
if (!azBox || !searchSectionBox || azBox.y >= searchSectionBox.y) {
  throw new Error('Everything, A–Z must appear between the discovery cards and search section');
}
if (await page.getByText('Explore milk supply').count()) {
  throw new Error('Older Home heading is still rendered');
}
if (await page.getByText('Featured entries').count()) {
  throw new Error('Older Featured entries section is still rendered');
}
await page.waitForTimeout(500);
await shot('04-home-light');

// A fresh visitor gets the account invitation, never an editable saved list.
const savedSignIn = page.getByRole('button', { name: 'Sign in or create an account to save entries', exact: true });
await savedSignIn.waitFor({ timeout: 15000 });
if (await page.getByRole('button', { name: 'Edit saved list', exact: true }).count()) {
  throw new Error('Guests must not be able to edit saved entries');
}
await savedSignIn.click();
await page.getByText('Welcome back', { exact: true }).waitFor({ timeout: 15000 });
await page.getByRole('button', { name: 'Close', exact: true }).click();
await savedSignIn.waitFor({ timeout: 15000 });

// The bottom-of-Home Trusted resources link is visible and reaches the existing screen.
const resourcesLink = page.getByRole('link', {
  name: 'Trusted resources — references and support directories',
});
await resourcesLink.scrollIntoViewIfNeeded();
await resourcesLink.waitFor({ timeout: 15000 });
await shot('04b-home-resources-link');
await resourcesLink.click();
await page.getByText('Resources for families').waitFor({ timeout: 15000 });
await page.getByLabel('Back').last().click();
await page.getByText('Support your milk production goals').waitFor({ timeout: 15000 });

if (process.env.ONBOARDING_ONLY === '1') {
  console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
}

// Entry (Fenugreek), light — open the current Home collection.
await page.getByRole('button', { name: /Increasing milk production/ }).click();
await page.getByText('Filter results').waitFor({ timeout: 15000 });
await page.waitForTimeout(300);
await shot('05-a-z-light');
await page.getByRole('button', { name: /^Fenugreek,/ }).click();
await page.getByText('Good to know').waitFor({ timeout: 15000 });
await page.waitForTimeout(400);
await shot('06-entry-light');
const signInToSave = page.getByRole('button', { name: 'Sign in to save', exact: true });
await signInToSave.click();
await page.getByText('Welcome back', { exact: true }).waitFor({ timeout: 15000 });
await page.getByRole('button', { name: 'Close', exact: true }).click();
await signInToSave.waitFor({ timeout: 15000 });
if (await page.getByRole('button', { name: 'Remove from saved', exact: true }).count()) {
  throw new Error('Dismissing sign-in must not save the entry');
}
await page.getByRole('button', { name: 'Back', exact: true }).click();
await page.getByText('Support milk production').waitFor({ timeout: 15000 });
await page.getByRole('button', { name: 'Back', exact: true }).click();
await page.waitForTimeout(600);

// Home still offers sign-in after dismissing the bookmark's account prompt.
await page.getByRole('tab', { name: 'Home' }).click();
await page.getByText('Support your milk production goals').waitFor({ timeout: 15000 });
await savedSignIn.waitFor({ timeout: 15000 });
await page.waitForTimeout(300);
await shot('07-home-after-entry');

// Guide tab — empty setup, selected context, and risk-first results.
await page.getByRole('tab', { name: 'For you' }).click();
await page.getByText('Your situation').waitFor({ timeout: 15000 });
await page.waitForTimeout(300);
await shot('07b-guide-empty');
await page.getByRole('checkbox', { name: 'PCOS / insulin resistance' }).click();
await page.getByText('Considering 1 situation').waitFor({ timeout: 15000 });
await page.getByLabel('Hide situation choices').click();
await page.getByRole('button', { name: /Avoid \/ get specialist input/ }).click();
await page.getByText('PCOS: avoid').first().waitFor({ timeout: 15000 });
await page.getByText('CONSIDERATIONS', { exact: true }).scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot('07c-guide-active');

// Dark mode via Home avatar → account → Dark appearance
await page.getByRole('tab', { name: 'Home' }).click();
await page.getByText('Support your milk production goals').waitFor({ timeout: 15000 });
// Reopening with a persisted situation used to crash while rendering Home rows.
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByText('Support your milk production goals').waitFor({ timeout: 15000 });
await page.getByLabel('Open my account').first().click();
await page.getByLabel('Dark appearance').waitFor({ timeout: 15000 });
await page.getByLabel('Dark appearance').click();
await page.waitForTimeout(400);
// `.last()`: the account screen is the most recently pushed, so its back
// button is the last "Back" in the DOM (earlier scenes stay mounted).
await page.getByLabel('Back').last().click();
await page.waitForTimeout(600);
await shot('08-home-dark');

// Entry, dark.
await page.getByRole('button', { name: /Increasing milk production/ }).click();
await page.getByRole('button', { name: /^Fenugreek,.*PCOS: avoid/ }).click();
await page.getByText('Good to know').waitFor({ timeout: 15000 });
await page.waitForTimeout(400);
await shot('09-entry-dark');

// Responsive web captures: narrow phone and tablet, both with bottom tabs.
await page.getByLabel('Back').last().click();
await page.getByText('Support milk production').waitFor({ timeout: 15000 });
await page.getByLabel('Back').last().click();
await page.getByText('Support your milk production goals').waitFor({ timeout: 15000 });
// Browse is intentionally absent; the remaining discovery/navigation tabs stay visible.
if (await page.getByRole('tab', { name: 'Browse' }).count()) {
  throw new Error('Browse tab should be hidden after merging discovery into Home');
}
for (const tabName of ['Home', 'For you', 'Threads', 'About']) {
  const tab = page.getByRole('tab', { name: tabName });
  if (!(await tab.count())) {
    throw new Error(`${tabName} tab is missing`);
  }
  if (!(await tab.locator('svg').count())) {
    throw new Error(`${tabName} tab icon is missing`);
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.getByText('Support your milk production goals').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot('10-home-dark-compact');
await page.setViewportSize({ width: 900, height: 900 });
await page.getByText('Support your milk production goals').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot('11-home-dark-wide');

// The active Guide remains readable in compact and wide dark layouts.
await page.getByRole('tab', { name: 'For you' }).click();
await page.getByText('Your situation').waitFor({ timeout: 15000 });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByText('Your situation').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot('12-guide-dark-compact');
await page.setViewportSize({ width: 900, height: 900 });
await page.getByText('Your situation').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot('13-guide-dark-wide');

// The flower mark remains intentionally prominent on About.
await page.getByRole('tab', { name: 'About' }).click();
await page.getByText('About GalactoGuide').waitFor({ timeout: 15000 });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await shot('14-about-dark-compact');

// Legacy Browse links remain compatible and land on the merged Home destination.
await page.goto(`${URL}/browse`, { waitUntil: 'domcontentloaded' });
await page.getByText('Support your milk production goals').waitFor({ timeout: 15000 });

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
