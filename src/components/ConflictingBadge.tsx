import { StyleSheet, Text } from 'react-native';
import { font, fontSize, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * Terracotta "CONFLICTING" eyebrow flagging a substance whose published evidence
 * is mixed or contradictory. Rendered as a small uppercase, letter-spaced kicker
 * (mirrors the `h4` eyebrow on the detail screen) above the evidence dots on
 * Browse cards, and beside the evidence-type chips on the detail screen.
 */
export function ConflictingBadge() {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.text} accessibilityRole="text" accessibilityLabel="Conflicting evidence">
      Conflicting
    </Text>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    text: {
      ...font.semibold,
      fontSize: fontSize.micro,
      color: colors.safetyAvoid.fg,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
  });
