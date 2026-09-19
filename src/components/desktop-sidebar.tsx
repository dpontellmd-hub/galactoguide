import { Image } from 'expo-image';
import { Host, Switch } from '@expo/ui';
import { Link, usePathname, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { TabIcon, type TabIconName } from '@/components/TabIcon';
import { useAuth } from '@/context/AuthContext';
import { usePortal } from '@/context/PortalContext';
import { font, fontSize, layout, useThemedStyles, useTheme, type ThemeColors } from '@/theme';

const destinations: { label: string; href: Href; path: string; icon: TabIconName }[] = [
  { label: 'Home', href: '/(tabs)/home', path: '/home', icon: 'home' },
  { label: 'For you', href: '/(tabs)/safety', path: '/safety', icon: 'guide' },
  { label: 'Threads', href: '/(tabs)/threads', path: '/threads', icon: 'threads' },
  { label: 'About', href: '/(tabs)/about', path: '/about', icon: 'about' },
];

function NavigationLink({ label, href, icon, active, compact = false }: {
  label: string; href: Href; icon?: TabIconName; active: boolean; compact?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const color = active ? colors.brown : colors.textSecondary;

  return (
    <Link href={href} asChild aria-current={active ? 'page' : undefined}>
      <Pressable
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={StyleSheet.flatten([
          styles.link,
          compact && styles.railLink,
          hovered && styles.hovered,
          active && styles.active,
          focused && { boxShadow: colors.focusRing, borderColor: colors.accent },
          pressed && styles.pressed,
        ])}
      >
        {icon ? <TabIcon name={icon} color={color} size={21} /> : (
          <Svg width={21} height={21} viewBox="0 0 24 24">
            <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.8} fill="none" />
            <Path d="M4 21v-2a8 8 0 0 1 16 0v2" stroke={color} strokeWidth={1.8} fill="none" />
          </Svg>
        )}
        <Text style={[styles.linkText, compact && styles.railLinkText, { color }, active && font.extrabold]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

/** Lives outside the route stack so navigation stays available on entry pages. */
export function DesktopSidebar({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const accountName = ['full_name', 'display_name', 'name']
    .map((field) => user?.user_metadata?.[field])
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?.trim();
  const accountLabel = user ? accountName || user.email?.trim() || 'Signed in' : 'My account';
  const { isMother } = usePortal();
  const { colors, scheme, isDark, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View testID={compact ? 'navigation-rail' : 'desktop-sidebar'} role="navigation" aria-label="Main navigation" style={[
      styles.sidebar,
      compact && [styles.rail, { width: layout.navigationRailWidth + insets.right, paddingRight: insets.right }],
    ]}>
      <ScrollView contentContainerStyle={[
        styles.content, compact && styles.railContent,
        { paddingTop: Math.max(insets.top, 32), paddingBottom: Math.max(insets.bottom, 24) },
      ]}>
        <View style={[styles.brand, compact && styles.railBrand]}>
          <Image
            source={require('@/assets/images/logo-original-refined-small.png')}
            style={compact ? styles.railLogo : styles.logo}
            contentFit="contain"
            tintColor={colors.accent}
            accessibilityLabel="GalactoGuide flower logo"
          />
          {!compact && <Text style={styles.brandName}>GalactoGuide</Text>}
        </View>
        <View style={[styles.links, compact && styles.railLinks]}>
          {destinations.map((destination) => {
            const active = pathname === destination.path ||
              (destination.path === '/threads' && pathname.startsWith('/threads/')) ||
              (destination.path === '/home' && (pathname === '/a-z' || pathname.startsWith('/substance/')));
            return <NavigationLink key={destination.path} {...destination} active={active} compact={compact} />;
          })}
        </View>
        <View style={[styles.footer, compact && styles.railFooter]}>
          {!compact && <Text style={styles.portalLabel}>{isMother ? 'Parent / caregiver view' : 'Healthcare provider view'}</Text>}
          <NavigationLink label={compact ? 'Account' : accountLabel} href="/account" active={pathname === '/account'} compact={compact} />
          {!compact && (
            <Host
              colorScheme={scheme}
              seedColor={colors.accent}
              ignoreSafeArea="all"
              // Expo UI's web label otherwise inherits the browser's system theme.
              style={[styles.themeSwitcher, { '--expo-ui-foreground': colors.text } as ViewStyle]}
            >
              <Switch label="Dark mode" value={isDark} onValueChange={(enabled) => setPreference(enabled ? 'dark' : 'light')} />
            </Host>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  sidebar: {
    width: layout.sidebarWidth, flexShrink: 0,
    borderRightWidth: 1, borderColor: colors.border,
  },
  content: { flexGrow: 1, paddingHorizontal: 16 },
  rail: { borderRightWidth: 0, borderLeftWidth: 1, backgroundColor: colors.tabBarBg },
  railContent: { paddingHorizontal: 8 },
  railLinks: { marginTop: 'auto' },
  railFooter: { marginTop: 0, paddingTop: 8 },
  railBrand: { paddingHorizontal: 0, paddingBottom: 24 },
  railLogo: { width: 56, height: 80 },
  railLink: { flexDirection: 'column', justifyContent: 'center', minHeight: 64, paddingHorizontal: 4, gap: 6 },
  railLinkText: { flex: 0, fontSize: fontSize.small, textAlign: 'center' },
  brand: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 38, gap: 9 },
  logo: { width: 45, height: 64 },
  brandName: { ...font.extrabold, fontSize: 23, letterSpacing: -0.8, color: colors.text, textAlign: 'center' },
  links: { gap: 8 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 15,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  linkText: { ...font.semibold, fontSize: fontSize.base, flex: 1 },
  hovered: { backgroundColor: colors.surface },
  active: { backgroundColor: colors.terraLight },
  pressed: { opacity: 0.75 },
  footer: { marginTop: 'auto', paddingTop: 48, gap: 10 },
  themeSwitcher: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 14, borderTopWidth: 1, borderColor: colors.border },
  portalLabel: { ...font.semibold, color: colors.textMuted, fontSize: fontSize.small, paddingHorizontal: 14 },
});
