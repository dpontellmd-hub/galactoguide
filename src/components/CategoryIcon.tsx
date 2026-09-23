import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { SubstanceType } from '@/data/types';
import { typeChipColors } from '@/lib/format';
import { radius, useTheme } from '@/theme';

// 24×24 category marks from the design file: leaf, capsule, apple, droplet.
// Each has a filled body (`d`) and an optional second detail path (`d2`) drawn
// either in the surrounding background color (a cut-out vein/divider) or in the
// category foreground color (the apple stem).
const ICONS: Record<SubstanceType, { d: string; d2: string; d2on: 'bg' | 'fg' }> = {
  herbal: {
    d: 'M19.2 4.8 C11.5 5.2 6.8 9.8 5.2 19 C14.4 17.4 19 12.7 19.2 4.8 Z',
    d2: 'M6 18 C10 13 14 9 18.5 5.5',
    d2on: 'bg',
  },
  pharma: {
    d: 'M6.2 13.2 L13.2 6.2 A3.2 3.2 0 0 1 17.8 10.8 L10.8 17.8 A3.2 3.2 0 0 1 6.2 13.2 Z',
    d2: 'M9.7 9.7 L14.3 14.3',
    d2on: 'bg',
  },
  food: {
    d: 'M12 7.2 C8.2 7.2 5.8 10.2 6.7 14 C7.5 17.4 9.6 19.8 12 19.8 C14.4 19.8 16.5 17.4 17.3 14 C18.2 10.2 15.8 7.2 12 7.2 Z',
    d2: 'M12 7 C12.2 5.2 13.2 4.2 15 3.8',
    d2on: 'fg',
  },
  substance: {
    d: 'M12 3.2 C12 3.2 6.2 10.6 6.2 14.6 C6.2 17.9 8.8 20.4 12 20.4 C15.2 20.4 17.8 17.9 17.8 14.6 C17.8 10.6 12 3.2 12 3.2 Z',
    d2: '',
    d2on: 'fg',
  },
};

interface Props {
  type: SubstanceType;
  /** Icon size in px (the glyph itself, not the box). */
  size?: number;
  /** Wrap in a 27×27 tinted rounded square (Browse rows). */
  boxed?: boolean;
}

/** Category mark (leaf/capsule/apple/droplet) tinted per substance type. */
export function CategoryIcon({ type, size = 15, boxed = false }: Props) {
  const { colors } = useTheme();
  const icon = ICONS[type];
  const tint = typeChipColors(type, colors);
  const detailStroke = icon.d2on === 'bg' ? (boxed ? tint.bg : colors.surface) : tint.fg;
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={icon.d} fill={tint.fg} />
      {icon.d2 ? (
        <Path
          d={icon.d2}
          fill="none"
          stroke={detailStroke}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
  if (!boxed) return svg;
  return <View style={[styles.box, { backgroundColor: tint.bg }]}>{svg}</View>;
}

const styles = StyleSheet.create({
  box: {
    width: 27,
    height: 27,
    borderRadius: radius.iconBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
