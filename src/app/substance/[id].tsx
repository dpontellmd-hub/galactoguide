import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PageColumns } from '@/components/page-columns';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { CircleButton } from '@/components/CircleButton';
import { DirectionTriangle } from '@/components/DirectionIndicator';
import { EvidenceMeter } from '@/components/EvidenceMeter';
import { LinkChip } from '@/components/LinkChip';
import { NoteCard } from '@/components/NoteCard';
import { ReviewerCard } from '@/components/ReviewerCard';
import { SafetyTags } from '@/components/SafetyTags';
import { SectionLabel } from '@/components/SectionLabel';
import { StatTile } from '@/components/StatTile';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { usePortal } from '@/context/PortalContext';
import { useSituations } from '@/context/SituationsContext';
import { getReviewedDate, getSources, getSubstanceById } from '@/data/repository';
import type { SafetyLevel, SubstanceKind } from '@/data/types';
import {
  directionLabel,
  directionOf,
  evidenceText,
  formatReviewedDate,
  safetyValueLabel,
  studyResultsCaption,
  situationShortLabels,
  typeLabel,
} from '@/lib/format';
import { publicUrl } from '@/lib/site';
import { font, fontSize, layout, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

const REVIEWER = 'Diana Pontell, MD, IBCLC';

/** The answer page — template for all entries (pushed, no tab bar). */
export default function SubstanceDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktop, hasSupportingColumn } = useResponsiveLayout();
  const { isMother } = usePortal();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { situations } = useSituations();
  const { id, kind } = useLocalSearchParams<{ id: string; kind: SubstanceKind }>();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [toastOpacity] = useState(() => new Animated.Value(0));

  // Fade the "link copied" toast in, hold ~1.8s, fade out, then unmount.
  useEffect(() => {
    if (!copied) return;
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setCopied(false));
    }, 1800);
    return () => clearTimeout(t);
  }, [copied, toastOpacity]);

  const d = getSubstanceById(id, kind);
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)/home');

  if (!d) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.notFound}>Substance not found.</Text>
        <Pressable onPress={goBack} accessibilityRole="button">
          <Text style={[styles.closeLabel, { color: colors.accent }]}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const direction = directionOf(d);
  const header = colors.entryHeader[direction];
  const directionColor =
    direction === 'raise'
      ? colors.directionGogue.header
      : direction === 'lower'
        ? colors.directionFuge.header
        : colors.directionNone;
  const sources = getSources(d.id);
  const reviewed = formatReviewedDate(getReviewedDate(d.id));
  const saved = isFavorite(d.id);
  const summary = isMother ? d.short_m : d.short_p;
  const headerSummary = isMother ? d.headerSummary_m : d.headerSummary_p;
  const titleParts = d.name.match(/^(.*) (\([^()]+\))$/);
  const explainer = isMother ? d.evidence_m : d.evidence_p;
  const studyCaption = studyResultsCaption(
    d.studyCaption ?? d.evidenceType?.join(' · '),
    d.conflicting,
  );
  const notes = d.goodToKnow ?? [
    { tone: 'neutral' as const, text: isMother ? d.notes_m : d.notes_p },
  ];

  const onToggleSaved = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    toggleFavorite(d.id);
  };

  // Personalized caution: surface the user's saved situations that this entry
  // rates `caution` or `avoid`, so the warning is tailored to their profile.
  const flagged = situations
    .map((s) => ({ s, level: d.safety[s] }))
    .filter((x) => x.level === 'caution' || x.level === 'avoid');
  const worst: SafetyLevel | null = flagged.some((f) => f.level === 'avoid')
    ? 'avoid'
    : flagged.length > 0
      ? 'caution'
      : null;
  const selectedContextSummary = flagged
    .map((item) => `${situationShortLabels[item.s]}: ${safetyValueLabel(item.level)}`)
    .join(' · ');

  const onShare = async () => {
    const shareUrl = publicUrl(`/substance/${encodeURIComponent(d.id)}?kind=${d.kind}`);
    const shareMessage = `${d.name} — ${summary}`;

    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && navigator.share) {
          // Web Share API: native share sheet on mobile web / supported browsers.
          await navigator.share({ title: d.name, text: shareMessage, url: shareUrl });
        } else {
          // Desktop fallback: copy the link and confirm with a toast.
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
        }
      } catch {
        // User dismissed the share sheet, or clipboard access was denied.
      }
      return;
    }

    // Native iOS/Android: OS share sheet. Android reads the URL from `message`;
    // iOS uses the dedicated `url` field.
    Share.share({
      title: d.name,
      message: `${shareMessage}\n\n${shareUrl}`,
      url: shareUrl,
    }).catch(() => {
      // User dismissed the sheet, or the platform has no share target.
    });
  };

  const stats = (<>
    {/* Stat tiles */}
    {(d.typicalUse || d.timeToEffect) && (
      <View style={[styles.tiles, hasSupportingColumn && styles.desktopTiles]}>
        {d.typicalUse && (
          <StatTile
            label="Typical use"
            value={d.typicalUse.value}
            detail={d.typicalUse.detail}
          />
        )}
        {d.timeToEffect && (
          <StatTile
            label="Give it"
            value={d.timeToEffect.value}
            detail={d.timeToEffect.detail}
          />
        )}
      </View>
    )}
  </>);
  const reviewer = (<>
    {/* Reviewer credit */}
    <View style={styles.reviewer}>
      <ReviewerCard
        name={REVIEWER}
        updated={reviewed}
        sourceCount={sources.length}
        onPressSources={() => setShowSources((v) => !v)}
      />
    </View>
    {showSources && sources.length > 0 && (
      <View style={styles.refRow}>
        {sources.map((s) => (
          <LinkChip
            key={s.url}
            label={s.label}
            url={s.url}
            bg={colors.terraLight}
            fg={colors.brown}
          />
        ))}
      </View>
    )}
  </>);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header band, tinted by direction. The overscroll block extends the
            tint above the band so iOS rubber-banding doesn't flash cream. */}
        <View style={[styles.headerBand, { backgroundColor: header.bg, paddingTop: insets.top + (isDesktop ? 32 : 14) }, isDesktop && styles.desktopHeader]}>
          <View style={[styles.overscroll, { backgroundColor: header.bg }]} />
          <View style={styles.headerButtons}>
            <CircleButton onPress={goBack} label="Back">
              <Svg width={9} height={16} viewBox="0 0 9 16">
                <Path
                  d="M8 1L2 8l6 7"
                  stroke={colors.textSecondary}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </CircleButton>
            <View style={styles.headerRight}>
              <CircleButton onPress={onShare} label="Share">
                <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
              </CircleButton>
              <CircleButton
                onPress={onToggleSaved}
                label={!user ? 'Sign in to save' : saved ? 'Remove from saved' : 'Save'}
                selected={saved}
              >
                <Svg width={14} height={17} viewBox="0 0 14 17">
                  <Path
                    d="M2 1.5 H12 V15.5 L7 11.8 L2 15.5 Z"
                    fill={saved ? colors.accent : 'none'}
                    stroke={saved ? colors.accent : colors.textSecondary}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                  />
                </Svg>
              </CircleButton>
            </View>
          </View>

          <View style={styles.kicker}>
            <Text style={[styles.kickerText, { color: directionColor }]}>
              {typeLabel(d.type)}
            </Text>
            <View style={styles.kickerDirection}>
              {direction !== 'none' && (
                <DirectionTriangle direction={direction} color={directionColor} width={11} />
              )}
              <Text style={[styles.kickerText, { color: directionColor }]}>
                {direction === 'none' ? '— ' : ' '}
                {directionLabel(direction)}
              </Text>
            </View>
          </View>
          <View style={styles.headerReading}>
            <Text selectable style={[styles.title, isDesktop && styles.desktopTitle]} accessibilityRole="header">
              {titleParts ? <>{titleParts[1]} <Text style={styles.secondaryTitle}>{titleParts[2]}</Text></> : d.name}
            </Text>
            <Text selectable style={[styles.verdict, isDesktop && styles.desktopVerdict]}>{headerSummary?.text ?? summary}</Text>
            {headerSummary && (
              <View style={styles.headerCaution}>
                <Text style={styles.cautionLabel} accessibilityRole="header">Important safety information</Text>
                <Text selectable style={[styles.cautionText, isDesktop && styles.desktopVerdict]}>{headerSummary.caution}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.body, isDesktop && styles.desktopBody]}>
          <PageColumns testID="entry-columns" sidebarSide="right" sidebar={
            <>
              {/* Evidence summary */}
              <View style={[styles.evidenceCard, isDark && styles.evidenceCardDark, isDesktop && styles.desktopEvidence]}>
                <SectionLabel
                  right={
                    <Pressable
                      onPress={() => router.push('/grading')}
                      accessibilityRole="button"
                      accessibilityLabel="How we grade evidence"
                      hitSlop={8}
                    >
                      <Text style={styles.gradeLink}>how we grade</Text>
                    </Pressable>
                  }
                >
                  Evidence
                </SectionLabel>
                <View style={styles.meterRow}>
                  <EvidenceMeter score={d.evidence} size={18} align="left" />
                  <View style={styles.meterText}>
                    <Text style={styles.evidenceLevel}>{evidenceText(d.evidence)} evidence</Text>
                    {studyCaption && <Text style={styles.studyCaption}>{studyCaption}</Text>}
                  </View>
                </View>
                <Text style={styles.explainer}>{explainer}</Text>
              </View>
              {hasSupportingColumn && stats}
              {hasSupportingColumn && reviewer}
            </>
          }>
            {/* Mechanism (provider voice only) */}
            {!isMother && (
              <>
                <SectionLabel style={styles.sectionGap}>Mechanism</SectionLabel>
                <Text style={styles.paragraph}>{d.mechanism}</Text>
              </>
            )}
            {!hasSupportingColumn && stats}
            {/* Good to know */}
            <SectionLabel style={styles.sectionGap}>Good to know</SectionLabel>
            <View style={styles.notes}>
              {worst && (
                <NoteCard
                  tone="caution"
                  text={`For your selected situations: ${selectedContextSummary}. This is not an individual risk assessment.`}
                  strongTail="Check with your provider first."
                />
              )}
              {notes.map((n, i) => (
                <NoteCard key={i} tone={n.tone} text={n.text} strongTail={n.strong} />
              ))}
            </View>

            {/* Complete context reference for the fixed clinical situations. */}
            <SectionLabel style={styles.sectionGap}>All situation ratings</SectionLabel>
            <Text style={styles.safetyIntro}>
              This reference summarizes considerations for each supported health and feeding
              situation, based on available evidence in the scientific literature. These ratings do not measure how well this option works.
            </Text>
            <View style={styles.safetyTags}>
              <SafetyTags safety={d.safety} labels={situationShortLabels} />
            </View>
          </PageColumns>
          {!hasSupportingColumn && reviewer}
        </View>
      </ScrollView>

      {/* "link copied" toast (web copy-link fallback) */}
      {copied && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { bottom: insets.bottom + 40, opacity: toastOpacity }]}
          accessibilityRole="alert"
          accessibilityLabel="Link copied to clipboard"
        >
          <View style={styles.toastCard}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={styles.toastText}>Link copied to clipboard</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
    notFound: { ...font.semibold, fontSize: fontSize.base, color: colors.textSecondary },
    closeLabel: { ...font.semibold, fontSize: fontSize.base },

    scrollContent: { paddingBottom: 40 },

    headerBand: {
      borderBottomLeftRadius: 38,
      borderBottomRightRadius: 38,
      paddingHorizontal: 24,
      paddingBottom: 56,
    },
    overscroll: { position: 'absolute', top: -300, left: 0, right: 0, height: 300 },
    headerButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerRight: { flexDirection: 'row', gap: 10 },
    kicker: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, marginTop: 22 },
    kickerDirection: { flexDirection: 'row', alignItems: 'center' },
    kickerText: {
      ...font.extrabold,
      fontSize: fontSize.small,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      ...font.extrabold,
      fontSize: fontSize.display,
      lineHeight: 44,
      letterSpacing: -0.6,
      color: colors.text,
      marginTop: 5,
    },
    headerReading: { width: '100%', maxWidth: 640 },
    secondaryTitle: { ...font.regular, fontSize: 24, letterSpacing: 0 },
    verdict: {
      ...font.regular,
      fontSize: fontSize.zone,
      lineHeight: 29,
      color: colors.text,
      marginTop: 12,
    },
    headerCaution: {
      marginTop: 20,
      paddingLeft: 16,
      borderLeftWidth: 3,
      borderLeftColor: colors.noteCaution.strong,
    },
    cautionLabel: { ...font.bold, fontSize: fontSize.base, lineHeight: 22, color: colors.noteCaution.strong },
    cautionText: { ...font.regular, fontSize: fontSize.zone, lineHeight: 29, color: colors.text, marginTop: 6 },

    body: { paddingHorizontal: 22 },
    desktopBody: { paddingHorizontal: layout.desktopPagePadding, paddingTop: 24 },
    desktopHeader: { paddingHorizontal: layout.desktopPagePadding, paddingBottom: 32 },
    desktopTitle: { fontSize: 36, lineHeight: 44 },
    desktopVerdict: { fontSize: 20, lineHeight: 32 },
    desktopEvidence: { marginTop: 0 },
    desktopTiles: { flexDirection: 'column' },

    evidenceCard: {
      backgroundColor: colors.surface,
      borderRadius: 26,
      padding: 20,
      marginTop: -34,
      boxShadow: colors.shadowCard,
    },
    // Shadows vanish on the dark background — swap in a border.
    evidenceCardDark: { borderWidth: 1.5, borderColor: colors.border },
    gradeLink: {
      ...font.bold,
      fontSize: fontSize.small,
      color: colors.textFaint,
      textDecorationLine: 'underline',
    },
    meterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 13 },
    meterText: { flex: 1, gap: 1 },
    evidenceLevel: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    studyCaption: { ...font.bold, fontSize: fontSize.small, color: colors.textMuted },
    explainer: {
      ...font.semibold,
      fontSize: fontSize.note,
      lineHeight: 22,
      color: colors.explainerText,
      marginTop: 13,
      paddingTop: 13,
      borderTopWidth: 1.5,
      borderTopColor: colors.divider,
    },

    sectionGap: { marginTop: 24 },
    paragraph: {
      ...font.semibold,
      fontSize: fontSize.note,
      lineHeight: 22,
      color: colors.explainerText,
      marginTop: 8,
    },

    tiles: { flexDirection: 'row', gap: 10, marginTop: 12 },

    notes: { gap: 9, marginTop: 11 },

    safetyIntro: {
      ...font.regular,
      fontSize: fontSize.note,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 8,
    },
    safetyTags: { marginTop: 10 },

    reviewer: { marginTop: 20 },
    refRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },

    toast: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1000,
    },
    toastCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 8,
      paddingHorizontal: 12,
      elevation: 8,
      boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.18)',
    },
    toastText: { ...font.semibold, fontSize: fontSize.small, color: colors.text },
  });
