import { StyleSheet, Text, View } from 'react-native';
import type { SafetyMap, Situation } from '@/data/types';
import { safetyChipColors, safetyValueLabel, situationOrder } from '@/lib/format';
import { font, fontSize, radius, useTheme, type ThemeColors } from '@/theme';

interface Props {
  safety: SafetyMap;
  /** Label map: short labels for detail, long labels for the safety checker. */
  labels: Record<Situation, string>;
}

/** Compact, text-forward safety profile for the fixed clinical situations. */
export function SafetyTags({ safety, labels }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.list}>
      {situationOrder.map((sit) => {
        const level = safety[sit];
        const c = safetyChipColors(level, colors);
        const rating = safetyValueLabel(level);

        return (
          <View
            key={sit}
            style={[styles.row, sit !== situationOrder[0] && styles.rowBorder]}
            accessible
            accessibilityLabel={`${labels[sit]}, ${rating}`}
          >
            <View style={styles.situation}>
              <Text selectable style={styles.name}>
                {labels[sit]}
              </Text>
            </View>
            <Text selectable style={[styles.rating, { color: c.fg }]}>
              {rating}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: {
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
    },
    row: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    situation: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      ...font.semibold,
      flexShrink: 1,
      fontSize: fontSize.body,
      color: colors.text,
    },
    rating: {
      ...font.bold,
      flexShrink: 0,
      fontSize: fontSize.small,
      textAlign: 'right',
      textTransform: 'capitalize',
    },
  });
