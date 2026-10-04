import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** White list container: 24px radius, 1.5px border, clipped rows. */
export function ListCard({ children, style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 24, overflow: 'hidden' },
});
