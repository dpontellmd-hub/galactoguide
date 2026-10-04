import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePortal } from '@/context/PortalContext';
import { LegalLinks } from '@/components/legal-links';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import {
  font,
  fontSize,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

export default function NoticesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { portal, acceptDisclaimer } = usePortal();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { isDesktop } = useResponsiveLayout();

  if (!portal) return <Redirect href="/" />;

  const onAgree = () => {
    acceptDisclaimer();
    router.replace('/(tabs)/home');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 24 },
        isDesktop && styles.desktopContent,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
    >
      <View style={styles.navigationRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.heading}>
        <View style={styles.portalBadge}>
          <Text style={styles.portalBadgeText}>
            {portal === 'mother' ? 'PARENT & CAREGIVER VIEW' : 'HEALTHCARE PROVIDER VIEW'}
          </Text>
        </View>
        <Text style={styles.title}>Before you continue</Text>
        <Text style={styles.subtitle}>A quick note about the limits of this guide.</Text>
      </View>

      <View style={styles.scopeCard}>
        <Text style={styles.scopeTitle}>About this reference</Text>
        <Text style={styles.scopeText} selectable>
          GalactoGuide summarizes current research on substances that may raise or lower
          milk production. Evidence is often limited or mixed, and an effect on milk production does not
          tell you whether a substance is safe for you or your baby.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>PLEASE KEEP IN MIND</Text>

      <View style={styles.noticeList}>
        <View style={styles.noticeRow}>
          <View style={[styles.noticeMarker, { backgroundColor: colors.terraLight }]}>
            <Text style={[styles.noticeMarkerText, { color: colors.accent }]}>✓</Text>
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Decide with a qualified clinician</Text>
            <Text style={styles.noticeText} selectable>
              Do not start, stop, or change a medication or supplement based only on this
              app. Your individual benefits, risks, and contraindications need clinical
              review.
            </Text>
          </View>
        </View>

        <View style={styles.noticeRow}>
          <View style={[styles.noticeMarker, { backgroundColor: colors.cream }]}>
            <Text style={[styles.noticeMarkerText, { color: colors.textMuted }]}>i</Text>
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Use it as a reference—not medical care</Text>
            <Text style={styles.noticeText} selectable>
              GalactoGuide does not diagnose, treat, provide personalized medical advice,
              or create a patient–provider relationship.
            </Text>
          </View>
        </View>

        <View style={[styles.noticeRow, styles.noticeRowLast]}>
          <View style={[styles.noticeMarker, { backgroundColor: colors.kindFuge.bg }]}>
            <Text style={[styles.noticeMarkerText, { color: colors.kindFuge.fg }]}>!</Text>
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Get emergency help elsewhere</Text>
            <Text style={styles.noticeText} selectable>
              This app is not for urgent concerns. Contact local emergency services; in the
              U.S., call 911.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reviewBlock}>
        <Text style={styles.reviewText} selectable>
          Content developed and reviewed by
          {'\n'}<Text style={styles.reviewStrong}>Dr. Diana Pontell, MD, IBCLC</Text>
          {'\n'}The Dyad Health Collective · Last reviewed April 2026
        </Text>
      </View>

      <Text style={styles.acknowledgement}>By continuing, you acknowledge these limits and agree to the Terms of Use.</Text>
      <LegalLinks />
      <Pressable
        onPress={onAgree}
        accessibilityRole="button"
        accessibilityLabel="I understand and continue"
        style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
      >
        <Text style={styles.continueText}>I understand and continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { flexGrow: 1, paddingHorizontal: 22 },
    desktopContent: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 40, paddingBottom: 40 },
    navigationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: radius.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    backArrow: {
      ...font.regular,
      fontSize: 32,
      lineHeight: 34,
      color: colors.textSecondary,
      marginTop: -2,
    },
    heading: { alignItems: 'center', paddingTop: 34 },
    portalBadge: {
      borderRadius: radius.pill,
      backgroundColor: colors.terraLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    portalBadgeText: {
      ...font.extrabold,
      fontSize: fontSize.small,
      color: colors.brown,
      letterSpacing: 0.7,
    },
    title: {
      ...font.extrabold,
      fontSize: fontSize.headline,
      lineHeight: 36,
      letterSpacing: -0.5,
      color: colors.text,
      textAlign: 'center',
      paddingTop: spacing.xl,
    },
    subtitle: {
      ...font.regular,
      fontSize: fontSize.cardTitle,
      lineHeight: 23,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingTop: spacing.sm,
      maxWidth: 360,
    },
    scopeCard: {
      backgroundColor: colors.cream,
      borderRadius: 22,
      borderCurve: 'continuous',
      padding: spacing.xl,
      marginTop: spacing.xxl,
    },
    scopeTitle: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    scopeText: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: 22,
      color: colors.textSecondary,
      paddingTop: spacing.sm,
    },
    sectionLabel: {
      ...font.extrabold,
      fontSize: fontSize.small,
      color: colors.textMuted,
      letterSpacing: 1,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.sm,
    },
    noticeList: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 24,
      borderCurve: 'continuous',
      paddingHorizontal: spacing.xl,
      boxShadow: colors.shadowSoft,
    },
    noticeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
      paddingVertical: spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    noticeRowLast: { borderBottomWidth: 0 },
    noticeMarker: {
      width: 38,
      height: 38,
      borderRadius: radius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noticeMarkerText: { ...font.extrabold, fontSize: fontSize.cardTitle },
    noticeCopy: { flex: 1, minWidth: 0 },
    noticeTitle: {
      ...font.extrabold,
      fontSize: fontSize.cardTitle,
      lineHeight: 21,
      color: colors.text,
    },
    noticeText: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: 22,
      color: colors.textSecondary,
      paddingTop: spacing.xs,
    },
    reviewBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: spacing.xxl,
      paddingHorizontal: spacing.sm,
    },
    reviewText: {
      ...font.regular,
      flex: 1,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textMuted,
    },
    reviewStrong: { ...font.extrabold, color: colors.text },
    acknowledgement: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: 'center',
      paddingTop: spacing.xxl,
    },
    continueButton: {
      minHeight: 54,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
    },
    continueText: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.onAccent },
    pressed: { opacity: 0.72 },
  });
