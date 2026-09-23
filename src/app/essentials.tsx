import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EssentialExampleBlock } from '@/components/essential-example';
import { openExternal } from '@/components/ExternalLink';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ESSENTIAL_GUIDES } from '@/data/essentials';
import {
  font,
  fontSize,
  layout,
  spacing,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

export default function EssentialsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [backToTopVisibility] = useState(() => new Animated.Value(0));
  const scrollRef = useRef<ScrollView>(null);
  const guideListOffset = useRef(0);
  const guideOffsets = useRef<Record<string, number>>({});
  const editorialOffset = useRef(0);

  useEffect(() => {
    Animated.timing(backToTopVisibility, {
      toValue: showBackToTop ? 1 : 0,
      duration: 160,
      useNativeDriver: process.env.EXPO_OS !== 'web',
    }).start();
  }, [backToTopVisibility, showBackToTop]);

  const jumpTo = (section: string) => {
    const y =
      section === 'how-we-choose'
        ? editorialOffset.current
        : guideListOffset.current + (guideOffsets.current[section] ?? 0);

    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Trusted Essentials" />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        onScroll={(event) => setShowBackToTop(event.nativeEvent.contentOffset.y > 640)}
        scrollEventThrottle={32}
      >
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Simple guidance on what may be useful, what to check first, and what you may not need.
          </Text>
          <Text style={styles.introNote}>
            No sponsored rankings. Example shopping links are non-affiliate.
          </Text>

          <View style={styles.toc}>
            <Text style={styles.tocTitle}>On this page</Text>
            <View style={styles.tocLinks}>
              {[
                ...ESSENTIAL_GUIDES.map((guide) => ({ id: guide.slug, title: guide.title })),
                { id: 'how-we-choose', title: 'How we choose' },
              ].map((section) => (
                <Pressable
                  key={section.id}
                  onPress={() => jumpTo(section.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${section.title}`}
                  accessibilityHint="Scrolls to this section on the current page"
                  style={({ pressed }) => [styles.tocLink, pressed && styles.pressed]}
                >
                  <Text style={styles.tocLinkText}>{section.title}</Text>
                  <Text style={styles.tocArrow}>↓</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View
          style={styles.guideList}
          onLayout={(event) => {
            guideListOffset.current = event.nativeEvent.layout.y;
          }}
        >
          {ESSENTIAL_GUIDES.map((guide) => (
            <View
              key={guide.slug}
              style={styles.guide}
              onLayout={(event) => {
                guideOffsets.current[guide.slug] = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.guideHeading}>
                <View style={styles.guideRule} />
                <Text style={styles.guideTitle} accessibilityRole="header">
                  {guide.title}
                </Text>
                <Text style={styles.summary}>{guide.summary}</Text>
                <Text style={styles.principle}>{guide.principle}</Text>
              </View>

              <View style={styles.decisionList}>
                {guide.decisions.map((decision) => (
                  <View key={decision.label} style={styles.decisionRow}>
                    <Text style={styles.decisionText}>
                      <Text style={styles.decisionLabel}>{decision.label}: </Text>
                      {decision.text}
                    </Text>
                  </View>
                ))}
              </View>

              <EssentialExampleBlock example={guide.example} />

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  What to consider
                </Text>
                <Text style={styles.sectionIntro}>
                  Product categories and selection criteria—not sponsored picks.
                </Text>
                <View style={styles.itemList}>
                  {guide.items.map((item) => (
                    <View key={item.name} style={styles.item}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemRole}>{item.role}</Text>
                      <Text style={styles.itemDetail}>
                        <Text style={styles.itemDetailLabel}>Look for: </Text>
                        {item.lookFor.join('; ')}.
                      </Text>
                      <Text style={styles.itemDetail}>
                        <Text style={styles.itemDetailLabel}>You may not need it if: </Text>
                        {item.skip}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Before you buy
                </Text>
                <View style={styles.bulletList}>
                  {guide.noPurchase.map((point) => (
                    <View key={point} style={styles.bulletRow}>
                      <Text style={styles.bulletMarker}>•</Text>
                      <Text style={styles.bulletText}>{point}</Text>
                    </View>
                  ))}
                </View>

                {guide.careNote && (
                  <View style={styles.careNote}>
                    <Text style={styles.careText}>{guide.careNote}</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Primary guidance
                </Text>
                <View style={styles.sourceList}>
                  {guide.sources.map((source) => (
                    <Pressable
                      key={source.url}
                      onPress={() => openExternal(source.url)}
                      accessibilityRole="link"
                      accessibilityLabel={`${source.label}, opens in browser`}
                      style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}
                    >
                      <Text style={styles.sourceText}>{source.label}</Text>
                      <Text style={styles.sourceArrow}>↗</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View
          style={styles.editorial}
          onLayout={(event) => {
            editorialOffset.current = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.editorialTitle} accessibilityRole="header">
            How we choose
          </Text>
          <Text style={styles.editorialText}>
            The criteria come before the product. We start with the decision, review safety and
            compatibility, include lower-cost and no-purchase paths, and keep clinical content
            separate from commerce. Brands cannot pay for inclusion, order, or editorial control.
          </Text>
          <Text style={styles.editorialStatus}>Draft criteria · August 2026</Text>
        </View>

        <Text style={styles.footer}>
          General education only. Product fit and feeding needs can change; individual guidance
          belongs with your clinician or IBCLC.
        </Text>
      </ScrollView>

      <Animated.View
        accessibilityElementsHidden={!showBackToTop}
        importantForAccessibility={showBackToTop ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.backToTopWrap,
          {
            bottom: Math.max(insets.bottom + spacing.lg, spacing.xxl),
            opacity: backToTopVisibility,
            pointerEvents: showBackToTop ? 'auto' : 'none',
            transform: [
              {
                translateY: backToTopVisibility.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          accessibilityRole="button"
          accessibilityLabel="Back to top"
          accessibilityHint="Scrolls to the page introduction and contents list"
          disabled={!showBackToTop}
          hitSlop={6}
          style={({ pressed }) => [styles.backToTop, pressed && styles.backToTopPressed]}
        >
          <Text style={styles.backToTopArrow}>↑</Text>
          <Text style={styles.backToTopText}>Back to top</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: layout.screenPaddingHorizontal,
      paddingBottom: 104,
    },
    intro: { paddingBottom: spacing.xxl },
    introText: {
      ...font.regular,
      fontSize: fontSize.lg,
      lineHeight: 25,
      color: colors.textSecondary,
    },
    introNote: {
      ...font.bold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.accent,
      marginTop: spacing.sm,
    },
    toc: { marginTop: spacing.xxl },
    tocTitle: {
      ...font.extrabold,
      fontSize: fontSize.cardTitle,
      lineHeight: 22,
      color: colors.text,
      marginBottom: 5,
    },
    tocLinks: { borderTopWidth: 1, borderTopColor: colors.divider },
    tocLink: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingVertical: 10,
    },
    tocLinkText: {
      ...font.bold,
      flex: 1,
      fontSize: fontSize.base,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    tocArrow: { ...font.extrabold, fontSize: fontSize.lg, color: colors.accent },
    guideList: { gap: spacing.xxl },
    guide: {
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 24,
      borderCurve: 'continuous',
      boxShadow: colors.shadowSoft,
    },
    guideHeading: { paddingBottom: spacing.xs },
    guideRule: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
      marginBottom: spacing.md,
    },
    guideTitle: {
      ...font.extrabold,
      fontSize: fontSize.hero,
      lineHeight: 30,
      color: colors.text,
    },
    summary: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: 23,
      color: colors.textSecondary,
      marginTop: 6,
    },
    principle: {
      ...font.bold,
      fontSize: fontSize.base,
      lineHeight: 22,
      color: colors.accent,
      marginTop: 9,
    },
    decisionList: { gap: 11, marginTop: spacing.xl },
    decisionRow: { flexDirection: 'row', alignItems: 'flex-start' },
    decisionText: {
      ...font.regular,
      flex: 1,
      fontSize: fontSize.body,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    decisionLabel: { ...font.extrabold, color: colors.text },
    sectionTitle: {
      ...font.extrabold,
      fontSize: fontSize.cardTitle,
      lineHeight: 22,
      color: colors.text,
    },
    sectionBlock: {
      borderTopWidth: 1.5,
      borderTopColor: colors.borderStrong,
      paddingTop: spacing.xl,
      marginTop: spacing.xxl,
    },
    sectionIntro: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textFaint,
      marginTop: 3,
    },
    itemList: { marginTop: 9 },
    item: {
      paddingVertical: 15,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    itemName: {
      ...font.extrabold,
      fontSize: fontSize.lg,
      lineHeight: 23,
      color: colors.text,
    },
    itemRole: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 21,
      color: colors.textSecondary,
      marginTop: 4,
    },
    itemDetail: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 21,
      color: colors.textSecondary,
      marginTop: 8,
    },
    itemDetailLabel: { ...font.bold, color: colors.text },
    bulletList: { gap: 9, marginTop: 10 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bulletMarker: { ...font.regular, fontSize: fontSize.body, lineHeight: 21, color: colors.textSecondary },
    bulletText: {
      ...font.regular,
      flex: 1,
      fontSize: fontSize.body,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    careNote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.noteCaution.dot,
      paddingLeft: spacing.md,
      marginTop: spacing.xl,
    },
    careText: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    sourceList: { marginTop: 5 },
    sourceLink: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 8,
    },
    pressed: { opacity: 0.58 },
    backToTopWrap: {
      position: 'absolute',
      right: layout.screenPaddingHorizontal,
      zIndex: 10,
    },
    backToTop: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.brandNavy,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: 24,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      boxShadow: colors.shadowCard,
    },
    backToTopPressed: { opacity: 0.76 },
    backToTopArrow: {
      ...font.extrabold,
      fontSize: fontSize.lg,
      lineHeight: 20,
      color: colors.caramel,
    },
    backToTopText: {
      ...font.extrabold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textOnDark,
    },
    sourceText: {
      ...font.bold,
      flex: 1,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    sourceArrow: { ...font.bold, fontSize: fontSize.base, color: colors.accent },
    editorial: {
      padding: spacing.xl,
      backgroundColor: colors.cream,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: 24,
      borderCurve: 'continuous',
      marginTop: spacing.xxl,
    },
    editorialTitle: {
      ...font.extrabold,
      fontSize: fontSize.hero,
      lineHeight: 30,
      color: colors.text,
    },
    editorialText: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: 23,
      color: colors.textSecondary,
      marginTop: 8,
    },
    editorialStatus: {
      ...font.bold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textFaint,
      marginTop: 10,
    },
    footer: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textFaint,
      textAlign: 'center',
      paddingHorizontal: 8,
      paddingTop: spacing.xxl,
    },
  });
