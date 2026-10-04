import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';

export type TabIconName = 'home' | 'browse' | 'guide' | 'threads' | 'about';

interface Props {
  name: TabIconName;
  color: string;
  size?: number;
}

/** Custom tab glyphs from the handoff design (22×22 filled shapes). */
export function TabIcon({ name, color, size = 22 }: Props) {
  const { colors } = useTheme();
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path d="M3 10 L11 3 L19 10 V19 H13 V14 H9 V19 H3 Z" fill={color} />
        </Svg>
      );
    case 'browse':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Rect x={3} y={3} width={7} height={7} rx={2.5} fill={color} />
          <Rect x={12} y={3} width={7} height={7} rx={2.5} fill={color} />
          <Rect x={3} y={12} width={7} height={7} rx={2.5} fill={color} />
          <Rect x={12} y={12} width={7} height={7} rx={2.5} fill={color} />
        </Svg>
      );
    case 'guide':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Circle cx={11} cy={6.5} r={4} fill={color} />
          <Path
            d="M3 19 C3 14.6 6.6 12 11 12 C15.4 12 19 14.6 19 19 V20 H3 Z"
            fill={color}
          />
        </Svg>
      );
    case 'threads':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Path
            d="M5.5 4.5 H16.5 A3.5 3.5 0 0 1 20 8 V12 A3.5 3.5 0 0 1 16.5 15.5 H11 L7 19 V15.5 H5.5 A3.5 3.5 0 0 1 2 12 V8 A3.5 3.5 0 0 1 5.5 4.5 Z"
            fill={color}
          />
          <Circle cx={7} cy={10} r={1.1} fill={colors.tabBarBg} />
          <Circle cx={11} cy={10} r={1.1} fill={colors.tabBarBg} />
          <Circle cx={15} cy={10} r={1.1} fill={colors.tabBarBg} />
        </Svg>
      );
    case 'about':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22">
          <Circle cx={11} cy={11} r={8.5} fill={color} />
          <Rect x={10} y={9.5} width={2} height={6.5} rx={1} fill={colors.tabBarBg} />
          <Circle cx={11} cy={6.6} r={1.3} fill={colors.tabBarBg} />
        </Svg>
      );
  }
}
