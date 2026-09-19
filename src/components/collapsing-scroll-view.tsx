import { createContext, useContext, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { font, layout, useTheme } from '@/theme';
import { AccountButton } from './AccountButton';

const HeaderScrollContext = createContext<{
  scrollY: SharedValue<number>;
  titleBottom: SharedValue<number>;
  enabled: boolean;
  compactVisible: boolean;
} | null>(null);

export const useHeaderScroll = () => useContext(HeaderScrollContext);

/** Keeps the scroll view mounted across Fold resizing and preserves native refresh behavior. */
export function CollapsingScrollView({
  headerTitle, children, style, ...props
}: ScrollViewProps & { headerTitle: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isDesktop } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const scrollY = useSharedValue(0);
  const titleBottom = useSharedValue(120);
  const [showCompactTitle, setShowCompactTitle] = useState(false);
  const enabled = !isDesktop;
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(Math.max(0, event.contentOffset.y));
  });
  // Only cross to React when the title enters/leaves the bar, never on every frame.
  useAnimatedReaction(
    () => enabled && scrollY.get() > Math.max(0, titleBottom.get() - insets.top - 56),
    (visible, previous) => {
      if (visible !== previous) scheduleOnRN(setShowCompactTitle, visible);
    },
  );
  const compactStyle = useAnimatedStyle(() => {
    const end = Math.max(32, titleBottom.get() - insets.top - 16);
    const progress = interpolate(scrollY.get(), [end - 40, end], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: enabled ? (reducedMotion ? (progress >= 0.5 ? 1 : 0) : progress) : 0,
      transform: [{ translateY: reducedMotion ? 0 : (1 - progress) * -8 }],
    };
  });

  return (
    <HeaderScrollContext.Provider value={{ scrollY, titleBottom, enabled, compactVisible: enabled && showCompactTitle }}>
      <View style={[styles.root, { backgroundColor: colors.appBg }]}>
        <Animated.ScrollView
          {...props}
          style={style}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ top: enabled ? insets.top + 56 : 0 }}
        >
          {children}
        </Animated.ScrollView>
        {enabled && <>
          <Animated.View
            testID="compact-page-header"
            pointerEvents={showCompactTitle ? 'auto' : 'none'}
            accessibilityElementsHidden={!showCompactTitle}
            aria-hidden={!showCompactTitle}
            importantForAccessibility={showCompactTitle ? 'auto' : 'no-hide-descendants'}
            style={[
              styles.compact,
              { paddingTop: insets.top, backgroundColor: colors.floatingHeaderBg, borderColor: colors.border },
              compactStyle,
            ]}
          >
            <View style={styles.titleRow}>
              {showCompactTitle && <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
                accessibilityRole="header"
              >{headerTitle}</Text>}
              {showCompactTitle && <AccountButton onPress={() => router.push('/account')} />}
            </View>
          </Animated.View>
          {/* An opaque safe-area cap prevents content showing through the system icons. */}
          <View pointerEvents="none" style={[
            styles.statusBar, { height: insets.top, backgroundColor: colors.floatingHeaderBg },
          ]} />
        </>}
      </View>
    </HeaderScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  compact: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 3px 10px rgba(40, 25, 18, 0.08)',
  },
  titleRow: {
    height: 56, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
  title: { ...font.extrabold, flex: 1, fontSize: 17, lineHeight: 21, letterSpacing: -0.2 },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11 },
});
