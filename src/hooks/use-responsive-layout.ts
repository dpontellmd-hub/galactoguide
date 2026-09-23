import { Platform, useWindowDimensions } from 'react-native';
import { layout } from '@/theme';
import { getNavigationLayout } from '@/lib/navigation-layout';

/** Respond to the available window, including browser resizing and split-screen. */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const navigation = getNavigationLayout(width, height, Platform.OS);
  return {
    ...navigation,
    isTablet: width >= layout.tabletBreakpoint,
    hasSupportingColumn: navigation.isDesktop && width >= layout.columnsBreakpoint,
  };
}
