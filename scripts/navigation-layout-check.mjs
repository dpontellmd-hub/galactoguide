// Node's built-in type stripping runs this pure policy without a native runtime.
// node --experimental-strip-types scripts/navigation-layout-check.mjs
import assert from 'node:assert/strict';
import { getNavigationLayout } from '../src/lib/navigation-layout.ts';

for (const platform of ['ios', 'android']) {
  for (const [width, height] of [[600, 600], [704, 933], [933, 704], [1024, 900], [1280, 900]]) {
    assert.deepEqual(getNavigationLayout(width, height, platform), {
      hasNavigationRail: true, isDesktop: false, hasSideNavigation: true,
    }, `${platform} unfolded/tablet ${width}x${height}`);
  }
  for (const [width, height] of [[390, 844], [475, 900], [599, 933], [933, 599], [844, 390]]) {
    assert.deepEqual(getNavigationLayout(width, height, platform), {
      hasNavigationRail: false, isDesktop: false, hasSideNavigation: false,
    }, `${platform} compact/landscape phone ${width}x${height}`);
  }
}
for (const [width, height] of [[390, 844], [600, 900], [704, 933], [933, 704], [1023, 900]]) {
  assert.deepEqual(getNavigationLayout(width, height, 'web'), {
    hasNavigationRail: false, isDesktop: false, hasSideNavigation: false,
  }, `Browser keeps bottom tabs at ${width}x${height}`);
}
for (const width of [1024, 1280, 1920]) {
  assert.deepEqual(getNavigationLayout(width, 900, 'web'), {
    hasNavigationRail: false, isDesktop: true, hasSideNavigation: true,
  }, `Desktop browser keeps left sidebar at ${width}px`);
}
console.log('Navigation policy passed: 28 native and web size cases.');
