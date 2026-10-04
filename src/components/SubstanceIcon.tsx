import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { SubstanceWithKind } from '@/data/types';
import { substanceIcon, substanceIconColors } from '@/lib/format';
import { useTheme } from '@/theme';

/**
 * The tinted identity circle at the left of list rows: gogue green or fuge
 * blush/rust with the substance's type glyph. Decorative — the row's
 * accessibility label already names the type and direction.
 */
export function SubstanceIcon({ substance }: { substance: SubstanceWithKind }) {
  const { colors } = useTheme();
  const c = substanceIconColors(substance, colors);
  return (
    <View style={[styles.circle, { backgroundColor: c.bg }]}>
      <Ionicons name={substanceIcon(substance)} size={15} color={c.fg} />
    </View>
  );
}

export const SUBSTANCE_ICON_SIZE = 30;

const styles = StyleSheet.create({
  circle: {
    width: SUBSTANCE_ICON_SIZE,
    height: SUBSTANCE_ICON_SIZE,
    borderRadius: SUBSTANCE_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
