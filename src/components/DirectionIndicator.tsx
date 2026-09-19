import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Direction } from '@/data/types';
import { directionLabel } from '@/lib/format';
import { font, fontSize, useTheme } from '@/theme';

/** Solid ▲/▼ triangle, 9×8 base size (scale via `width`). */
export function DirectionTriangle({
  direction,
  color,
  width = 9,
}: {
  direction: 'raise' | 'lower';
  color: string;
  width?: number;
}) {
  return (
    <Svg width={width} height={(width * 8) / 9} viewBox="0 0 9 8">
      <Path d={direction === 'raise' ? 'M4.5 0 L9 8 H0 Z' : 'M4.5 8 L0 0 H9 Z'} fill={color} />
    </Svg>
  );
}

interface Props {
  direction: Direction;
  /** Overrides the default phrase. */
  label?: string;
}

/**
 * Direction line on list rows: ▲ "may increase milk production" (green), ▼ "may lower
 * milk production" (rust), or "— no effect on milk production" (neutral, no triangle).
 */
export function DirectionIndicator({ direction, label }: Props) {
  const { colors } = useTheme();
  const color =
    direction === 'raise'
      ? colors.directionGogue.header
      : direction === 'lower'
        ? colors.directionFuge.header
        : colors.directionNone;
  const text = label ?? directionLabel(direction);
  return (
    <View style={styles.row}>
      {direction !== 'none' && <DirectionTriangle direction={direction} color={color} />}
      <Text style={[styles.label, { color }]}>{direction === 'none' ? `— ${text}` : text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { ...font.bold, fontSize: fontSize.small, flexShrink: 1 },
});
