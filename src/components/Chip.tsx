import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { font, fontSize, radius } from '@/theme';

interface Props {
  label: string;
  bg: string;
  fg: string;
  style?: ViewStyle;
}

/** Small colored pill used for type chips, safety tags, and badges. */
export function Chip({ label, bg, fg, style }: Props) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.round,
    alignSelf: 'flex-start',
  },
  text: { ...font.semibold, fontSize: fontSize.micro },
});
