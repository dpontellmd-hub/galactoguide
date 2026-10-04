import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormScrollView } from '@/components/form-scroll-view';
import { PageColumns } from '@/components/page-columns';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { EntryRow } from '@/components/EntryRow';
import { ListCard } from '@/components/ListCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import {
  getGalactogoguesByEvidence,
  getSubstancesAZ,
  searchSubstances,
} from '@/data/repository';
import type { SubstanceKind, SubstanceType } from '@/data/types';
import { categoryTitle } from '@/lib/format';
import { font, fontSize, layout, radius, spacing, useThemedStyles, type ThemeColors } from '@/theme';

const CATEGORY_TYPES: SubstanceType[] = ['herbal', 'pharma', 'substance', 'food'];

const TYPE_FILTERS: { label: string; value?: SubstanceType }[] = [
  { label: 'All types' },
  { label: 'Medications & related substances', value: 'pharma' },
  { label: 'Herbs & supplements', value: 'herbal' },
  { label: 'Foods & teas', value: 'food' },
  { label: 'Other substances', value: 'substance' },
];

const EFFECT_FILTERS: { label: string; value?: SubstanceKind }[] = [
  { label: 'All effects' },
  { label: 'May increase milk production', value: 'gogue' },
  { label: 'May lower milk production', value: 'fuge' },
];

/** The full alphabetical index and the filtered/search results destination. */
export default function AZScreen() {
  const router = useRouter();
  const { isDesktop, hasSupportingColumn } = useResponsiveLayout();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    category?: string;
    focus?: string;
    kind?: string;
  }>();
  const [query, setQuery] = useState('');
  const [focusedFilter, setFocusedFilter] = useState<string | null>(null);

  const category = CATEGORY_TYPES.find((type) => type === params.category);
  const kind: SubstanceKind | undefined =
    params.kind === 'gogue' || params.kind === 'fuge' ? params.kind : undefined;
  const q = query.trim();
  const hasFilters = !!category || !!kind;
  const orderedPool = kind === 'gogue' && !category
    ? getGalactogoguesByEvidence()
    : getSubstancesAZ();
  const base = orderedPool.filter(
    (substance) =>
      (!category || substance.type === category) && (!kind || substance.kind === kind),
  );
  const results = q
    ? searchSubstances(q).filter(
      (substance) =>
        (!category || substance.type === category) && (!kind || substance.kind === kind),
    )
    : base;
  const clearFilters = () => router.setParams({ category: undefined, kind: undefined });

  const filters = (
    <View style={styles.filtersCard}>
      <View style={styles.filtersHeader}>
        <Text style={styles.filtersTitle}>Filter results</Text>
        {hasFilters && (
          <Pressable
            onPress={clearFilters}
            onFocus={() => setFocusedFilter('clear')}
            onBlur={() => setFocusedFilter(null)}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            style={({ pressed }) => [
              styles.clearButton,
              focusedFilter === 'clear' && styles.filterFocused,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.clearButtonText}>Clear all</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.filterLabel}>TYPE</Text>
      <View style={[styles.filterRow, hasSupportingColumn && styles.desktopFilters]}>
        {TYPE_FILTERS.map((filter) => {
          const active = category === filter.value;
          const focusKey = `type:${filter.value ?? 'all'}`;
          return (
            <Pressable
              key={focusKey}
              onPress={() => router.setParams({ category: filter.value })}
              onFocus={() => setFocusedFilter(focusKey)}
              onBlur={() => setFocusedFilter(null)}
              accessibilityRole="button"
              accessibilityLabel={`Type filter, ${filter.label}`}
              accessibilityState={{ selected: active }}
              aria-pressed={active}
              style={({ pressed }) => [
                styles.filterChip,
                active && styles.filterChipActive,
                focusedFilter === focusKey && styles.filterFocused,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.filterLabel, styles.effectLabel]}>EFFECT ON MILK PRODUCTION</Text>
      <View style={[styles.filterRow, hasSupportingColumn && styles.desktopFilters]}>
        {EFFECT_FILTERS.map((filter) => {
          const active = kind === filter.value;
          const focusKey = `effect:${filter.value ?? 'all'}`;
          return (
            <Pressable
              key={focusKey}
              onPress={() => router.setParams({ kind: filter.value })}
              onFocus={() => setFocusedFilter(focusKey)}
              onBlur={() => setFocusedFilter(null)}
              accessibilityRole="button"
              accessibilityLabel={`Effect on milk production filter, ${filter.label}`}
              accessibilityState={{ selected: active }}
              aria-pressed={active}
              style={({ pressed }) => [
                styles.filterChip,
                active && styles.filterChipActive,
                focusedFilter === focusKey && styles.filterFocused,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        multilineTitle={!!kind}
        title={
          category
            ? categoryTitle(category)
            : kind === 'fuge'
              ? 'May lower milk production'
              : kind === 'gogue'
                ? 'Support milk production'
                : 'Everything, A–Z'
        }
      />
      <FormScrollView contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}>
        <SearchField
          placeholder={`Search ${base.length} entries`}
          value={query}
          onChangeText={setQuery}
          autoFocus={params.focus === '1'}
        />

        <PageColumns testID="az-columns" sidebar={filters}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsLabel}>RESULTS</Text>
            <Text style={styles.resultsCount} accessibilityLiveRegion="polite">
              {results.length} {results.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <View style={styles.list}>
            {results.length > 0 ? (
              <ListCard>
                {results.map((substance, index) => (
                  <EntryRow
                    key={`${substance.kind}-${substance.id}`}
                    substance={substance}
                    showDivider={index < results.length - 1}
                    onPress={() =>
                      router.push({
                        pathname: '/substance/[id]',
                        params: { id: substance.id, kind: substance.kind },
                      })
                    }
                  />
                ))}
              </ListCard>
            ) : (
              <View style={styles.emptyCard} accessibilityLiveRegion="polite">
                <Text style={styles.emptyTitle}>
                  {q ? `No matches for “${q}”` : 'No entries match these filters'}
                </Text>
                <Text style={styles.emptyText}>
                  {q ? 'Try another name, brand, or filter.' : 'Try a different type or effect on milk production.'}
                </Text>
                <View style={styles.emptyActions}>
                  <Pressable
                    onPress={q ? () => setQuery('') : clearFilters}
                    accessibilityRole="button"
                    style={styles.primaryAction}
                  >
                    <Text style={styles.primaryActionText}>{q ? 'Clear search' : 'Clear filters'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.replace('/(tabs)/home')}
                    accessibilityRole="button"
                    style={styles.secondaryAction}
                  >
                    <Text style={styles.secondaryActionText}>Back to Home</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </PageColumns>
      </FormScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { paddingHorizontal: 22, paddingBottom: 32, paddingTop: 4 },
    desktopContent: { paddingHorizontal: layout.desktopPagePadding },
    desktopFilters: { flexDirection: 'column' },
    filtersCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
    filtersHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    filtersTitle: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    clearButton: {
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
    },
    clearButtonText: { ...font.bold, fontSize: fontSize.body, color: colors.detailLink },
    filterLabel: {
      ...font.extrabold,
      fontSize: fontSize.tiny,
      letterSpacing: 1,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    effectLabel: { marginTop: spacing.lg },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    filterChip: {
      minHeight: 44,
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: radius.pill,
      backgroundColor: colors.inputBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    filterChipActive: { backgroundColor: colors.ink.bg, borderColor: colors.ink.bg },
    filterFocused: { boxShadow: colors.focusRing },
    filterText: { ...font.semibold, fontSize: fontSize.body, color: colors.textSecondary },
    filterTextActive: { ...font.bold, color: colors.ink.fg },
    pressed: { opacity: 0.7 },
    resultsHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    resultsLabel: {
      ...font.extrabold,
      fontSize: fontSize.tiny,
      letterSpacing: 1,
      color: colors.textMuted,
    },
    resultsCount: { ...font.semibold, fontSize: fontSize.body, color: colors.textFaint },
    list: { marginTop: 0 },
    emptyCard: {
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      padding: spacing.xl,
    },
    emptyTitle: {
      ...font.extrabold,
      fontSize: fontSize.cardTitle,
      color: colors.text,
      textAlign: 'center',
    },
    emptyText: {
      ...font.semibold,
      fontSize: fontSize.base,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 6,
    },
    emptyActions: { alignSelf: 'stretch', gap: 8, marginTop: spacing.lg },
    primaryAction: {
      alignItems: 'center',
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      paddingVertical: 11,
    },
    primaryActionText: { ...font.bold, fontSize: fontSize.small, color: colors.onAccent },
    secondaryAction: { alignItems: 'center', paddingVertical: 9 },
    secondaryActionText: { ...font.bold, fontSize: fontSize.small, color: colors.detailLink },
  });
