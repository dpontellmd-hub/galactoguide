import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon, type TabIconName } from '@/components/TabIcon';
import { usePortal } from '@/context/PortalContext';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { fontFamily, fontSize, useTheme } from '@/theme';

export default function TabsLayout() {
  const { portal, disclaimerAccepted } = usePortal();
  const { colors } = useTheme();
  const { hasSideNavigation } = useResponsiveLayout();
  const insets = useSafeAreaInsets();

  // Guard: only reachable once a portal is chosen and the disclaimer accepted.
  if (!portal || !disclaimerAccepted) {
    return <Redirect href="/" />;
  }

  const tab =
    (name: TabIconName) =>
    // eslint-disable-next-line react/display-name -- render prop, not a component definition
    ({ color }: { color: ColorValue }) => <TabIcon name={name} color={color as string} />;

  // Active labels are extrabold per the design; React Navigation can't switch
  // weight via tabBarLabelStyle, so render the label ourselves. lineHeight must
  // exceed fontSize or the line box clips glyph descenders (p, y, g) on web.
  const label =
    (title: string) =>
    // eslint-disable-next-line react/display-name -- render prop, not a component definition
    ({ focused, color }: { focused: boolean; color: ColorValue }) => (
      <Text
        style={{
          fontFamily: focused ? fontFamily.sansExtrabold : fontFamily.sansBold,
          fontSize: fontSize.tabLabel,
          lineHeight: 15,
          color,
        }}
      >
        {title}
      </Text>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'bottom',
        // Keep labels below icons on both phone and tablet widths.
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabBarInactive,
        // The inner tab row = height - paddingTop - paddingBottom, and each
        // tab item needs ~53px tall (5 item padding + 28 icon + 15 label + 5).
        // If the row is shorter than that, the label overflows past the bar's
        // bottom edge and gets clipped. Keep height - vertical padding >= 56.
        tabBarStyle: {
          display: hasSideNavigation ? 'none' : 'flex',
          backgroundColor: colors.tabBarBg,
          borderColor: colors.tabBarBorder,
          borderTopWidth: 1.5,
          paddingTop: 2,
          paddingBottom: 2 + insets.bottom,
          height: 60 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: tab('home'), tabBarLabel: label('Home') }}
      />
      <Tabs.Screen
        name="browse"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="safety"
        options={{ title: 'For you', tabBarIcon: tab('guide'), tabBarLabel: label('For you') }}
      />
      <Tabs.Screen
        name="threads"
        options={{ title: 'Threads', tabBarIcon: tab('threads'), tabBarLabel: label('Threads') }}
      />
      <Tabs.Screen
        name="about"
        options={{ title: 'About', tabBarIcon: tab('about'), tabBarLabel: label('About') }}
      />
    </Tabs>
  );
}
