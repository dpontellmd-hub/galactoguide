import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { openExternal } from '@/components/ExternalLink';
import type { EssentialExample } from '@/data/essentials';
import { font, fontSize, spacing, useThemedStyles, type ThemeColors } from '@/theme';

interface Props {
  example: EssentialExample;
}

export function EssentialExampleBlock({ example }: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      <Image
        source={example.image}
        style={styles.image}
        contentFit="cover"
        transition={180}
        alt={example.imageAlt}
      />
      <Text style={styles.photoNote}>Illustrative category photo</Text>

      <Text style={styles.label}>Example to compare</Text>
      <Text style={styles.name}>{example.name}</Text>
      <Text style={styles.context}>{example.context}</Text>

      <View style={styles.reasons}>
        {example.reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <Text style={styles.reasonBullet}>•</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => openExternal(example.url)}
        accessibilityRole="link"
        accessibilityLabel={`${example.linkLabel}, opens in browser`}
        style={({ pressed }) => [styles.shopLink, pressed && styles.pressed]}
      >
        <Text style={styles.shopLinkText}>{example.linkLabel}</Text>
        <Text style={styles.shopLinkArrow}>↗</Text>
      </Pressable>
      <Text style={styles.disclosure}>Non-affiliate link. Check current price and compatibility.</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginTop: spacing.xxl },
    image: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: 18,
      borderCurve: 'continuous',
      backgroundColor: colors.cream,
    },
    photoNote: {
      ...font.regular,
      fontSize: fontSize.micro,
      lineHeight: 17,
      color: colors.textFaint,
      marginTop: 6,
    },
    label: {
      ...font.extrabold,
      fontSize: fontSize.small,
      lineHeight: 18,
      color: colors.accent,
      marginTop: 14,
    },
    name: {
      ...font.extrabold,
      fontSize: fontSize.xl,
      lineHeight: 25,
      color: colors.text,
      marginTop: 3,
    },
    context: {
      ...font.regular,
      fontSize: fontSize.body,
      lineHeight: 21,
      color: colors.textSecondary,
      marginTop: 5,
    },
    reasons: { gap: 7, marginTop: 12 },
    reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
    reasonBullet: { ...font.semibold, fontSize: fontSize.body, lineHeight: 20, color: colors.textSecondary },
    reasonText: {
      ...font.semibold,
      flex: 1,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    shopLink: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderRadius: 14,
      borderCurve: 'continuous',
      backgroundColor: colors.brandNavy,
      paddingHorizontal: 15,
      paddingVertical: 12,
      marginTop: 15,
    },
    pressed: { opacity: 0.72 },
    shopLinkText: {
      ...font.extrabold,
      flex: 1,
      fontSize: fontSize.base,
      lineHeight: 21,
      color: colors.textOnDark,
    },
    shopLinkArrow: { ...font.bold, fontSize: fontSize.lg, color: colors.caramel },
    disclosure: {
      ...font.regular,
      fontSize: fontSize.micro,
      lineHeight: 17,
      color: colors.textFaint,
      marginTop: 7,
    },
  });
