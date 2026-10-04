import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import {
  font,
  fontSize,
  layout,
  spacing,
  useThemedStyles,
  useTheme,
  type ThemeColors,
} from '@/theme';

interface Props {
  title: string;
  /** Opt-in wrapping for longer route titles; short headers stay single-line by default. */
  multilineTitle?: boolean;
  onBack?: () => void;
}

/** Back-button header for pushed screens (safety, resources, feedback, A–Z). */
export function ScreenHeader({ title, multilineTitle = false, onBack }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { isDesktop } = useResponsiveLayout();
  return (
    <View style={[
      styles.row,
      { paddingTop: insets.top + (isDesktop ? 40 : layout.screenHeaderTopSpacing) },
      isDesktop && styles.desktopRow,
    ]}>
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={6}
        style={styles.back}
      >
        <Svg width={9} height={16} viewBox="0 0 9 16">
          <Path
            d="M8 1L2 8l6 7"
            stroke={colors.textSecondary}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>
      <Text
        style={[styles.title, isDesktop && styles.desktopTitle]}
        numberOfLines={multilineTitle || isDesktop ? undefined : 1}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {!multilineTitle && !isDesktop && <View style={styles.spacer} />}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.floatingHeaderBg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: layout.screenPaddingHorizontal,
      paddingBottom: layout.screenHeaderBottomSpacing,
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...font.extrabold, fontSize: fontSize.xl, color: colors.text, flex: 1 },
    desktopRow: { paddingBottom: 28, gap: 16 },
    desktopTitle: { fontSize: 32, lineHeight: 39, letterSpacing: -0.6 },
    spacer: { width: 40 },
  });
