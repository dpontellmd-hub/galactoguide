import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthForm } from '@/components/AuthForm';
import { FormScrollView } from '@/components/form-scroll-view';
import { EntryRow } from '@/components/EntryRow';
import { ListCard } from '@/components/ListCard';
import { useAuth } from '@/context/AuthContext';
import { usePortal } from '@/context/PortalContext';
import { useSituations } from '@/context/SituationsContext';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { getSubstanceById } from '@/data/repository';
import type { SubstanceWithKind } from '@/data/types';
import { situationOrder, situationSelectorLabels } from '@/lib/format';
import {
  font,
  fontSize,
  getPortalAccent,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  example?: SubstanceWithKind;
  exampleTone?: 'gogue' | 'fuge';
  /** Extra hint shown under an example card. */
  hint?: string;
  tools?: { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[];
  /** Render the (optional) situation selector for this step. */
  situationPicker?: boolean;
  /** Render the (optional) inline sign-in form for this step. */
  auth?: boolean;
}

const dyadWordmark = require('@/assets/images/dyad-health-collective.png');
const welcomeFlowers = require('@/assets/images/welcome-botanical-border.png');

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { portal, isMother } = usePortal();
  const { situations, toggleSituation } = useSituations();
  const { user, configured } = useAuth();
  const [step, setStep] = useState(0);
  const { colors, isDark } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const windowSize = useWindowDimensions();
  const [screenSize, setScreenSize] = useState<{ width: number; height: number } | null>(null);
  const { height, width } = screenSize ?? windowSize;
  const [welcomeCopyHeight, setWelcomeCopyHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(44);
  const [footerHeight, setFooterHeight] = useState(94);
  const fullFlowerHeight = width * (559 / 1024);
  const copySpace = height - insets.top - headerHeight - footerHeight
    - fullFlowerHeight - spacing.lg - spacing.xl;
  const compactWelcome = !isDesktop && copySpace < 300 * windowSize.fontScale;
  const wordmarkWidth = Math.min(isDesktop ? 300 : compactWelcome ? 200 : 260, Math.max(1, width - spacing.xxl * 2));
  const styles = useThemedStyles(makeStyles);

  if (!portal) return <Redirect href="/" />;

  const accent = getPortalAccent(portal, colors);
  const goDisclaimer = () => router.push('/notices');

  const moringa = getSubstanceById('moringa', 'gogue');
  const sage = getSubstanceById('sage', 'fuge');

  const steps: Step[] = [
    {
      icon: 'book-outline',
      title: 'Welcome to GalactoGuide',
      body: isMother
        ? 'A plain-language guide to what may increase or decrease your milk production.'
        : 'A concise, evidence-based reference on substances that may increase or decrease milk production.',
    },
    {
      icon: 'trending-up',
      title: 'Galactogogues — may increase milk production',
      body: isMother
        ? 'These may help boost your milk production. Each card shows the type, an evidence rating, and a quick summary.'
        : 'Substances that may increase milk production. Each card shows type, an evidence rating, and a summary.',
      example: moringa,
      exampleTone: 'gogue',
      hint: 'Filled dots = stronger evidence. Tap a card any time for mechanism, dosing, context considerations, and references.',
    },
    {
      icon: 'trending-down',
      title: 'Galactofuges — may decrease milk production',
      body: isMother
        ? 'Good to know about — some are used on purpose for weaning, others are worth avoiding if you want to maintain your milk production.'
        : 'Substances that may decrease milk production — some used intentionally for weaning, others relevant to counsel patients about.',
      example: sage,
      exampleTone: 'fuge',
    },
    {
      icon: 'apps-outline',
      title: 'Tools to help you',
      body: isMother
        ? 'Beyond browsing, the For you tab highlights entries that deserve extra attention for the situations you select.'
        : 'Beyond browsing, the For you tab organizes context-specific cautions for selected clinical situations.',
      tools: [
        { icon: 'search', label: 'Explore', desc: 'Browse or search every substance from Home.' },
        {
          icon: 'person-outline',
          label: 'For you',
          desc: isMother
            ? 'See what may need caution for your selected situations—and why.'
            : 'Prioritize context-specific cautions and the situations that drive them.',
        },
        {
          icon: 'chatbubbles-outline',
          label: 'Threads',
          desc: 'Ask questions, swap practical ideas, and connect with the community.',
        },
        { icon: 'library', label: 'Resources', desc: 'Trusted references and links.' },
      ],
    },
    {
      icon: 'person-outline',
      title: isMother ? 'Your situation' : 'Set the clinical context',
      body: isMother
        ? 'Optional — choose anything that applies. Your selections help explain cautions in For you and while you browse; they are not a complete safety evaluation or personalized recommendation.'
        : 'Optional — select relevant clinical situations to see context-specific cautions in For you and throughout the app. These organize considerations; they are not a complete lactation-safety evaluation or individualized recommendation.',
      situationPicker: true,
    },
    {
      icon: 'cloud-upload-outline',
      title: 'Save your bookmarks & preferences',
      body: isMother
        ? 'Optional — create an account or sign in to keep your saved substances and situation in sync across your devices. You can always do this later.'
        : 'Optional — sign in to sync your saved substances and selected situations across devices. You can do this later from settings.',
      auth: true,
    },
    {
      icon: 'heart-outline',
      title: "You're all set",
      body: isMother
        ? 'One quick step before you start — please review a few important notices about how to use GalactoGuide safely.'
        : 'One step before you start — please review a few important notices about appropriate use.',
    },
  ];

  // Drop the sign-in step entirely when Supabase isn't configured (avoids a dead slide).
  const visibleSteps = steps.filter((s) => !s.auth || configured);
  const total = visibleSteps.length;
  const isLast = step === total - 1;
  const current = visibleSteps[step];
  const isWelcome = step === 0;
  const hasDetail = !!(current.example || current.tools || current.situationPicker || current.auth);
  const welcomeBackground = isDark ? colors.surface : '#F7F5E8';
  // Give the artwork spare space before cropping it, including space that would
  // otherwise sit above the vertically centered introduction.
  const flowerSpace = height - insets.top - headerHeight - footerHeight
    - (welcomeCopyHeight || (compactWelcome ? 280 : 380)) - spacing.lg - spacing.xl;
  const flowerHeight = Math.min(fullFlowerHeight, Math.max(60, flowerSpace));
  const fadeFlowers = height < 600 && flowerHeight < fullFlowerHeight;

  const next = () => (isLast ? goDisclaimer() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <View
      onLayout={(event) => {
        const { width: screenWidth, height: screenHeight } = event.nativeEvent.layout;
        setScreenSize((previous) => previous?.width === screenWidth && previous.height === screenHeight
          ? previous : { width: screenWidth, height: screenHeight });
      }}
      style={[
        styles.root,
        { paddingTop: insets.top },
        isWelcome && { backgroundColor: welcomeBackground },
      ]}
    >
      {/* Header: step counter + Skip */}
      <View style={[styles.header, isDesktop && styles.desktopHeader]} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <Text style={styles.counter}>
          {step + 1} of {total}
        </Text>
        {!isLast && (
          <Pressable onPress={goDisclaimer} accessibilityRole="button" accessibilityLabel="Skip tour" hitSlop={8}>
            <Text style={[styles.skip, { color: accent.main }]}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FormScrollView
        contentContainerStyle={[
          styles.content,
          isWelcome && styles.welcomeContent,
          isDesktop && styles.desktopContent,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.slide, isDesktop && styles.desktopSlide]}>
        {isWelcome ? (
          <View style={[styles.welcomeCopy, isDesktop && styles.desktopWelcomeCopy]} onLayout={(event) => setWelcomeCopyHeight(event.nativeEvent.layout.height)}>
            <Text style={styles.welcomeEyebrow}>WELCOME TO</Text>
            <Text style={[styles.welcomeTitle, compactWelcome && { fontSize: 30, lineHeight: 36 }, isDesktop && styles.desktopWelcomeTitle]} accessibilityRole="header">GalactoGuide</Text>
            <Text style={styles.welcomeBy}>by</Text>
            <View
              style={[styles.dyadWordmark, { width: wordmarkWidth, height: wordmarkWidth * (323 / 1278) }]}
              accessible
              accessibilityRole="image"
              accessibilityLabel="The Dyad Health Collective"
            >
              <Image
                source={dyadWordmark}
                style={styles.dyadWordmarkSource}
                contentFit="contain"
                tintColor={colors.text}
                accessible={false}
              />
            </View>
            <Text style={[styles.body, styles.welcomeBody, compactWelcome && { marginTop: spacing.xxl }, isDesktop && styles.desktopWelcomeBody]}>{current.body}</Text>
            <Text style={styles.welcomeCredit}>
              Reviewed by Dr. Diana Pontell, MD, IBCLC
            </Text>
          </View>
        ) : (
          <View style={[styles.introduction, isDesktop && styles.desktopIntroduction, isDesktop && !hasDetail && styles.desktopClosing]}>
            <View style={[styles.iconCircle, { backgroundColor: accent.light }]}>
              <Ionicons name={current.icon} size={30} color={accent.main} />
            </View>
            <Text accessibilityRole="header" style={[styles.title, isDesktop && styles.desktopTitle, isDesktop && !hasDetail && styles.centeredText]}>{current.title}</Text>
            <Text style={[styles.body, isDesktop && styles.desktopBody, isDesktop && !hasDetail && styles.centeredText]}>{current.body}</Text>
          </View>
        )}

        {hasDetail && <View style={[styles.detail, isDesktop && styles.desktopDetail]}>
        {current.example && (
          <View style={styles.exampleWrap}>
            <View
              style={[
                styles.exampleTag,
                {
                  backgroundColor:
                    current.exampleTone === 'fuge' ? colors.typeSubstance.bg : colors.typeHerbal.bg,
                },
              ]}
            >
              <Text
                style={[
                  styles.exampleTagText,
                  {
                    color:
                      current.exampleTone === 'fuge' ? colors.typeSubstance.fg : colors.typeHerbal.fg,
                  },
                ]}
              >
                EXAMPLE
              </Text>
            </View>
            <ListCard>
              <EntryRow
                substance={current.example}
                onPress={() =>
                  router.push({
                    pathname: '/substance/[id]',
                    params: { id: current.example!.id, kind: current.example!.kind },
                  })
                }
              />
            </ListCard>
            {current.hint && <Text style={styles.hint}>{current.hint}</Text>}
          </View>
        )}

        {current.tools && (
          <View style={styles.tools}>
            {current.tools.map((t) => (
              <View key={t.label} style={styles.toolRow}>
                <View style={[styles.toolIcon, { backgroundColor: accent.light }]}>
                  <Ionicons name={t.icon} size={18} color={accent.main} />
                </View>
                <View style={styles.toolText}>
                  <Text style={styles.toolLabel}>{t.label}</Text>
                  <Text style={styles.toolDesc}>{t.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {current.situationPicker && (
          <View style={styles.sitRow}>
            {situationOrder.map((s) => {
              const active = situations.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggleSituation(s)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={situationSelectorLabels[s]}
                  accessibilityState={{ checked: active }}
                  style={[
                    styles.sitTag,
                    active && { backgroundColor: accent.main, borderColor: accent.main },
                  ]}
                >
                  <Text style={[styles.sitText, active && styles.sitTextActive]}>
                    {situationSelectorLabels[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {current.auth &&
          (user ? (
            <View style={[styles.signedIn, { borderColor: accent.main, backgroundColor: accent.light }]}>
              <Ionicons name="checkmark-circle" size={22} color={accent.main} />
              <View style={styles.signedInText}>
                <Text style={styles.signedInLabel}>Signed in</Text>
                {!!user.email && <Text style={styles.signedInEmail}>{user.email}</Text>}
              </View>
            </View>
          ) : (
            <AuthForm accent={accent.main} hideHeader style={styles.authForm} />
          ))}
        </View>}
        {isWelcome && isDesktop && (
          <View style={[styles.desktopArtwork, { height: Math.min(500, Math.max(320, height - 240)) }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Image source={welcomeFlowers} style={[StyleSheet.absoluteFill, isDark && styles.flowersDark]} contentFit="contain" accessible={false} />
          </View>
        )}
        </View>
      </FormScrollView>

      {isWelcome && !isDesktop && (
        <View
          testID="welcome-botanical-border"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.flowers, { height: flowerHeight }]}
        >
          <Image
            source={welcomeFlowers}
            style={[StyleSheet.absoluteFill, isDark && styles.flowersDark]}
            contentFit="cover"
            contentPosition="bottom"
            accessible={false}
          />
          {fadeFlowers && (
            <LinearGradient
              colors={[welcomeBackground, `${welcomeBackground}00`]}
              style={styles.flowersFade}
            />
          )}
        </View>
      )}

      {/* Footer: progress dots + nav */}
      <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)} style={[
        styles.footer,
        { paddingBottom: insets.bottom + spacing.lg },
        isWelcome && styles.welcomeFooter,
        isDesktop && styles.desktopFooter,
      ]}>
        <View style={[styles.dots, isDesktop && styles.desktopDots]}>
          {visibleSteps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step
                  ? { backgroundColor: accent.main, width: 18 }
                  : { backgroundColor: colors.borderStrong },
              ]}
            />
          ))}
        </View>
        <View style={[styles.navRow, isDesktop && styles.desktopNavRow]}>
          {step > 0 ? (
            <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Review disclaimer' : 'Next'}
            style={[styles.nextBtn, { backgroundColor: accent.main }]}
          >
            <Text style={styles.nextText}>{isLast ? 'Review disclaimer' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  counter: { ...font.semibold, fontSize: fontSize.small, color: colors.textMuted },
  skip: { ...font.semibold, fontSize: fontSize.base },
  content: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' },
  slide: { width: '100%', alignItems: 'center' },
  introduction: { width: '100%', alignItems: 'center' },
  detail: { width: '100%' },
  desktopHeader: { paddingHorizontal: 48, paddingVertical: 24 },
  desktopContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 48, paddingVertical: 40 },
  desktopSlide: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  desktopIntroduction: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  desktopClosing: { maxWidth: 680, alignItems: 'center', marginHorizontal: 'auto' },
  desktopTitle: { fontSize: 36, lineHeight: 44, textAlign: 'left' },
  desktopBody: { fontSize: 18, lineHeight: 28, textAlign: 'left', marginBottom: 0 },
  centeredText: { textAlign: 'center' },
  desktopDetail: { flex: 1, minWidth: 0, padding: 28, borderRadius: 24, backgroundColor: colors.appBg, borderWidth: 1, borderColor: colors.border },
  desktopWelcomeCopy: { flex: 1, minWidth: 0, maxWidth: '100%' },
  desktopWelcomeTitle: { fontSize: 48, lineHeight: 58 },
  desktopWelcomeBody: { fontSize: 20, lineHeight: 30, maxWidth: 440 },
  desktopArtwork: { flex: 1, minWidth: 0 },
  desktopFooter: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 48, paddingTop: 20 },
  desktopDots: { marginBottom: 0 },
  desktopNavRow: { width: 320 },
  welcomeContent: { flexGrow: 1, justifyContent: 'center' },
  welcomeCopy: { width: '100%', maxWidth: 400, alignItems: 'center' },
  welcomeEyebrow: {
    ...font.semibold, fontSize: fontSize.micro, letterSpacing: 2,
    color: colors.textMuted, marginBottom: spacing.xs,
  },
  welcomeTitle: { ...font.extrabold, fontSize: 34, lineHeight: 40, includeFontPadding: false, color: colors.text, textAlign: 'center' },
  // Optical spacing: the heading has more space below its glyphs than the
  // wordmark has above them, so use a smaller top margin around "by".
  welcomeBy: { ...font.regular, fontSize: fontSize.body, lineHeight: 18, includeFontPadding: false, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  // Use the same original lettering crop as About, without its adjacent flower.
  dyadWordmark: { overflow: 'hidden' },
  dyadWordmarkSource: { position: 'absolute', right: 0, width: `${(1500 / 1278) * 100}%`, height: '100%' },
  welcomeBody: { marginTop: 32, marginBottom: spacing.md, maxWidth: 340 },
  welcomeCredit: { ...font.regular, fontSize: fontSize.small, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  welcomeFooter: { borderTopWidth: 0, width: '100%', maxWidth: 440, alignSelf: 'center' },
  flowers: { width: '100%', overflow: 'hidden', flexShrink: 0 },
  flowersDark: { opacity: 0.65 },
  flowersFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 20 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...font.extrabold,
    fontSize: fontSize.hero,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...font.regular,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  exampleWrap: { alignSelf: 'stretch' },
  exampleTag: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  exampleTagText: { ...font.bold, fontSize: fontSize.micro, letterSpacing: 1 },
  hint: {
    ...font.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sitRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  sitTag: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
  },
  sitText: { ...font.regular, fontSize: fontSize.small, color: colors.textMuted },
  sitTextActive: { color: colors.onAccent },
  authForm: { alignSelf: 'stretch', marginTop: spacing.xs },
  signedIn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  signedInText: { flex: 1 },
  signedInLabel: { ...font.bold, fontSize: fontSize.base, color: colors.text },
  signedInEmail: { ...font.regular, fontSize: fontSize.small, color: colors.textSecondary, marginTop: 1 },
  tools: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xs },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toolIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  toolText: { flex: 1 },
  toolLabel: { ...font.semibold, fontSize: fontSize.base, color: colors.text },
  toolDesc: { ...font.regular, fontSize: fontSize.body, color: colors.textSecondary, lineHeight: 20, marginTop: 1 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  backBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.xl, minWidth: 80 },
  backText: { ...font.semibold, fontSize: fontSize.base, color: colors.textMuted },
  nextBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.xl, alignItems: 'center' },
  nextText: { ...font.bold, fontSize: fontSize.base, color: colors.onAccent },
});
