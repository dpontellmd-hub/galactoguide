// ─────────────────────────────────────────────────────────────────────────
// Data-access layer (the single seam between UI and data source).
//
// Today this returns bundled static data. To move to a remote API / backend
// later (Phase 3: accounts, subscriptions, server-driven content), swap the
// implementations in THIS file — screens consume these functions and do not
// import the raw arrays directly, so they won't need to change.
// ─────────────────────────────────────────────────────────────────────────

import { galactogogues } from './galactogogues';
import { galactofuges } from './galactofuges';
import { sourcesMap } from './sources';
import { DATA_LAST_REVIEWED, FEATURED_IDS } from './meta';
import { resourcesMother, resourcesProvider } from './resources';
import type {
  Portal,
  Resource,
  Source,
  SubstanceKind,
  SubstanceType,
  SubstanceWithKind,
} from './types';

export function getGalactogogues(): SubstanceWithKind[] {
  return galactogogues.map((s) => ({ ...s, kind: 'gogue' as const }));
}

export function getGalactofuges(): SubstanceWithKind[] {
  return galactofuges.map((s) => ({ ...s, kind: 'fuge' as const }));
}

export function getAllSubstances(): SubstanceWithKind[] {
  return [...getGalactogogues(), ...getGalactofuges()];
}

export function getSubstanceById(
  id: string,
  kind?: SubstanceKind,
): SubstanceWithKind | undefined {
  const pool =
    kind === 'gogue'
      ? getGalactogogues()
      : kind === 'fuge'
        ? getGalactofuges()
        : getAllSubstances();
  return pool.find((s) => s.id === id);
}

export function getSources(id: string): Source[] {
  return sourcesMap[id] ?? [];
}

/** ISO date a substance's evidence was last reviewed (per-entry, else baseline). */
export function getReviewedDate(id: string): string {
  return getSubstanceById(id)?.reviewed ?? DATA_LAST_REVIEWED;
}

export function getResources(portal: Portal): Resource[] {
  return portal === 'mother' ? resourcesMother : resourcesProvider;
}

export function getTotalCount(): number {
  return galactogogues.length + galactofuges.length;
}

/** Entry counts per category, for the Browse grid. */
export function getCategoryCounts(): Record<SubstanceType, number> {
  const counts: Record<SubstanceType, number> = { herbal: 0, pharma: 0, substance: 0, food: 0 };
  for (const s of getAllSubstances()) counts[s.type] += 1;
  return counts;
}

/** Substances of one category, A–Z. */
export function getSubstancesByType(type: SubstanceType): SubstanceWithKind[] {
  return getAllSubstances()
    .filter((s) => s.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Substances that raise or lower milk production, A–Z. */
export function getSubstancesByKind(kind: SubstanceKind): SubstanceWithKind[] {
  return getAllSubstances()
    .filter((s) => s.kind === kind)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** All entries that may increase milk production, strongest evidence first, then alphabetical. */
export function getGalactogoguesByEvidence(): SubstanceWithKind[] {
  return getGalactogogues()
    .sort((a, b) => b.evidence - a.evidence || a.name.localeCompare(b.name));
}

/** All substances, A–Z. */
export function getSubstancesAZ(): SubstanceWithKind[] {
  return getAllSubstances().sort((a, b) => a.name.localeCompare(b.name));
}

/** Editorially curated entries for Home (FEATURED_IDS order preserved). */
export function getFeaturedSubstances(): SubstanceWithKind[] {
  const all = getAllSubstances();
  return FEATURED_IDS.map((id) => all.find((s) => s.id === id)).filter(
    (s): s is SubstanceWithKind => s !== undefined,
  );
}

/**
 * Typeahead search over names, brand/generic synonyms, and summaries
 * ("Sudafed" and "pseudoephedrine" both hit). Name matches rank first,
 * synonym matches next, summary mentions last.
 */
export function searchSubstances(query: string): SubstanceWithKind[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { s: SubstanceWithKind; rank: number }[] = [];
  for (const s of getAllSubstances()) {
    const name = s.name.toLowerCase();
    const synonyms = (s.synonyms ?? []).map((x) => x.toLowerCase());
    const rank = name.startsWith(q)
      ? 0
      : name.includes(q)
        ? 1
        : synonyms.some((x) => x.startsWith(q) || x.includes(q))
          ? 2
          : `${s.short_m} ${s.short_p}`.toLowerCase().includes(q)
            ? 3
            : -1;
    if (rank >= 0) scored.push({ s, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.s.name.localeCompare(b.s.name))
    .map(({ s }) => s);
}
