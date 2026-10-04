import { useRouter } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { font, fontSize, layout, spacing, useThemedStyles, type ThemeColors } from '@/theme';
import { AccountButton } from './AccountButton';
import { useHeaderScroll } from './collapsing-scroll-view';

interface Props {
  title: string;
  showAccount?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

/** Shared title area for the app's primary tab screens. */
export function TabScreenHeader({ title, showAccount = true, children, style, titleStyle }: Props) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { isDesktop, hasSideNavigation } = useResponsiveLayout();
  const scroll = useHeaderScroll();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const scrollY = scroll?.scrollY;
  const titleBottom = scroll?.titleBottom;
  const enabled = scroll?.enabled;
  const expandedStyle = useAnimatedStyle(() => {
    if (!enabled || !scrollY || !titleBottom) return { opacity: 1 };
    const end = Math.max(32, titleBottom.get() - insets.top - 16);
    const progress = interpolate(scrollY.get(), [end - 40, end], [0, 1], Extrapolation.CLAMP);
    return { opacity: reducedMotion ? (progress >= 0.5 ? 0 : 1) : 1 - progress };
  });
  const headerY = useRef(0);
  const rowHeight = useRef(0);
  const measureTitle = () => scroll?.titleBottom.set(headerY.current + rowHeight.current);

  return (
    <View style={[styles.wrap, isDesktop && styles.desktopWrap, style]} onLayout={(event) => {
      headerY.current = event.nativeEvent.layout.y;
      measureTitle();
    }}>
      <Animated.View
        style={[styles.row, expandedStyle]}
        accessibilityElementsHidden={scroll?.compactVisible}
        aria-hidden={scroll?.compactVisible}
        importantForAccessibility={scroll?.compactVisible ? 'no-hide-descendants' : 'auto'}
        pointerEvents={scroll?.compactVisible ? 'none' : 'auto'}
        onLayout={(event) => {
        rowHeight.current = event.nativeEvent.layout.height;
        measureTitle();
      }}>
        <Text style={[styles.title, isDesktop && styles.desktopTitle, titleStyle]} accessibilityRole="header">
          {title}
        </Text>
        {showAccount && !hasSideNavigation && <AccountButton onPress={() => router.push('/account')} />}
      </Animated.View>
      {children ? <View style={styles.supporting}>{children}</View> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      marginBottom: layout.screenHeaderBottomSpacing,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    title: {
      ...font.extrabold,
      flex: 1,
      fontSize: fontSize.headline,
      lineHeight: 36,
      letterSpacing: -0.5,
      color: colors.text,
    },
    supporting: { gap: spacing.sm },
    desktopWrap: { marginBottom: 28, maxWidth: 800 },
    desktopTitle: { fontSize: 36, lineHeight: 44, letterSpacing: -0.8 },
  });
