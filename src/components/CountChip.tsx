import { StyleSheet, Text } from 'react-native';
import { font, fontSize, radius, useTheme } from '@/theme';

interface Props {
  value: number;
}

/** Small count pill next to a section label (SAVED · 3). */
export function CountChip({ value }: Props) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.chip, { color: colors.textSecondary, backgroundColor: colors.countChipBg }]}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    ...font.extrabold,
    fontSize: fontSize.tiny,
    borderRadius: radius.round,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
});
