import type { Portal } from '@/data/types';
import { navigationBreakpoints } from '@/lib/navigation-layout';
import type { ChipColors, ThemeColors } from './colors';

export { palette, lightColors, darkColors } from './colors';
export type { ThemeColors, ChipColors, DirectionColors, ResultCardColors } from './colors';
export {
  ThemeProvider,
  useTheme,
  useThemedStyles,
  type ThemePreference,
  type ColorScheme,
} from './ThemeContext';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 24,
} as const;

/** Shared widths for the compact app, tablet column, and desktop workspace. */
export const layout = {
  maxContentWidth: 480,
  ...navigationBreakpoints,
  navigationRailWidth: 96,
  tabletBreakpoint: 768,
  tabletContentWidth: 720,
  columnsBreakpoint: 1280,
  desktopMaxWidth: 1440,
  sidebarWidth: 224,
  readingMaxWidth: 800,
  formMaxWidth: 640,
  desktopPagePadding: 36,
  desktopColumnGap: 28,
  supportingColumnWidth: 300,
  screenPaddingHorizontal: 22,
  screenHeaderTopSpacing: spacing.xxl,
  screenHeaderBottomSpacing: spacing.xl,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 13,
  xl: 14,
  pill: 99,
  round: 999,
  /** 27×27 category icon squares on Browse rows. */
  iconBox: 9,
} as const;

export const fontSize = {
  /** "MODERATE EVIDENCE" meter captions. */
  meterCaption: 12,
  /** Terse badges and uppercase eyebrows only; not sentence-length copy. */
  micro: 12,
  /** Tab bar labels. */
  tabLabel: 12,
  /** Compact labels and metadata only; not explanatory copy. */
  tiny: 12.5,
  /** Stat-tile labels ("TYPICAL USE"). */
  statLabel: 12.5,
  /** Short secondary labels and compact controls. */
  small: 13,
  /** Action-card links ("Check it →"), "edit", reviewer line. */
  link: 13.5,
  /** Sentence-length helper and secondary copy. */
  body: 14,
  /** Primary paragraph and input copy. */
  base: 15,
  /** Good-to-know notes, "Everything, A–Z" row. */
  note: 15,
  /** Action-card titles ("New prescription?"). */
  actionTitle: 15,
  /** Category-card titles, "Limited evidence", stat values. */
  cardTitle: 16,
  /** List-row names, search placeholder. */
  rowName: 16,
  lg: 17,
  zone: 18,
  xl: 19,
  hero: 24,
  /** Screen titles ("Support your milk production goals", "Your situation guide"). */
  headline: 29,
  /** Entry-page title. */
  display: 36,
} as const;

/**
 * Nunito family. Bundled via expo-font. Native needs an explicit face per
 * weight — pairing a face with `fontWeight` synthesizes on iOS and is ignored
 * on Android, so spread `font.*` instead of setting `fontWeight`.
 */
export const fontFamily = {
  sans: 'Nunito_400Regular',
  sansSemibold: 'Nunito_600SemiBold',
  sansBold: 'Nunito_700Bold',
  sansExtrabold: 'Nunito_800ExtraBold',
} as const;

/** Spread into text styles in place of `fontWeight`: `{ ...font.bold }`. */
export const font = {
  regular: { fontFamily: fontFamily.sans },
  semibold: { fontFamily: fontFamily.sansSemibold },
  bold: { fontFamily: fontFamily.sansBold },
  extrabold: { fontFamily: fontFamily.sansExtrabold },
} as const;

export interface PortalAccent {
  /** Primary accent color for the portal. */
  main: string;
  /** Tinted background for chips/badges. */
  light: string;
  /** Text color that reads on the light background. */
  on: string;
  /** Text color that reads on a `main`-colored fill (buttons). */
  onMain: string;
  /** Active filter-chip colors (ink by day, amber/slate by night). */
  chipActive: ChipColors;
}

/**
 * Both portals share the single brand accent under the handoff design —
 * portal difference lives in voice/content only. Signature kept so existing
 * call sites compile.
 *
 * @deprecated prefer `colors.accent` (and `terraLight`/`brown` for tints)
 */
export function getPortalAccent(
  _portal: Portal,
  colors: ThemeColors,
  _isDark = false,
): PortalAccent {
  return {
    main: colors.accent,
    light: colors.terraLight,
    on: colors.brown,
    onMain: colors.onAccent,
    chipActive: colors.ink,
  };
}
