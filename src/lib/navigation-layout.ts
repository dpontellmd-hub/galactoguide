export const navigationBreakpoints = {
  railBreakpoint: 600,
  railMinHeight: 600,
  desktopBreakpoint: 1024,
} as const;

/** Native apps use a right rail when open wide; web keeps its desktop sidebar. */
export function getNavigationLayout(width: number, height: number, platform: string) {
  const hasNavigationRail = platform !== 'web' &&
    width >= navigationBreakpoints.railBreakpoint && height >= navigationBreakpoints.railMinHeight;
  const isDesktop = platform === 'web' && width >= navigationBreakpoints.desktopBreakpoint;
  return { hasNavigationRail, isDesktop, hasSideNavigation: hasNavigationRail || isDesktop };
}
