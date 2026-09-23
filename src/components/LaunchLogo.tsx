import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const logo = require('@/assets/images/logo-original-refined-small.png');
const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

// Shared by Welcome and Home for this JS session only. A cold launch resets it;
// navigating back, switching portals, and resuming the app do not replay it.
let launchLogoPlayed = false;

export function LaunchLogo({ size = 56 }: { size?: number }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [imageReady, setImageReady] = useState(false);
  const opacity = useSharedValue(launchLogoPlayed || reducedMotion ? 1 : 0);
  const scale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      if (!imageReady) return;

      if (!launchLogoPlayed && !reducedMotion) {
        launchLogoPlayed = true;
        opacity.set(0);
        scale.set(0.94);
        opacity.set(withTiming(1, {
          duration: 450, easing: easeOut, reduceMotion: ReduceMotion.System,
        }));
        scale.set(withTiming(1, {
          duration: 650, easing: easeOut, reduceMotion: ReduceMotion.System,
        }));
      } else {
        launchLogoPlayed = true;
        opacity.set(1);
        scale.set(1);
      }

      return () => {
        cancelAnimation(opacity);
        cancelAnimation(scale);
        opacity.set(1);
        scale.set(1);
      };
    }, [imageReady, opacity, reducedMotion, scale]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="GalactoGuide flower logo"
      style={[styles.container, { width: size * 0.7, height: size }]}
    >
      <Animated.View testID="launch-logo-mark" style={[styles.mark, animatedStyle]}>
        <Image
          source={logo}
          style={styles.image}
          contentFit="contain"
          tintColor={colors.accent}
          accessible={false}
          transition={0}
          onDisplay={() => setImageReady(true)}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mark: { width: '100%', height: '100%' },
  image: { width: '100%', height: '100%' },
});
