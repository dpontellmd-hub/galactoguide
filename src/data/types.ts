// Domain types for GalactoGuide clinical content.
// Ported from the original single-file app; values verified against the source data.

export type Portal = 'mother' | 'provider';

/** Substance category. `food` renders as "food/dietary". */
export type SubstanceType = 'herbal' | 'pharma' | 'substance' | 'food';

/** Safety recommendation for a given clinical situation. */
export type SafetyLevel = 'recommend' | 'may use' | 'caution' | 'avoid';

/** Clinical situations used by the safety + recommend tools. */
export type Situation =
  | 'preterm'
  | 'pcos'
  | 'hypoplasia'
  | 'low_supply'
  | 'relactation'
  | 'cardiac'
  | 'diabetes';

export type SafetyMap = Record<Situation, SafetyLevel>;

/** Whether a substance increases (gogue) or decreases (fuge) milk production. */
export type SubstanceKind = 'gogue' | 'fuge';

/**
 * Effect direction shown to users (▲ may raise / ▼ may lower / — no effect).
 * Normally derived from `kind`; the optional `direction` field on a substance
 * overrides it for future no-effect entries (e.g. sertraline).
 */
export type Direction = 'raise' | 'lower' | 'none';

/** A "good to know" note on the entry page. */
export interface GoodToKnowNote {
  tone: 'neutral' | 'caution';
  text: string;
  /** Emphasized tail rendered in the caution accent, e.g. "Ask your clinician first." */
  strong?: string;
}

/** Study design behind a substance's evidence. A substance may have several. */
export type EvidenceType =
  | 'RCT'
  | 'Observational'
  | 'Case reports'
  | 'Mechanistic'
  | 'Traditional use';

export interface Substance {
  id: string;
  name: string;
  type: SubstanceType;
  /** Evidence strength, 1 (very limited) – 4 (strong, relative). */
  evidence: number;
  /** Short summary — provider voice. */
  short_p: string;
  /** Short summary — lay parent voice. */
  short_m: string;
  /** Optional detail-header layout separating the description from its safety warning. */
  headerSummary_m?: { text: string; caution: string };
  headerSummary_p?: { text: string; caution: string };
  mechanism: string;
  evidence_p: string;
  evidence_m: string;
  dosing_p: string;
  dosing_m: string;
  safety: SafetyMap;
  notes_p: string;
  notes_m: string;
  lactmed: string | null;
  /** When true, the recommender skips this substance (e.g. alcohol, nicotine). */
  excludeFromRecommend?: boolean;
  /** Study designs behind the evidence, e.g. ['RCT']. */
  evidenceType?: EvidenceType[];
  /** True when published studies report mixed results. */
  conflicting?: boolean;
  /**
   * ISO date (YYYY-MM-DD) this entry's evidence was last reviewed. Optional
   * per-substance override; when absent the dataset-wide DATA_LAST_REVIEWED
   * baseline applies. Surfaced on the detail page so claims are auditable.
   */
  reviewed?: string;

  // ── Entry-page fields (handoff design). All optional; the entry page falls
  // back to the long-form fields when absent. Copy adapted from the existing
  // clinical text — PENDING CLINICAL REVIEW before shipping (see handoff README).

  /** One-sentence header verdict — provider voice. */
  verdict_p?: string;
  /** One-sentence header verdict — lay parent voice. */
  verdict_m?: string;
  /** Evidence sub-line, e.g. "5 small studies · mixed results". */
  studyCaption?: string;
  /** Stat tile: typical use, e.g. { value: '1.7–4.9 g/day', detail: 'capsules or tea' }. */
  typicalUse?: { value: string; detail?: string };
  /** Stat tile: how long to trial it, e.g. { value: '3 days', detail: 'then decide' }. */
  timeToEffect?: { value: string; detail?: string };
  /** Stacked "good to know" notes. */
  goodToKnow?: GoodToKnowNote[];
  /** Brand/generic synonyms for search ("Sudafed" ↔ "pseudoephedrine"). */
  synonyms?: string[];
  /**
   * Ionicons glyph shown in the list-row identity circle. Optional — when
   * absent the row falls back to a per-type default (leaf / medical / …).
   */
  icon?: string;
  /** Overrides the kind-derived direction (for future no-effect entries). */
  direction?: Direction;
}

/** A substance tagged with its kind — what the repository hands to screens. */
export interface SubstanceWithKind extends Substance {
  kind: SubstanceKind;
}

export interface Source {
  label: string;
  url: string;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface Resource {
  name: string;
  desc: string;
  links: ResourceLink[];
  tag: string;
  phone?: string;
}
