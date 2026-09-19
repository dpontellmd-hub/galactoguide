import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chevron } from '@/components/Chevron';
import { openExternal } from '@/components/ExternalLink';
import { ListCard } from '@/components/ListCard';
import { LegalLinks } from '@/components/legal-links';
import { PageColumns } from '@/components/page-columns';
import { ReleaseNoteCard } from '@/components/release-note-card';
import { CollapsingScrollView } from '@/components/collapsing-scroll-view';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { releaseNotes } from '@/data/release-notes';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import {
  font,
  fontSize,
  layout,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

const dyadLogo = require('@/assets/images/dyad-health-collective.png');
const dyadFlower = require('@/assets/images/logo-original-refined.png');

const CREDENTIALS: { year: string; title: string }[] = [
  { year: '2009', title: 'B.S. Emory University' },
  { year: '2014', title: 'M.D. UPenn Perelman School of Medicine' },
  { year: '2017', title: "Chief Resident, Children's Hospital of Philadelphia" },
  { year: '2018', title: 'Board Certified, American Board of Pediatrics' },
  { year: '2023', title: 'IBCLC Certified' },
  { year: '2026', title: 'Deep Dive Breastfeeding & Lactation Medicine, IABLE' },
];

const SOURCES = [
  'LactMed — NIH Drugs and Lactation Database',
  'ABM Clinical Protocol #9 (2018, second revision)',
  "Hale's Medications and Mothers' Milk",
  'Cochrane Reviews on oral galactogogues (2020)',
  'Breastfeeding Medicine journal',
  'Peer-reviewed literature, updated periodically',
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { isDesktop } = useResponsiveLayout();
  const labelColor = colors.accent;

  return (
    <CollapsingScrollView
      headerTitle="About GalactoGuide"
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + layout.screenHeaderTopSpacing },
        isDesktop && styles.desktopContent,
      ]}
    >
      <TabScreenHeader title="About GalactoGuide">
        <Text style={styles.pageIntro}>
          Evidence-informed milk production guidance, made to be useful in real life.
        </Text>
      </TabScreenHeader>

      <PageColumns testID="about-columns" sidebar={
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>CREATED AND REVIEWED BY</Text>
        <View style={styles.heroInner}>
          <View style={styles.heroMeta}>
            <Text style={styles.heroName}>Dr. Diana Pontell</Text>
            <Text style={styles.heroTitle}>Pediatrician · IBCLC · Nashville, TN</Text>
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>MD</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>IBCLC</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.heroActions}>
          <View
            style={styles.heroDyadLogo}
            accessible
            accessibilityRole="image"
            accessibilityLabel="The Dyad Health Collective"
          >
            <Image
              source={dyadFlower}
              style={styles.heroDyadFlower}
              contentFit="contain"
              tintColor={colors.textOnDark}
              accessible={false}
            />
            <View style={styles.heroDyadWordmark}>
              <Image
                source={dyadLogo}
                style={styles.heroDyadWordmarkSource}
                contentFit="contain"
                tintColor={colors.textOnDark}
                accessible={false}
              />
            </View>
          </View>
          <Pressable
            onPress={() => openExternal('https://dyadhealthcollective.com')}
            style={styles.visitBtn}
            accessibilityRole="link"
          >
            <Text style={styles.visitBtnText}>Visit Dyad Health Collective ↗</Text>
          </Pressable>
        </View>
      </View>
      }>

      {/* My story */}
      <View style={styles.aboutCard}>
        <Text style={[styles.aboutLabel, { color: labelColor }]}>MY STORY</Text>
        <Text style={styles.para}>
          I first became interested in breastfeeding medicine after having my first child at
          the end of my pediatric residency. Despite years of medical training, I realized I
          had real gaps in the practical application of breastfeeding — Do I need to pump?
          Change my diet? How do I start? How do I maintain my milk production?
        </Text>
        <View style={styles.quoteBar}>
          <Text style={styles.quoteText}>
            “I know through caring for my own patients that finding adequate breastfeeding
            support is not easy. Women often feel alone navigating their infant feeding goals
            among premature birth, medical complexities, mental health concerns, and the
            demands of work and family life.”
          </Text>
        </View>
        <Text style={styles.para}>
          I was fortunate to have incredible clinical mentors and a supportive community that
          guided me on my breastfeeding journey. Through all these experiences I realized
          there is SO MUCH to be shared about human milk — from the first latch to the
          squirmy toddler.
        </Text>
      </View>

      {/* About Dyad */}
      <View style={styles.aboutCard}>
        <Text style={[styles.aboutLabel, { color: labelColor }]}>ABOUT DYAD HEALTH COLLECTIVE</Text>
        <Text style={styles.para}>
          Founded in 2025, Dyad Health Collective bridges a gap in postpartum care by
          providing physician-level breastfeeding and lactation medicine consulting in the
          Nashville area, with both in-home and virtual visits during the “fourth trimester.”
        </Text>
      </View>

      {/* Credentials */}
      <View style={styles.aboutCard}>
        <Text style={[styles.aboutLabel, { color: labelColor }]}>CREDENTIALS</Text>
        <View style={styles.credList}>
          {CREDENTIALS.map((c, index) => (
            <View
              key={`${c.year}-${c.title}`}
              style={[styles.credItem, index > 0 && styles.credItemBorder]}
            >
              <View style={styles.credYearPill}>
                <Text style={[styles.credYear, { color: colors.terra }]}>{c.year}</Text>
              </View>
              <Text style={styles.credTitle}>{c.title}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Content sources */}
      <View style={styles.aboutCard}>
        <Text style={[styles.aboutLabel, { color: labelColor }]}>CONTENT SOURCES</Text>
        <View style={styles.sourceList}>
          {SOURCES.map((s) => (
            <View key={s} style={styles.sourceRow}>
              <Text style={styles.sourceBullet}>•</Text>
              <Text style={styles.sourceLine}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.aboutLabel, styles.exploreLabel, { color: labelColor }]}>EXPLORE</Text>
      <ListCard style={styles.exploreCard}>
        <Pressable
          onPress={() => router.push('/resources')}
          accessibilityRole="button"
          style={styles.linkRow}
        >
          <View style={styles.linkRowCopy}>
            <Text style={styles.linkRowText}>Resources</Text>
            <Text style={styles.linkRowSub}>Trusted references and support directories</Text>
          </View>
          <Chevron />
        </Pressable>
        <Pressable
          onPress={() => router.push('/feedback')}
          accessibilityRole="button"
          style={[styles.linkRow, styles.linkRowTop]}
        >
          <View style={styles.linkRowCopy}>
            <Text style={styles.linkRowText}>Send feedback</Text>
            <Text style={styles.linkRowSub}>Tell us what would make the guide more useful</Text>
          </View>
          <Chevron />
        </Pressable>
      </ListCard>

      <Text style={[styles.aboutLabel, styles.exploreLabel, { color: labelColor }]} accessibilityRole="header">
        RELEASE NOTES
      </Text>
      <ReleaseNoteCard release={releaseNotes[0]} latest>
        <Link href="/release-notes" asChild>
          <Pressable
            accessibilityRole="link"
            style={StyleSheet.flatten([styles.linkRow, styles.linkRowTop])}
          >
            <Text style={[styles.linkRowText, styles.linkRowCopy]}>View all release notes</Text>
            <Chevron />
          </Pressable>
        </Link>
      </ReleaseNoteCard>
      <LegalLinks />

      <Text style={styles.footer}>
        GalactoGuide is for educational purposes only. Not medical advice.{'\n'}
        GalactoGuide™ © 2026 Dyad Health Collective LLC
      </Text>
      </PageColumns>
    </CollapsingScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.appBg },
  content: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: 40 },
  desktopContent: { paddingHorizontal: layout.desktopPagePadding, paddingTop: 40 },
  pageIntro: {
    ...font.regular,
    fontSize: fontSize.lg,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  heroCard: {
    backgroundColor: colors.brandNavy,
    borderRadius: 22,
    padding: 20,
    marginBottom: spacing.md,
  },
  heroEyebrow: {
    ...font.bold,
    fontSize: fontSize.micro,
    letterSpacing: 1.1,
    color: 'rgba(250,247,242,0.62)',
    marginBottom: spacing.md,
  },
  heroInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: 18 },
  heroMeta: { flex: 1 },
  heroName: { ...font.extrabold, fontSize: 21, lineHeight: 26, color: colors.textOnDark },
  heroTitle: { ...font.regular, fontSize: fontSize.base, lineHeight: 20, color: 'rgba(250,247,242,0.72)', marginTop: 3 },
  heroBadges: { flexDirection: 'row', gap: 6, marginTop: 10 },
  heroBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBadgeText: { ...font.bold, fontSize: fontSize.tiny, color: colors.textOnDark },
  heroActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 16,
    alignItems: 'center',
  },
  heroDyadLogo: {
    width: '100%',
    maxWidth: 560,
    aspectRatio: 1500 / 323,
    marginVertical: 8,
    marginBottom: 24,
  },
  heroDyadFlower: {
    position: 'absolute',
    left: 0,
    width: '14.8%',
    height: '100%',
  },
  // Show only the original lettering, to the right of the new flower mark.
  heroDyadWordmark: {
    position: 'absolute',
    right: 0,
    width: '85.2%',
    height: '100%',
    overflow: 'hidden',
  },
  heroDyadWordmarkSource: {
    position: 'absolute',
    right: 0,
    width: `${(1500 / 1278) * 100}%`,
    height: '100%',
  },
  visitBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    backgroundColor: colors.terraLight,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  visitBtnText: { ...font.bold, fontSize: fontSize.base, color: colors.accent },
  aboutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: spacing.md,
  },
  aboutLabel: {
    ...font.semibold,
    fontSize: fontSize.small,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  para: { ...font.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
  quoteBar: {
    borderLeftWidth: 4,
    borderLeftColor: colors.caramel,
    paddingLeft: 14,
    paddingVertical: 2,
    marginVertical: 18,
  },
  quoteText: { ...font.semibold, fontSize: 15, color: colors.text, lineHeight: 24 },
  credList: { gap: 0 },
  credItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingVertical: 9,
  },
  credItemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  credYearPill: {
    width: 58,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.terraLight,
    alignItems: 'center',
  },
  credYear: { ...font.bold, fontSize: fontSize.small },
  credTitle: { ...font.semibold, fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 20, flex: 1 },
  sourceList: { gap: 12 },
  sourceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sourceBullet: { ...font.regular, fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 21 },
  sourceLine: { ...font.regular, fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 21, flex: 1 },
  exploreLabel: { marginTop: 10, paddingHorizontal: 2 },
  exploreCard: { marginTop: 0, marginBottom: spacing.md },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: spacing.md,
  },
  linkRowTop: { borderTopWidth: 1.5, borderTopColor: colors.divider },
  linkRowCopy: { flex: 1 },
  linkRowText: { ...font.extrabold, fontSize: fontSize.lg, color: colors.text },
  linkRowSub: { ...font.regular, fontSize: fontSize.body, lineHeight: 20, color: colors.textSecondary, marginTop: 2 },
  footer: {
    ...font.regular,
    fontSize: fontSize.body,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: 14,
    lineHeight: 20,
  },
});
