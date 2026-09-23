import type { SafetyLevel, SafetyMap, Situation, Substance } from '@/data/types';

export type RecFilter = 'gogue' | 'both' | 'fuge';

// Severity rank: higher = worse. Lets us track the worst safety level across
// the selected situations without TS literal-narrowing pitfalls.
const rank: Record<SafetyLevel, number> = {
  recommend: 0,
  'may use': 1,
  caution: 2,
  avoid: 3,
};

/**
 * Worst (most cautious) safety level for a substance across the selected
 * situations. Returns null when no situations are selected. Shared by the
 * Recommend tool and the list-row badge (EntryRow).
 */
export function worstSafety(
  safety: SafetyMap,
  situations: Situation[],
): SafetyLevel | null {
  if (!situations.length) return null;
  let worst: SafetyLevel = 'recommend';
  for (const s of situations) {
    if (rank[safety[s]] > rank[worst]) worst = safety[s];
  }
  return worst;
}

export interface RecommendResult {
  /** Galactogogues reasonable to consider (all selected situations "recommend"). */
  gogueRec: string[];
  /** Galactogogues to use with caution. */
  gogueCau: string[];
  /** Galactogogues to avoid / specialist input. */
  gogueAvd: string[];
  /** Galactofuges to avoid for the situation. */
  fugeAvoid: string[];
  /** Galactofuges to use with extra caution. */
  fugeCau: string[];
}

/**
 * Compute recommendations across the selected clinical situations.
 * Ported verbatim from the original `runRecommend` worst-case logic.
 */
export function computeRecommendations(
  galactogogues: Substance[],
  galactofuges: Substance[],
  situations: Situation[],
): RecommendResult {
  const gogueRec: string[] = [];
  const gogueCau: string[] = [];
  const gogueAvd: string[] = [];
  const fugeAvoid: string[] = [];
  const fugeCau: string[] = [];

  // No situations selected → worstSafety returns null; fall back to "recommend".
  const worstLevel = (d: Substance): SafetyLevel =>
    worstSafety(d.safety, situations) ?? 'recommend';

  galactogogues.forEach((d) => {
    const worst = worstLevel(d);
    if (worst === 'recommend') gogueRec.push(d.name);
    else if (worst === 'may use' || worst === 'caution') gogueCau.push(d.name);
    else gogueAvd.push(d.name);
  });

  galactofuges.forEach((d) => {
    if (d.excludeFromRecommend) return;
    // Galactofuges only distinguish avoid vs. everything-else (caution bucket),
    // matching the original logic which ignored "may use" here.
    const worst = worstLevel(d);
    if (worst === 'avoid') fugeAvoid.push(d.name);
    else fugeCau.push(d.name);
  });

  return { gogueRec, gogueCau, gogueAvd, fugeAvoid, fugeCau };
}
