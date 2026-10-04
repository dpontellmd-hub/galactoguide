import { Pressable, StyleSheet, Text } from 'react-native';
import type { SubstanceType } from '@/data/types';
import { categoryTitle, typeChipColors } from '@/lib/format';
import { font, fontSize, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

interface Props {
  type: SubstanceType;
  count: number;
  onPress: () => void;
}

/**
 * Browse-grid category card. Tinted per category; the "Other substances"
 * card is white with a border per the design's fourth cell.
 */
export function CategoryCard({ type, count, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const chip = typeChipColors(type, colors);
  const plain = type === 'substance';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${categoryTitle(type)}, ${count} entries`}
      style={[
        styles.card,
        plain
          ? { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }
          : { backgroundColor: chip.bg },
      ]}
    >
      <Text style={styles.title}>{categoryTitle(type)}</Text>
      <Text style={[styles.count, { color: chip.fg }]}>{count} entries →</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 22,
      paddingVertical: 14,
      paddingHorizontal: 16,
      minHeight: 84,
      justifyContent: 'space-between',
    },
    title: { ...font.extrabold, fontSize: fontSize.cardTitle, lineHeight: 19.5, color: colors.text },
    count: { ...font.extrabold, fontSize: fontSize.small, marginTop: 8 },
  });
