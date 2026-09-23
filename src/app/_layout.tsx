import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AppFrame } from '@/components/app-frame';
import { UpdateBanner } from '@/components/UpdateBanner';
import { EmailVerificationReminder } from '@/components/EmailVerificationReminder';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ForumProvider } from '@/context/ForumContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { PortalProvider, usePortal } from '@/context/PortalContext';
import { PrefsSyncProvider } from '@/context/PrefsSyncContext';
import { SituationsProvider, useSituations } from '@/context/SituationsContext';
import { configureNotificationHandler } from '@/lib/notifications';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

function RootNavigator() {
  const { passwordRecovery } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated } = usePortal();
  const { hydrated: situationsHydrated } = useSituations();
  const { colors, scheme, hydrated: themeHydrated } = useTheme();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const ready = hydrated && situationsHydrated && themeHydrated && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Also catch recovery links issued by older builds that returned to /auth or /.
  useEffect(() => {
    if (ready && passwordRecovery && pathname !== '/reset-password') router.replace('/reset-password');
  }, [ready, passwordRecovery, pathname, router]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppFrame>
        {!['/auth', '/reset-password'].includes(pathname) && <EmailVerificationReminder />}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.appBg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="notices" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="account" />
          <Stack.Screen name="resources" />
          <Stack.Screen name="release-notes" options={{ title: 'Release notes' }} />
          <Stack.Screen name="essentials" />
          <Stack.Screen name="feedback" />
          <Stack.Screen name="a-z" />
          <Stack.Screen name="grading" />
          <Stack.Screen name="substance/[id]" />
          <Stack.Screen name="threads/[id]" />
          <Stack.Screen name="threads/new" />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reset-password" options={{ title: 'Reset password' }} />
        </Stack>
        <UpdateBanner />
      </AppFrame>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ForumProvider>
            <PortalProvider>
              <SituationsProvider>
                <PrefsSyncProvider>
                  <FavoritesProvider>
                    <NotificationsProvider>
                      <KeyboardProvider>
                        <RootNavigator />
                      </KeyboardProvider>
                    </NotificationsProvider>
                  </FavoritesProvider>
                </PrefsSyncProvider>
              </SituationsProvider>
            </PortalProvider>
          </ForumProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
