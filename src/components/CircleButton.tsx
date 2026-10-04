import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  onPress: () => void;
  /** Accessibility label — required; these are icon-only buttons. */
  label: string;
  children: ReactNode;
  selected?: boolean;
}

/** 40px translucent circular button on the entry header band (back / save / share). */
export function CircleButton({ onPress, label, children, selected }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={4}
      style={[styles.button, { backgroundColor: colors.headerButtonBg }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
