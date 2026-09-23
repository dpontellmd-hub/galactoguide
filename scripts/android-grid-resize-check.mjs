// Install the APK and finish onboarding on an emulator before running:
// ADB_SERIAL=emulator-5582 node scripts/android-grid-resize-check.mjs
// To check a saved UI hierarchy without changing a device:
// node scripts/android-grid-resize-check.mjs --snapshot path/to/hierarchy.xml
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const titles = ['New prescription?', 'Increasing milk production?', 'What can lower my milk production?', 'Herbs & supplements'];
const decode = (value) => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
function checkGrid(xml, label) {
  const nodes = [...xml.matchAll(/<node\b[^>]*>/g)].map(([tag]) => Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)]),
  ));
  const cards = titles.map((title) => {
    const matches = nodes.filter((node) => node['content-desc']?.startsWith(`${title} `));
    assert.equal(matches.length, 1, `${label}: expected one visible ${title} card`);
    const [x, y, right, bottom] = matches[0].bounds.match(/\d+/g).map(Number);
    return { x, y, right, bottom, width: right - x, height: bottom - y };
  });
  const near = (a, b, message) => assert.ok(Math.abs(a - b) <= 3, `${label}: ${message} (${a} vs ${b})`);
  const [a, b, c, d] = cards;
  near(a.y, b.y, 'first pair must share a row');
  near(c.y, d.y, 'second pair must share a row');
  assert.ok(c.y > Math.max(a.bottom, b.bottom), `${label}: second pair must be below first pair`);
  near(a.x, c.x, 'left column must align');
  near(b.x, d.x, 'right column must align');
  for (const [left, right] of [[a, b], [c, d]]) {
    assert.ok(right.x > left.right, `${label}: columns must not overlap`);
    near(left.width, right.width, 'cards must have equal widths');
    near(left.height, right.height, 'cards in each row must have equal heights');
    assert.ok(left.width > 0 && left.height > 0, `${label}: cards must have positive size`);
  }
  const hasRail = nodes.some((node) => node['resource-id'] === 'navigation-rail');
  assert.equal(nodes.filter((node) => node['content-desc'] === 'GalactoGuide flower logo').length, 1,
    `${label}: Home should show one logo across its header and navigation`);
  assert.equal(nodes.filter((node) => node.text === 'GalactoGuide').length, hasRail ? 0 : 1,
    `${label}: Home branding must follow the current navigation layout`);
  return cards;
}

if (process.argv[2] === '--snapshot') {
  checkGrid(readFileSync(process.argv[3], 'utf8'), process.argv[3]);
  console.log('Saved Android hierarchy has a two-column, two-row grid.');
} else {
  const serial = process.env.ADB_SERIAL;
  assert.match(serial ?? '', /^emulator-\d+$/, 'Resize testing is restricted to an explicit emulator serial.');
  const adb = (...args) => execFileSync(process.env.ADB_PATH ?? 'adb', ['-s', serial, ...args], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024,
  }).trim();
  const app = 'com.dyadhealthcollective.galactoguide';
  const originalSize = adb('shell', 'wm', 'size').match(/Override size: (\d+x\d+)/)?.[1];
  const originalDensity = adb('shell', 'wm', 'density').match(/Override density: (\d+)/)?.[1];
  const output = '.tmp/android-grid-resize';
  mkdirSync(output, { recursive: true });
  const results = [];
  try {
    adb('shell', 'wm', 'density', '420');
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'galactoguide://home', '-p', app);
    await delay(1500);
    const initialPid = adb('shell', 'pidof', app);
    assert.ok(initialPid, 'App must be running');
    // Cross the rail breakpoint, both unfolded orientations, and narrow windows
    // repeatedly without reloading the screen or restarting the app.
    const sizes = ['1248x1972', '1848x2448', '2448x1848', '1572x2100', '1580x2100', '1080x2400'];
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const size of sizes) {
        adb('shell', 'wm', 'size', size);
        await delay(700);
        adb('shell', 'uiautomator', 'dump', '/sdcard/galactoguide-grid-resize.xml');
        const xml = adb('exec-out', 'cat', '/sdcard/galactoguide-grid-resize.xml');
        const label = `cycle-${cycle + 1}-${size}`;
        writeFileSync(`${output}/${label}.xml`, xml);
        assert.equal(adb('shell', 'pidof', app), initialPid, `${label}: app must survive resizing without restarting`);
        const cards = checkGrid(xml, label);
        results.push({ label, cards });
        console.log(`PASS ${label}`);
      }
    }
    writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
    console.log(`Passed ${results.length} Android size transitions in the same app process.`);
  } finally {
    try { adb('shell', 'wm', 'size', originalSize ?? 'reset'); }
    finally { adb('shell', 'wm', 'density', originalDensity ?? 'reset'); }
  }
}
