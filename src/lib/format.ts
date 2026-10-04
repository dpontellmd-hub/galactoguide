import type { Ionicons } from '@expo/vector-icons';
import type { ChipColors, ThemeColors } from '@/theme';
import type {
  Direction,
  SafetyLevel,
  Situation,
  SubstanceKind,
  SubstanceType,
  SubstanceWithKind,
} from '@/data/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Evidence strength label (design wording; callers append " evidence"). */
export function evidenceText(score: number): string {
  return score >= 4 ? 'Strong' : score === 3 ? 'Moderate' : score === 2 ? 'Limited' : 'Anecdotal';
}

/** Sentence-case meter caption, optionally including the neutral mixed-results qualifier. */
export function evidenceCaption(score: number, mixedResults = false): string {
  const level = `${evidenceText(score)} evidence`;
  return mixedResults ? `${level} · mixed results` : level;
}

/**
 * Preserve a study-count/supporting caption while presenting mixed efficacy
 * neutrally and without repeating the same concept.
 */
export function studyResultsCaption(
  caption: string | undefined,
  mixedResults = false,
): string | undefined {
  if (!mixedResults) return caption;
  if (!caption) return 'Mixed results';
  if (/\bmixed\b/i.test(caption)) return caption;
  if (/\bconflicting(?:\s+studies)?\b/i.test(caption)) {
    return caption.replace(/\bconflicting(?:\s+studies)?\b/i, 'mixed results');
  }
  return `${caption} · mixed results`;
}

/** Effect direction for a substance — explicit `direction` wins over kind. */
export function directionOf(d: SubstanceWithKind): Direction {
  return d.direction ?? (d.kind === 'gogue' ? 'raise' : 'lower');
}

/** Direction phrase for list rows and the entry-page kicker. */
export function directionLabel(dir: Direction): string {
  return dir === 'raise'
    ? 'May increase milk production'
    : dir === 'lower'
      ? 'May lower milk production'
      : 'No effect on milk production';
}

/** Category-grid / A–Z section titles per the handoff design. */
export function categoryTitle(type: SubstanceType): string {
  return type === 'pharma'
    ? 'Prescriptions'
    : type === 'herbal'
      ? 'Herbs & supplements'
      : type === 'food'
        ? 'Foods & teas'
        : 'Other substances';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Human-readable review date, e.g. "2026-06-15" → "June 15, 2026". Parses the
 * ISO string by hand (no Date) so it's timezone-stable. Falls back to the raw
 * string if it isn't a well-formed YYYY-MM-DD value.
 */
export function formatReviewedDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  const name = MONTH_NAMES[Number(month) - 1];
  if (!name) return iso;
  return `${name} ${Number(day)}, ${year}`;
}

/** Human label for a substance type (mirrors original typelabel logic). */
export function typeLabel(type: SubstanceType): string {
  return type === 'pharma'
    ? 'pharmaceutical'
    : type === 'herbal'
      ? 'herbal'
      : type === 'substance'
        ? 'substance'
        : 'food/dietary';
}

/** Label, directional icon, and colors for a substance's kind (gogue/fuge). */
export function kindMeta(
  kind: SubstanceKind,
  colors: ThemeColors,
): {
  label: string;
  icon: IoniconName;
  colors: ChipColors;
} {
  return kind === 'gogue'
    ? { label: 'Boosts milk production', icon: 'arrow-up-circle', colors: colors.kindGogue }
    : { label: 'Reduces milk production', icon: 'arrow-down-circle', colors: colors.kindFuge };
}

/** List-row identity glyph: per-substance `icon` override, else by type. */
export function substanceIcon(d: SubstanceWithKind): IoniconName {
  if (d.icon) return d.icon as IoniconName;
  switch (d.type) {
    case 'herbal':
      return 'leaf';
    case 'pharma':
      return 'medical';
    case 'substance':
      return 'flask';
    case 'food':
    default:
      return 'nutrition';
  }
}

/**
 * Tinted circle behind the row glyph: green for entries that may increase milk production and
 * blush/rust for entries that may decrease milk production. The glyph still identifies its type.
 */
export function substanceIconColors(d: SubstanceWithKind, colors: ThemeColors): ChipColors {
  return directionOf(d) === 'lower' ? colors.kindFuge : colors.kindGogue;
}

/** Background/foreground colors for a substance-type chip. */
export function typeChipColors(type: SubstanceType, colors: ThemeColors): ChipColors {
  switch (type) {
    case 'herbal':
      return colors.typeHerbal;
    case 'pharma':
      return colors.typePharma;
    case 'substance':
      return colors.typeSubstance;
    case 'food':
    default:
      return colors.typeFood;
  }
}

/** Colors for a safety tag (s-rec / s-cau / s-no). */
export function safetyChipColors(level: SafetyLevel, colors: ThemeColors): ChipColors {
  return level === 'recommend'
    ? colors.safetyRecommend
    : level === 'avoid'
      ? colors.safetyAvoid
      : colors.safetyCaution;
}

/** Display value for a safety level ("recommend" → "reasonable to consider"). */
export function safetyValueLabel(level: SafetyLevel): string {
  return level === 'recommend' ? 'reasonable to consider' : level;
}

/** Compact warning label used on list rows personalized to selected situations. */
export function safetyForYouLabel(level: 'caution' | 'avoid'): string {
  return level === 'caution' ? 'Caution for you' : 'Avoid for you';
}

/** Short situation labels used in the detail safety-by-situation list. */
export const situationShortLabels: Record<Situation, string> = {
  preterm: 'Preterm',
  pcos: 'PCOS',
  hypoplasia: 'Hypoplasia',
  low_supply: 'Low milk production',
  relactation: 'Relactation',
  cardiac: 'Cardiac',
  diabetes: 'Diabetes',
};

/** Long situation labels (safety checker + recommend tool). */
export const situationLongLabels: Record<Situation, string> = {
  preterm: 'Preterm infant',
  pcos: 'PCOS / insulin resistance',
  hypoplasia: 'Breast hypoplasia',
  low_supply: 'General low milk production',
  relactation: 'Relactation',
  cardiac: 'Cardiac history',
  diabetes: 'Diabetes',
};

/** Labels shown on the recommend tool's situation selector chips. */
export const situationSelectorLabels: Record<Situation, string> = {
  preterm: 'Preterm infant',
  pcos: 'PCOS / insulin resistance',
  hypoplasia: 'Breast hypoplasia',
  low_supply: 'General low milk production',
  relactation: 'Relactation',
  cardiac: 'Cardiac history',
  diabetes: 'Diabetes / blood sugar issues',
};

/** Ordered list of situations for the recommend tool's selector. */
export const situationOrder: Situation[] = [
  'preterm',
  'pcos',
  'hypoplasia',
  'low_supply',
  'relactation',
  'cardiac',
  'diabetes',
];
