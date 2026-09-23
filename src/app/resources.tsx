import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openExternal } from '@/components/ExternalLink';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePortal } from '@/context/PortalContext';
import { getResources } from '@/data/repository';
import {
  font,
  fontSize,
  radius,
  spacing,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

export default function ResourcesScreen() {
  const { portal, isMother } = usePortal();
  const styles = useThemedStyles(makeStyles);
  const resources = getResources(portal ?? 'provider');
  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Resources" />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.intro}>
          <Text style={styles.introEyebrow}>TRUSTED PLACES TO GO NEXT</Text>
          <Text style={styles.introTitle} accessibilityRole="header">
            {isMother ? 'Resources for families' : 'Clinical references for providers'}
          </Text>
          <Text style={styles.introText}>
            {isMother
              ? 'Check a medication, find a specialist, or get support from organizations focused on pregnancy and breastfeeding.'
              : 'Reliable databases, guidelines, journals, and referral tools for lactation care.'}
          </Text>
        </View>

        <View style={styles.resourceList}>
          {resources.map((r) => (
            <View key={r.name} style={styles.card}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{r.tag}</Text>
              </View>
              <Text style={styles.name} accessibilityRole="header">
                {r.name}
              </Text>
              <Text style={styles.desc}>{r.desc}</Text>

              <View style={styles.links}>
                {r.links.map((l) => (
                  <Pressable
                    key={l.url}
                    onPress={() => openExternal(l.url)}
                    accessibilityRole="link"
                    accessibilityLabel={`${l.label}, opens in browser`}
                    style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
                  >
                    <Text style={styles.linkText}>{l.label}</Text>
                    <Text style={styles.linkArrow}>↗</Text>
                  </Pressable>
                ))}
                {r.phone && (
                  <View style={styles.phoneRow} accessibilityLabel={`Phone line ${r.phone}`}>
                    <View>
                      <Text style={styles.phoneLabel}>PHONE LINE</Text>
                      <Text style={styles.phoneNumber} selectable>
                        {r.phone}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          These links open independent websites. GalactoGuide does not control their content or
          availability.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: colors.appBg },
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },
    intro: {
      backgroundColor: colors.cream,
      borderRadius: 22,
      padding: 20,
      marginBottom: spacing.xl,
    },
    introEyebrow: {
      ...font.bold,
      fontSize: fontSize.micro,
      letterSpacing: 1.05,
      color: colors.brown,
      marginBottom: spacing.sm,
    },
    introTitle: {
      ...font.extrabold,
      fontSize: fontSize.hero,
      lineHeight: 30,
      letterSpacing: -0.25,
      color: colors.text,
    },
    introText: {
      ...font.regular,
      fontSize: 15,
      lineHeight: 23,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    resourceList: { gap: spacing.md },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 18,
    },
    tag: {
      alignSelf: 'flex-start',
      backgroundColor: colors.typePharma.bg,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 10,
    },
    tagText: { ...font.bold, fontSize: fontSize.tiny, color: colors.typePharma.fg },
    name: { ...font.extrabold, fontSize: fontSize.xl, lineHeight: 24, color: colors.text },
    desc: {
      ...font.regular,
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 23,
      marginTop: 7,
    },
    links: { gap: 8, marginTop: 16 },
    linkRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.terraLight,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    pressed: { opacity: 0.68 },
    linkText: { ...font.bold, fontSize: fontSize.base, lineHeight: 20, color: colors.brown, flex: 1 },
    linkArrow: { ...font.bold, fontSize: fontSize.lg, color: colors.brown },
    phoneRow: {
      minHeight: 52,
      justifyContent: 'center',
      borderRadius: radius.lg,
      backgroundColor: colors.phoneBg,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    phoneLabel: {
      ...font.bold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.phoneFg,
    },
    phoneNumber: { ...font.extrabold, fontSize: fontSize.lg, color: colors.phoneFg, marginTop: 2 },
    footerNote: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 20,
      textAlign: 'center',
      color: colors.textFaint,
      paddingHorizontal: 12,
      paddingTop: 20,
    },
  });
