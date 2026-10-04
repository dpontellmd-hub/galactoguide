import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font, fontSize, useTheme } from '@/theme';

interface Props {
  children: string;
  /** Right-aligned slot ("edit" link, "how we grade"). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Uppercase letter-spaced section label ("SAVED", "EVIDENCE", "GOOD TO KNOW"). */
export function SectionLabel({ children, right, style }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    ...font.extrabold,
    fontSize: fontSize.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
