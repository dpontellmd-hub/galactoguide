import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LaunchLogo } from '@/components/LaunchLogo';
import { usePortal } from '@/context/PortalContext';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import type { Portal } from '@/data/types';
import {
  font,
  fontSize,
  radius,
  spacing,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

const PORTALS: {
  key: Portal;
  title: string;
  description: string;
  marker: string;
}[] = [
  {
    key: 'mother',
    title: 'Parent or caregiver',
    description: 'Plain-language guidance for personal use',
    marker: 'P',
  },
  {
    key: 'provider',
    title: 'Healthcare provider',
    description: 'Clinical context for patient conversations',
    marker: 'H',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { portal, disclaimerAccepted, selectPortal } = usePortal();
  const styles = useThemedStyles(makeStyles);
  const { isDesktop } = useResponsiveLayout();

  if (portal && disclaimerAccepted) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 },
        isDesktop && styles.desktopContent,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      bounces={false}
    >
      <View style={styles.brand}>
        <LaunchLogo />
        <Text style={styles.brandName}>GalactoGuide</Text>
      </View>

      <View style={[styles.columns, isDesktop && styles.desktopColumns]}>
      <View style={[styles.hero, isDesktop && styles.desktopHero]}>
        <Text style={styles.eyebrow}>EVIDENCE-BASED REFERENCE</Text>
        <Text style={[styles.headline, isDesktop && styles.desktopHeadline]}>Understand what may affect milk production.</Text>
        <Text style={styles.intro} selectable>
          A free, clinician-reviewed reference for medications, herbs, foods, and other
          substances.
        </Text>

        <Text style={styles.byline} selectable>
          Developed and reviewed by{' '}
          <Text style={styles.bylineStrong}>Dr. Diana Pontell, MD, IBCLC</Text>
          {'\n'}The Dyad Health Collective
        </Text>
      </View>

      <View style={[styles.selectionSection, isDesktop && styles.desktopSelection]}>
        <Text style={styles.selectionTitle}>Choose your view</Text>
        <Text style={styles.selectionIntro}>We’ll tailor the language and clinical context.</Text>

        <View style={styles.portalList} accessibilityRole="radiogroup">
          {PORTALS.map((option) => {
            const selected = portal === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => selectPortal(option.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.title}
                accessibilityHint={option.description}
                style={({ pressed }) => [
                  styles.portalCard,
                  selected && styles.portalCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.portalMarker, selected && styles.portalMarkerSelected]}>
                  <Text
                    style={[
                      styles.portalMarkerText,
                      selected && styles.portalMarkerTextSelected,
                    ]}
                  >
                    {selected ? '✓' : option.marker}
                  </Text>
                </View>
                <View style={styles.portalCopy}>
                  <Text style={styles.portalTitle}>{option.title}</Text>
                  <Text style={styles.portalDescription}>{option.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          disabled={!portal}
          onPress={() => router.push('/onboarding')}
          accessibilityRole="button"
          accessibilityLabel="Continue to onboarding"
          accessibilityState={{ disabled: !portal }}
          style={({ pressed }) => [
            styles.continueButton,
            portal ? styles.continueButtonEnabled : styles.continueButtonDisabled,
            pressed && portal && styles.pressed,
          ]}
        >
          <Text style={[styles.continueText, !portal && styles.continueTextDisabled]}>
            {portal ? 'Continue' : 'Choose a view to continue'}
          </Text>
        </Pressable>

        <Text style={styles.accountNote}>No account required</Text>
      </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { flexGrow: 1, paddingHorizontal: 22 },
    columns: { width: '100%' },
    desktopContent: { paddingHorizontal: 48, paddingTop: 32, paddingBottom: 40 },
    desktopColumns: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 64, paddingVertical: 48 },
    desktopHero: { flex: 1, minWidth: 0, paddingTop: 0 },
    desktopHeadline: { fontSize: 44, lineHeight: 52, maxWidth: 480 },
    desktopSelection: { flex: 1, minWidth: 0, paddingTop: 0 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    brandName: {
      ...font.extrabold,
      fontSize: fontSize.headline,
      color: colors.text,
      flexShrink: 1,
    },
    hero: { paddingTop: spacing.xxl },
    eyebrow: {
      ...font.extrabold,
      fontSize: fontSize.small,
      color: colors.accent,
      letterSpacing: 1,
    },
    headline: {
      ...font.extrabold,
      fontSize: fontSize.headline,
      lineHeight: 36,
      letterSpacing: -0.5,
      color: colors.text,
      paddingTop: 9,
      maxWidth: 410,
    },
    intro: {
      ...font.semibold,
      fontSize: fontSize.cardTitle,
      lineHeight: 23,
      color: colors.textSecondary,
      paddingTop: spacing.md,
      maxWidth: 410,
    },
    byline: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textMuted,
      paddingTop: spacing.xl,
    },
    bylineStrong: { ...font.extrabold, color: colors.text },
    selectionSection: { paddingTop: 32 },
    selectionTitle: { ...font.extrabold, fontSize: fontSize.xl, color: colors.text },
    selectionIntro: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: 21,
      color: colors.textSecondary,
      paddingTop: spacing.xs,
    },
    portalList: { gap: 10, paddingTop: spacing.xl },
    portalCard: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 22,
      borderCurve: 'continuous',
      paddingVertical: 12,
      paddingHorizontal: 14,
      boxShadow: colors.shadowSoft,
    },
    portalCardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.terraLight,
    },
    portalMarker: {
      width: 42,
      height: 42,
      borderRadius: radius.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.inputBg,
    },
    portalMarkerSelected: { backgroundColor: colors.accent },
    portalMarkerText: {
      ...font.extrabold,
      fontSize: fontSize.cardTitle,
      color: colors.textMuted,
    },
    portalMarkerTextSelected: { color: colors.onAccent },
    portalCopy: { flex: 1, minWidth: 0 },
    portalTitle: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    portalDescription: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 19,
      color: colors.textSecondary,
      paddingTop: 2,
    },
    continueButton: {
      minHeight: 54,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    continueButtonEnabled: { backgroundColor: colors.accent },
    continueButtonDisabled: { backgroundColor: colors.border },
    continueText: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.onAccent },
    continueTextDisabled: { color: colors.textMuted },
    accountNote: {
      ...font.semibold,
      fontSize: fontSize.body,
      color: colors.textMuted,
      textAlign: 'center',
      paddingTop: spacing.md,
    },
    pressed: { opacity: 0.72 },
  });
