import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageColumns } from '@/components/page-columns';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { Chevron } from '@/components/Chevron';
import { SubstanceIcon } from '@/components/SubstanceIcon';
import { CollapsingScrollView } from '@/components/collapsing-scroll-view';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { usePortal } from '@/context/PortalContext';
import { useSituations } from '@/context/SituationsContext';
import { getAllSubstances, getGalactofuges, getGalactogogues } from '@/data/repository';
import type { Situation, SubstanceWithKind } from '@/data/types';
import {
  directionLabel,
  directionOf,
  evidenceCaption,
  safetyChipColors,
  safetyValueLabel,
  situationSelectorLabels,
  situationShortLabels,
  typeLabel,
} from '@/lib/format';
import { computeRecommendations, type RecFilter, worstSafety } from '@/lib/recommend';
import {
  font,
  fontSize,
  layout,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ResultCardColors,
  type ThemeColors,
} from '@/theme';

const DISCLAIMER = {
  mother:
    'This guide organizes context-specific considerations. It does not assess your complete medical history, determine effectiveness, or replace advice from your clinician or IBCLC.',
  provider:
    'This guide organizes context-specific considerations. It is not a complete lactation-safety evaluation or individualized recommendation. Apply clinical judgment and an individual patient assessment.',
};

const FILTERS: { key: RecFilter; label: string }[] = [
  { key: 'both', label: 'All' },
  { key: 'gogue', label: 'May increase' },
  { key: 'fuge', label: 'May decrease' },
];

const SITUATION_GROUPS: { label: string; situations: Situation[] }[] = [
  { label: 'Feeding situation', situations: ['preterm', 'low_supply', 'relactation'] },
  { label: 'Health context', situations: ['pcos', 'hypoplasia', 'cardiac', 'diabetes'] },
];

type ResultVariant = 'avd' | 'cau' | 'rec';

interface ResultGroup {
  variant: ResultVariant;
  title: string;
  description: string;
  items: SubstanceWithKind[];
}

function selectedContextLine(substance: SubstanceWithKind, situations: Situation[]): string {
  const level = worstSafety(substance.safety, situations);
  if (!level) return '';

  const drivers = situations.filter((situation) => substance.safety[situation] === level);
  const scope =
    drivers.length === situations.length && situations.length > 1
      ? `All ${situations.length} selected situations`
      : drivers.map((situation) => situationShortLabels[situation]).join(', ');

  return `${scope}: ${safetyValueLabel(level)}`;
}

function ResultRow({
  substance,
  situations,
  onPress,
  showDivider,
}: {
  substance: SubstanceWithKind;
  situations: Situation[];
  onPress: () => void;
  showDivider: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const direction = directionOf(substance);
  const contextLine = selectedContextLine(substance, situations);
  const contextLevel = worstSafety(substance.safety, situations);
  const contextColors = contextLevel ? safetyChipColors(contextLevel, colors) : colors.ink;
  const evidence = evidenceCaption(substance.evidence, substance.conflicting);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${substance.name}, ${typeLabel(substance.type)}, ${directionLabel(direction)}, ${evidence}, ${contextLine}`}
      style={({ pressed }) => [
        styles.resultRow,
        showDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <SubstanceIcon substance={substance} />
      <View style={styles.resultRowCopy}>
        <Text style={styles.resultName}>{substance.name}</Text>
        <Text style={styles.resultMeta}>
          {directionLabel(direction)} · {evidence}
        </Text>
        <View style={styles.contextLine}>
          <Text style={[styles.contextLineText, { color: contextColors.fg }]}>{contextLine}</Text>
        </View>
      </View>
      <Chevron color={colors.chevron} />
    </Pressable>
  );
}

export default function SituationGuideScreen() {
  const insets = useSafeAreaInsets();
  const { isDesktop, hasSupportingColumn } = useResponsiveLayout();
  const router = useRouter();
  const { isMother } = usePortal();
  const { situations, toggleSituation } = useSituations();
  const [recFilter, setRecFilter] = useState<RecFilter>('both');
  const [expandedGroup, setExpandedGroup] = useState<ResultVariant | null>(null);
  const [pickerExpanded, setPickerExpanded] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showSituationPicker = !situations.length || pickerExpanded;

  const groups = useMemo<ResultGroup[]>(() => {
    if (!situations.length) return [];

    const recommendations = computeRecommendations(
      getGalactogogues(),
      getGalactofuges(),
      situations,
    );
    const byName = new Map(getAllSubstances().map((substance) => [substance.name, substance]));
    const resolve = (names: string[]) =>
      names.map((name) => byName.get(name)).filter((item): item is SubstanceWithKind => !!item);
    const avoid = resolve([
      ...(recFilter === 'fuge' ? [] : recommendations.gogueAvd),
      ...(recFilter === 'gogue' ? [] : recommendations.fugeAvoid),
    ]);
    const review = resolve([
      ...(recFilter === 'fuge' ? [] : recommendations.gogueCau),
      ...(recFilter === 'gogue' ? [] : recommendations.fugeCau),
    ]);
    const discuss = resolve(recFilter === 'fuge' ? [] : recommendations.gogueRec);

    return [
      {
        variant: 'avd' as const,
        title: isMother ? 'Avoid / get specialist input' : 'Avoid / specialist input',
        description: 'Marked “avoid” for at least one selected situation.',
        items: avoid,
      },
      {
        variant: 'cau' as const,
        title: isMother ? 'Review before use' : 'Review / counsel first',
        description: 'May lower milk production or needs more context before use.',
        items: review,
      },
      {
        variant: 'rec' as const,
        title: 'Reasonable to discuss',
        description: 'No caution or avoid rating here. Effectiveness still varies.',
        items: discuss,
      },
    ].filter((group) => group.items.length > 0);
  }, [isMother, recFilter, situations]);

  const resultColors = (variant: ResultVariant): ResultCardColors =>
    variant === 'rec' ? colors.resultRec : variant === 'cau' ? colors.resultCau : colors.resultAvd;

  const toggleGuideSituation = (situation: Situation) => {
    if (!situations.length) setPickerExpanded(true);
    setExpandedGroup(null);
    toggleSituation(situation);
  };

  const controls = (
    <>
      <View style={styles.contextCard}>
        <View style={[styles.contextHeader, hasSupportingColumn && styles.desktopContextHeader]}>
          <View style={styles.contextHeaderCopy}>
            <Text style={styles.contextTitle}>
              {situations.length
                ? `Considering ${situations.length} ${situations.length === 1 ? 'situation' : 'situations'}`
                : 'What should this guide consider?'}
            </Text>
            <Text style={styles.contextHelp}>
              {situations.length
                ? situations.map((situation) => situationSelectorLabels[situation]).join(' · ')
                : 'Choose anything that applies. You can change these selections at any time.'}
            </Text>
          </View>
          {!!situations.length && (
            <Pressable
              onPress={() => setPickerExpanded((expanded) => !expanded)}
              accessibilityRole="button"
              accessibilityLabel={showSituationPicker ? 'Hide situation choices' : 'Change situations'}
              hitSlop={8}
              style={styles.changeButton}
            >
              <Text style={styles.changeButtonText}>
                {showSituationPicker ? 'Hide choices' : 'Change'}
              </Text>
            </Pressable>
          )}
        </View>

        {showSituationPicker && (
          <View style={styles.situationGroups}>
            {SITUATION_GROUPS.map((group) => (
              <View key={group.label} style={styles.situationGroup}>
                <Text style={styles.situationGroupLabel}>{group.label}</Text>
                <View style={styles.situationGrid}>
                  {group.situations.map((situation) => {
                    const active = situations.includes(situation);
                    return (
                      <Pressable
                        key={situation}
                        onPress={() => toggleGuideSituation(situation)}
                        accessibilityRole="checkbox"
                        accessibilityLabel={situationSelectorLabels[situation]}
                        accessibilityState={{ checked: active }}
                        aria-checked={active}
                        style={[
                          styles.situationChip,
                          active && { backgroundColor: colors.accent, borderColor: colors.accent },
                        ]}
                      >
                        {active && <Ionicons name="checkmark" size={14} color={colors.onAccent} />}
                        <Text style={[styles.situationText, active && styles.situationTextActive]}>
                          {situationSelectorLabels[situation]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {situations.length > 0 && (
        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>EFFECT ON MILK PRODUCTION</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((filter) => {
              const active = recFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => {
                    setRecFilter(filter.key);
                    setExpandedGroup(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  aria-pressed={active}
                  style={[styles.filterButton, active && styles.filterButtonActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </>
  );

  return (
    <CollapsingScrollView
      headerTitle={isMother ? 'Your situation' : 'Clinical context'}
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + layout.screenHeaderTopSpacing },
        isDesktop && styles.desktopContent,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <TabScreenHeader title={isMother ? 'Your situation' : 'Clinical context'}>
        <Text style={styles.subtitle}>
          Choose relevant health and feeding situations. We’ll highlight entries that may need
          extra attention and explain why.
        </Text>
        <Text style={styles.scopeNote}>
          Your selections also shape the context notes you see while browsing GalactoGuide.
        </Text>
      </TabScreenHeader>

      <PageColumns testID="guide-columns" sidebar={controls}>
        {situations.length > 0 ? (
          <>
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.sectionLabel}>CONSIDERATIONS</Text>
                <Text style={styles.resultsIntro}>Highest-priority considerations appear first.</Text>
              </View>
              <Text style={styles.resultCount}>
                {groups.reduce((total, group) => total + group.items.length, 0)} entries
              </Text>
            </View>

            {groups.length ? (
              <View style={styles.results}>
                {groups.map((group) => {
                  const groupColors = resultColors(group.variant);
                  const expanded = expandedGroup === group.variant;
                  return (
                    <View
                      key={group.variant}
                      style={[styles.resultCard, { borderColor: groupColors.border }]}
                    >
                      <Pressable
                        onPress={() => setExpandedGroup(expanded ? null : group.variant)}
                        accessibilityRole="button"
                        accessibilityLabel={`${group.title}, ${group.items.length} ${group.items.length === 1 ? 'entry' : 'entries'}`}
                        accessibilityState={{ expanded }}
                        aria-expanded={expanded}
                        style={({ pressed }) => [
                          styles.resultHeader,
                          { backgroundColor: groupColors.bg },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.resultHeaderCopy}>
                          <Text style={[styles.resultTitle, { color: groupColors.title }]}>
                            {group.title}
                          </Text>
                          <Text style={[styles.resultDescription, { color: groupColors.items }]}>
                            {group.description}
                          </Text>
                        </View>
                        <View style={styles.resultHeaderMeta}>
                          <View style={styles.countChip}>
                            <Text style={styles.countText}>{group.items.length}</Text>
                          </View>
                          <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={groupColors.title}
                          />
                        </View>
                      </Pressable>
                      {expanded && (
                        <View>
                          {group.items.map((substance, itemIndex) => (
                            <ResultRow
                              key={`${substance.kind}-${substance.id}`}
                              substance={substance}
                              situations={situations}
                              showDivider={itemIndex < group.items.length - 1}
                              onPress={() =>
                                router.push({
                                  pathname: '/substance/[id]',
                                  params: { id: substance.id, kind: substance.kind },
                                })
                              }
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No entries match this direction</Text>
                <Text style={styles.emptyText}>Try another milk production filter above.</Text>
              </View>
            )}
          </>
        ) : hasSupportingColumn ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Choose a situation to get started</Text>
            <Text style={styles.emptyText}>The related considerations will appear here as you make your selections.</Text>
          </View>
        ) : null}
      </PageColumns>

      <Text style={[styles.disclaimer, isDesktop && styles.desktopDisclaimer]}>{isMother ? DISCLAIMER.mother : DISCLAIMER.provider}</Text>
    </CollapsingScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: 40 },
    desktopContent: { paddingHorizontal: layout.desktopPagePadding, paddingTop: 40 },
    desktopContextHeader: { flexDirection: 'column' },
    desktopDisclaimer: { maxWidth: 760 },
    subtitle: {
      ...font.semibold,
      fontSize: fontSize.base,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    scopeNote: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 19,
      color: colors.textMuted,
    },
    contextCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: 18,
      marginBottom: spacing.xl,
      boxShadow: colors.shadowCard,
    },
    contextHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    contextHeaderCopy: { flex: 1 },
    contextTitle: { ...font.extrabold, fontSize: fontSize.lg, lineHeight: 22, color: colors.text },
    contextHelp: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 4,
    },
    changeButton: { paddingVertical: 2, paddingLeft: spacing.sm },
    changeButtonText: { ...font.bold, fontSize: fontSize.small, color: colors.accent },
    situationGroups: { gap: spacing.lg, marginTop: spacing.xl },
    situationGroup: { gap: 8 },
    situationGroupLabel: {
      ...font.extrabold,
      fontSize: fontSize.tiny,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    situationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    situationChip: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: radius.pill,
      backgroundColor: colors.inputBg,
    },
    situationText: { ...font.semibold, fontSize: fontSize.small, color: colors.textSecondary },
    situationTextActive: { color: colors.onAccent },
    filterBlock: { marginBottom: spacing.xxl },
    filterLabel: {
      ...font.extrabold,
      fontSize: fontSize.tiny,
      letterSpacing: 1.1,
      color: colors.textMuted,
      marginBottom: 8,
    },
    filterRow: {
      flexDirection: 'row',
      padding: 3,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    filterButton: {
      flex: 1,
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      paddingHorizontal: 5,
    },
    filterButtonActive: { backgroundColor: colors.ink.bg },
    filterText: { ...font.bold, fontSize: fontSize.small, color: colors.textMuted },
    filterTextActive: { color: colors.ink.fg },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: spacing.md,
      marginBottom: 9,
    },
    sectionLabel: {
      ...font.extrabold,
      fontSize: fontSize.tiny,
      letterSpacing: 1.1,
      color: colors.textMuted,
    },
    resultsIntro: {
      ...font.semibold,
      fontSize: fontSize.small,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: 3,
    },
    resultCount: {
      ...font.semibold,
      fontSize: fontSize.small,
      color: colors.textFaint,
      fontVariant: ['tabular-nums'],
    },
    results: { gap: 10 },
    resultCard: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderRadius: radius.xl,
    },
    resultHeader: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    resultHeaderCopy: { flex: 1 },
    resultTitle: { ...font.extrabold, fontSize: fontSize.cardTitle, lineHeight: 20 },
    resultDescription: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 19,
      marginTop: 3,
    },
    resultHeaderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countChip: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: colors.countChipBg,
    },
    countText: {
      ...font.extrabold,
      fontSize: fontSize.small,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    resultRow: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
    },
    divider: { borderBottomWidth: 1.5, borderBottomColor: colors.divider },
    resultRowCopy: { flex: 1 },
    resultName: { ...font.extrabold, fontSize: fontSize.rowName, color: colors.text },
    resultMeta: {
      ...font.semibold,
      fontSize: fontSize.tiny,
      lineHeight: 16,
      color: colors.textMuted,
      marginTop: 2,
    },
    contextLine: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
    contextLineText: { ...font.bold, fontSize: fontSize.small, lineHeight: 16, flex: 1 },
    pressed: { opacity: 0.72 },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: 18,
    },
    emptyTitle: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    emptyText: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 19,
      color: colors.textSecondary,
      marginTop: 4,
    },
    disclaimer: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textFaint,
      marginTop: spacing.xxl,
      paddingHorizontal: 4,
    },
  });
