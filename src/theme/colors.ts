// Color tokens for the warm-cream handoff design (design_handoff_galactoguide).
// Two themes of the same `ThemeColors` shape — `lightColors` (the designed
// warm-cream palette) and `darkColors` (a derived low-glare warm-brown night
// palette; the handoff specifies light only). `theme/ThemeContext.tsx` selects
// between them at runtime; consumers read `colors` from `useTheme()`, never a
// static import.

/** Raw brand palette. */
export const palette = {
  accent: '#C97C5D', // brand terracotta — logo, active tab, saved fill
  accentNight: '#E0946F', // accent lifted for dark surfaces
  ink: '#45322B', // warm brown-black primary text
  cream: '#FBF6EF', // screen background
  white: '#ffffff',
  raise: '#4A7257', // "may increase milk production" green
  lower: '#A14E2E', // "may lower milk production" rust
} as const;

export interface ChipColors {
  bg: string;
  fg: string;
}

export interface ResultCardColors {
  bg: string;
  border: string;
  title: string;
  items: string;
}

export interface DirectionColors {
  /** Triangle / marker fill. */
  marker: string;
  /** Direction phrase text ("may increase milk production"). */
  header: string;
}

export interface NoteColors {
  bg: string;
  dot: string;
}

export interface EntryHeaderColors {
  /** Header band tint. */
  bg: string;
  /** Verdict sentence text on the tint. */
  verdict: string;
}

export interface ThemeColors {
  // Surfaces
  appBg: string; // page background behind the centered column
  surface: string; // cards / list containers
  floatingHeaderBg: string; // opaque tint behind compact headers and system status icons
  inputBg: string;
  inputBorder: string; // search field border
  border: string; // card borders (1.5px)
  borderStrong: string;
  divider: string; // hairlines inside list cards

  // Text
  text: string; // ink
  textSecondary: string; // summaries
  textMuted: string; // section labels (uppercase), metadata
  textFaint: string; // placeholders, small links, meter captions
  textOnDark: string;

  // Brand
  accent: string; // the go-forward accent name
  brandNavy: string; // surface role — warm ink hero/header/avatar block
  /** @deprecated prefer `accent` */
  terra: string;
  brown: string; // text that reads on the warm accent tint
  caramel: string; // note-dot gold
  terraLight: string; // warm accent tint (herbs cards, action card)
  cream: string; // soft gold-tinted fill (foods cards, neutral notes)
  discovery: {
    herbal: string;
    herbalFg: string;
    blue: string;
    blueFg: string;
    green: string;
    blush: string;
    gradient: readonly [string, string];
  }; // slightly stronger pastels reserved for Home discovery

  // Substance type chips / category identities
  typeHerbal: ChipColors; // Herbs & supplements — warm terracotta tint
  typePharma: ChipColors; // Prescriptions — soft green tint
  typeFood: ChipColors; // Foods & teas — soft gold tint
  typeSubstance: ChipColors; // Other substances — caution-warm tint

  // Galactogogue / galactofuge kind badges
  kindGogue: ChipColors;
  kindFuge: ChipColors;

  // Safety tags
  safetyRecommend: ChipColors;
  safetyCaution: ChipColors;
  safetyAvoid: ChipColors;

  // Recommend result cards
  resultRec: ResultCardColors;
  resultCau: ResultCardColors;
  resultAvd: ResultCardColors;

  // Notice / point dot backgrounds
  dotBlue: string;
  dotAmber: string;
  dotGreen: string;
  dotRed: string;

  // Evidence meter (neutral ink — never green/red, never the accent)
  evidenceFilled: string;
  evidenceEmpty: string;

  // Direction indicators (▲ raise / ▼ lower / — none)
  directionGogue: DirectionColors;
  directionFuge: DirectionColors;
  directionNone: string;

  // List rows / cards
  chevron: string;
  countChipBg: string; // "3" pill next to SAVED

  // Good-to-know note cards
  noteNeutral: NoteColors;
  noteCaution: NoteColors & { strong: string };

  // Entry page
  entryHeader: {
    raise: EntryHeaderColors; // designed (#E4EDE4)
    lower: EntryHeaderColors; // derived — no lower entry was designed
    none: EntryHeaderColors; // derived neutral
  };
  headerButtonBg: string; // 40px circular back/save buttons on the header band
  verified: string; // reviewer check badge
  explainerText: string; // evidence explainer / stat-tile detail text

  // Shadows (CSS boxShadow strings; transparent at night — use borders instead)
  shadowSoft: string; // search field
  shadowCard: string; // entry evidence card
  focusRing: string; // visible keyboard focus halo

  // Tab bar
  tabBarBg: string;
  tabBarBorder: string;
  tabBarInactive: string;

  // Misc accents
  detailLink: string;
  phoneBg: string;
  phoneFg: string;
  /** Text on solid accent fills (buttons, active chips). */
  onAccent: string;
  /** High-contrast "ink" chip — the active "All" filter. */
  ink: ChipColors;
  star: string;
}

export const lightColors: ThemeColors = {
  floatingHeaderBg: '#F4E3D7',
  appBg: palette.cream,
  surface: palette.white,
  inputBg: palette.white,
  inputBorder: '#E8DCCE',
  border: '#EFE4D6',
  borderStrong: '#D3C2B1',
  divider: '#F5EDE2',

  text: palette.ink,
  textSecondary: '#765F54',
  textMuted: '#7C6458',
  textFaint: '#806A5E',
  textOnDark: palette.cream,

  accent: palette.accent,
  brandNavy: palette.ink,
  terra: palette.accent,
  brown: '#8F452E',
  caramel: '#DDB25E',
  terraLight: '#F4E3D7',
  cream: '#F9EFDC',
  discovery: {
    herbal: '#E8DFF3',
    herbalFg: '#684783',
    blue: '#E8F1F6',
    blueFg: '#426879',
    green: '#DCEADD',
    blush: '#F3DCD4',
    gradient: ['#D2E5D4', '#F0D2C8'],
  },

  typeHerbal: { bg: '#F4E3D7', fg: '#8F452E' },
  typePharma: { bg: '#E4EDE4', fg: palette.raise },
  typeFood: { bg: '#F9EFDC', fg: '#7C5E22' },
  typeSubstance: { bg: '#F6E3DC', fg: palette.lower },

  kindGogue: { bg: '#E4EDE4', fg: palette.raise },
  kindFuge: { bg: '#F6E3DC', fg: palette.lower },

  safetyRecommend: { bg: '#E4EDE4', fg: palette.raise },
  safetyCaution: { bg: '#F9EFDC', fg: '#7C5E22' },
  safetyAvoid: { bg: '#F6E3DC', fg: palette.lower },

  resultRec: { bg: '#E4EDE4', border: '#C9D9C9', title: palette.raise, items: '#3C5C46' },
  resultCau: { bg: '#F9EFDC', border: '#EBD9B4', title: '#7C5E22', items: '#7C5E22' },
  resultAvd: { bg: '#F6E3DC', border: '#E8C7B8', title: palette.lower, items: '#7E3C22' },

  dotBlue: '#F4E3D7',
  dotAmber: '#F9EFDC',
  dotGreen: '#E4EDE4',
  dotRed: '#F6E3DC',

  evidenceFilled: '#8A7266',
  evidenceEmpty: '#EBDDCD',

  directionGogue: { marker: palette.raise, header: palette.raise },
  directionFuge: { marker: palette.lower, header: palette.lower },
  directionNone: '#7C6458',

  chevron: '#D3C2B1',
  countChipBg: '#EFE4D6',

  noteNeutral: { bg: '#F9EFDC', dot: '#DDB25E' },
  noteCaution: { bg: '#F6E3DC', dot: palette.accent, strong: '#8F452E' },

  entryHeader: {
    raise: { bg: '#E4EDE4', verdict: '#52684F' },
    lower: { bg: '#F6E3DC', verdict: '#7A4632' },
    none: { bg: '#F1E8DA', verdict: '#7C6154' },
  },
  headerButtonBg: 'rgba(255,255,255,0.75)',
  verified: palette.raise,
  explainerText: '#7C6154',

  shadowSoft: '0 2px 10px rgba(69,50,43,0.06)',
  shadowCard: '0 10px 26px rgba(69,50,43,0.10)',
  focusRing: '0 0 0 3px rgba(201,124,93,0.30)',

  tabBarBg: '#FFFDFA',
  tabBarBorder: '#EFE4D6',
  tabBarInactive: '#806A5E',

  detailLink: '#8F452E',
  phoneBg: '#E4EDE4',
  phoneFg: palette.raise,
  onAccent: '#3A2119',
  ink: { bg: palette.ink, fg: palette.cream },
  star: '#DDB25E',
};

// Night theme (derived — the handoff designs light only). Warm low-glare
// browns for 3 a.m. feeds; the terracotta accent lifts to read on dark,
// pastel tints become translucent warm overlays, shadows go transparent
// (cards use borders instead at night).
export const darkColors: ThemeColors = {
  floatingHeaderBg: '#35261E',
  appBg: '#1B1512',
  surface: '#262019',
  inputBg: '#262019',
  inputBorder: '#3A3126',
  border: '#352C22',
  borderStrong: '#4A3E30',
  divider: '#2E261D',

  text: '#F2E7DA',
  textSecondary: '#B9A490',
  textMuted: '#95816D',
  textFaint: '#7E6F5D',
  textOnDark: '#F2E7DA',

  accent: palette.accentNight,
  brandNavy: '#262019',
  terra: palette.accentNight,
  brown: '#E8A177',
  caramel: '#DDB25E',
  terraLight: 'rgba(224,148,111,0.13)',
  cream: '#2C251C',
  discovery: {
    herbal: '#352A43',
    herbalFg: '#CDB1E8',
    blue: 'rgba(127,178,205,0.16)',
    blueFg: '#8FC0D8',
    green: 'rgba(127,169,126,0.18)',
    blush: 'rgba(224,138,106,0.20)',
    gradient: ['rgba(127,169,126,0.22)', 'rgba(224,138,106,0.24)'],
  },

  typeHerbal: { bg: 'rgba(224,148,111,0.13)', fg: '#E0946F' },
  typePharma: { bg: 'rgba(127,169,126,0.13)', fg: '#8FBF8E' },
  typeFood: { bg: 'rgba(221,178,94,0.13)', fg: '#DDB25E' },
  typeSubstance: { bg: 'rgba(224,138,106,0.12)', fg: '#E08A6A' },

  kindGogue: { bg: 'rgba(127,169,126,0.14)', fg: '#8FBF8E' },
  kindFuge: { bg: 'rgba(224,138,106,0.16)', fg: '#E08A6A' },

  safetyRecommend: { bg: 'rgba(127,169,126,0.14)', fg: '#8FBF8E' },
  safetyCaution: { bg: 'rgba(221,178,94,0.14)', fg: '#DDB25E' },
  safetyAvoid: { bg: 'rgba(224,138,106,0.16)', fg: '#E08A6A' },

  resultRec: {
    bg: 'rgba(127,169,126,0.10)',
    border: 'rgba(127,169,126,0.25)',
    title: '#8FBF8E',
    items: '#A9C9A8',
  },
  resultCau: {
    bg: 'rgba(221,178,94,0.10)',
    border: 'rgba(221,178,94,0.25)',
    title: '#DDB25E',
    items: '#E4C994',
  },
  resultAvd: {
    bg: 'rgba(224,138,106,0.10)',
    border: 'rgba(224,138,106,0.28)',
    title: '#E08A6A',
    items: '#ECAC92',
  },

  dotBlue: 'rgba(224,148,111,0.13)',
  dotAmber: 'rgba(221,178,94,0.13)',
  dotGreen: 'rgba(127,169,126,0.13)',
  dotRed: 'rgba(224,138,106,0.15)',

  evidenceFilled: '#A6987F',
  evidenceEmpty: '#3A3127',

  directionGogue: { marker: '#7FA97E', header: '#8FBF8E' },
  directionFuge: { marker: '#C97D5E', header: '#E08A6A' },
  directionNone: '#95816D',

  chevron: '#5A4E40',
  countChipBg: '#352C22',

  noteNeutral: { bg: 'rgba(221,178,94,0.10)', dot: '#DDB25E' },
  noteCaution: { bg: 'rgba(224,148,111,0.13)', dot: palette.accentNight, strong: '#E8A177' },

  entryHeader: {
    raise: { bg: 'rgba(127,169,126,0.14)', verdict: '#A9C9A8' },
    lower: { bg: 'rgba(224,138,106,0.12)', verdict: '#ECAC92' },
    none: { bg: 'rgba(181,157,139,0.10)', verdict: '#B9A490' },
  },
  headerButtonBg: 'rgba(255,255,255,0.10)',
  verified: '#7FA97E',
  explainerText: '#C4AE9C',

  shadowSoft: '0 0 0 rgba(0,0,0,0)',
  shadowCard: '0 0 0 rgba(0,0,0,0)',
  focusRing: '0 0 0 3px rgba(224,148,111,0.40)',

  tabBarBg: 'rgba(26,21,16,0.97)',
  tabBarBorder: '#2E261D',
  tabBarInactive: '#6E6151',

  detailLink: '#E8A177',
  phoneBg: 'rgba(127,169,126,0.13)',
  phoneFg: '#8FBF8E',
  onAccent: '#241812',
  ink: { bg: palette.accentNight, fg: '#241812' },
  star: '#DDB25E',
};
