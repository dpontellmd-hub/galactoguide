import { Pressable, StyleSheet, Text } from 'react-native';
import { openExternal } from './ExternalLink';
import { font, fontSize, radius } from '@/theme';

interface Props {
  label: string;
  url: string;
  bg: string;
  fg: string;
}

/** Tappable chip that opens an external URL (with a trailing ↗). */
export function LinkChip({ label, url, bg, fg }: Props) {
  return (
    <Pressable
      onPress={() => openExternal(url)}
      style={[styles.chip, { backgroundColor: bg }]}
      accessibilityRole="link"
      accessibilityLabel={`${label}, opens in browser`}
    >
      <Text style={[styles.text, { color: fg }]}>{label} ↗</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  text: { ...font.semibold, fontSize: fontSize.small },
});
