import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';

interface Props {
  color?: string;
}

/** 8×14 right-pointing list-row chevron. */
export function Chevron({ color }: Props) {
  const { colors } = useTheme();
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14">
      <Path
        d="M1 1l6 6-6 6"
        stroke={color ?? colors.chevron}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
