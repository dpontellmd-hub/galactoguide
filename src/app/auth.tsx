import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthForm } from '@/components/AuthForm';
import { FormScrollView } from '@/components/form-scroll-view';
import { useAuth } from '@/context/AuthContext';
import { spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const accent = colors.accent;

  const { user, passwordRecovery } = useAuth();

  // Close automatically once signed in. On a normal in-app sign-in we can just
  // go back; after the web OAuth redirect the app reloads fresh on this screen
  // with nothing to go back to, so send them to the app entry instead.
  useEffect(() => {
    if (!user) return;
    if (passwordRecovery) { router.replace('/reset-password'); return; }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [user, passwordRecovery, router]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
        >
          <Ionicons name="close" size={22} color={colors.textFaint} />
        </Pressable>
      </View>

      <FormScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AuthForm accent={accent} />
      </FormScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { paddingHorizontal: spacing.lg },
    closeBtn: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
    content: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm },
  });
