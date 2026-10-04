import { usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { usePortal } from '@/context/PortalContext';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { layout, useTheme } from '@/theme';

/** Keep the navigator mounted in the same position when the window changes size. */
export function AppFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { portal, disclaimerAccepted } = usePortal();
  const { isDesktop, isTablet, hasNavigationRail } = useResponsiveLayout();
  const pathname = usePathname();
  const isWelcome = ['/', '/onboarding', '/notices'].includes(pathname);
  const desktopWelcome = isDesktop && isWelcome;
  const desktop = isDesktop && !!portal && disclaimerAccepted && !isWelcome;
  const rail = hasNavigationRail && !!portal && disclaimerAccepted && !isWelcome;
  const isWorkspace = ['/home', '/browse', '/a-z', '/safety', '/threads', '/about'].includes(pathname) ||
    pathname.startsWith('/substance/');
  const isForm = ['/account', '/auth', '/reset-password', '/feedback', '/threads/new'].includes(pathname);
  const maxWidth = desktopWelcome ? 1120 : desktop ? layout.desktopMaxWidth : rail ? undefined :
    isTablet && !isWelcome ? layout.tabletContentWidth : layout.maxContentWidth;

  return (
    <View style={[styles.gutter, { backgroundColor: colors.appBg }]}>
      <View testID="app-frame" style={[
        styles.frame, { maxWidth },
        Platform.OS === 'web' && !desktop && !rail && { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
      ]}>
        {desktop ? <DesktopSidebar /> : null}
        <View style={[
          styles.main,
          rail && { paddingLeft: insets.left, paddingBottom: insets.bottom },
          desktop && !isWorkspace && styles.readingGutter,
        ]}>
          <View testID="app-content" style={[
            styles.scene,
            desktop && !isWorkspace && styles.reading,
            desktop && isForm && styles.form,
          ]}>
            {children}
          </View>
        </View>
        {rail ? <DesktopSidebar compact /> : null}
      </View>
      {Platform.OS !== 'web' && !isWelcome && <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.floatingHeaderBg }}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { flex: 1, alignItems: 'center' },
  frame: { flex: 1, flexDirection: 'row', width: '100%' },
  main: { flex: 1, minWidth: 0, alignItems: 'center' },
  scene: { flex: 1, width: '100%', minWidth: 0 },
  readingGutter: { paddingHorizontal: 24 },
  reading: { maxWidth: layout.readingMaxWidth },
  form: { maxWidth: layout.formMaxWidth },
});
