import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { usePortal } from '@/context/PortalContext';
import type { Portal } from '@/data/types';
import {
  font,
  fontSize,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeColors,
  type ThemePreference,
} from '@/theme';

const APPEARANCE_OPTIONS: {
  key: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const PORTAL_LABELS: Record<Portal, string> = {
  mother: 'Parent / Caregiver',
  provider: 'Healthcare Provider',
};

export default function AccountScreen() {
  const router = useRouter();
  const { portal, resetPortal } = usePortal();
  const { colors, preference, setPreference } = useTheme();
  const { user, configured, signOut } = useAuth();
  const notifications = useNotifications();
  const styles = useThemedStyles(makeStyles);
  const labelColor = colors.accent;

  const onToggleNotifications = (next: boolean) => {
    if (next) notifications.enable();
    else notifications.disable();
  };
  const notifDenied = notifications.permission === 'denied';

  const switchPortal = () => {
    resetPortal();
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="My Account" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Account */}
        {configured && (
          <View style={styles.aboutCard}>
            <Text style={[styles.aboutLabel, { color: labelColor }]}>ACCOUNT</Text>
            {user ? (
              <View style={styles.accountRow}>
                <View style={styles.accountText}>
                  <Text style={styles.accountEmail} numberOfLines={1}>
                    {user.email ?? 'Signed in'}
                  </Text>
                  <Text style={styles.accountSub}>
                    Saved substances and preferences sync to this account.
                  </Text>
                </View>
                <Pressable
                  onPress={() => signOut()}
                  style={styles.signOutBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                >
                  <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.accountSub}>
                  Browse the guide without an account. Sign in or create an account to save
                  substances, sync preferences, and join discussions.
                </Text>
                <Pressable
                  onPress={() => router.push('/auth')}
                  style={[styles.signInBtn, { backgroundColor: labelColor }]}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in or create account"
                >
                  <Text style={styles.signInText}>Sign in / Create account</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Portal */}
        <View style={styles.aboutCard}>
          <Text style={[styles.aboutLabel, { color: labelColor }]}>PORTAL</Text>
          <View style={styles.accountRow}>
            <View style={styles.accountText}>
              <Text style={styles.accountEmail}>
                {portal ? PORTAL_LABELS[portal] : 'Not selected'}
              </Text>
              <Text style={styles.accountSub}>
                Switching portals changes the app&apos;s voice and returns you to the welcome
                screen.
              </Text>
            </View>
            <Pressable
              onPress={switchPortal}
              style={styles.signOutBtn}
              accessibilityRole="button"
              accessibilityLabel="Switch portal"
            >
              <Text style={styles.signOutText}>Switch</Text>
            </Pressable>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.aboutCard}>
          <Text style={[styles.aboutLabel, { color: labelColor }]}>APPEARANCE</Text>
          <View style={styles.segRow}>
            {APPEARANCE_OPTIONS.map((o) => {
              const active = preference === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setPreference(o.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${o.label} appearance`}
                  style={[
                    styles.segBtn,
                    active && { backgroundColor: labelColor, borderColor: labelColor },
                  ]}
                >
                  <Ionicons name={o.icon} size={15} color={active ? colors.onAccent : colors.textMuted} />
                  <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* Notifications */}
        {Platform.OS !== 'web' && (
          <View style={styles.aboutCard}>
            <Text style={[styles.aboutLabel, { color: labelColor }]}>NOTIFICATIONS</Text>
            <View style={styles.accountRow}>
              <View style={styles.accountText}>
                <Text style={styles.accountEmail}>Content update alerts</Text>
                <Text style={styles.accountSub}>
                  {notifDenied
                    ? 'Notifications are blocked — enable them in your device Settings.'
                    : 'Get notified when new substances or corrections are added.'}
                </Text>
              </View>
              <Switch
                value={notifications.enabled}
                onValueChange={onToggleNotifications}
                disabled={notifications.busy || notifDenied}
                trackColor={{ false: colors.inputBorder, true: labelColor }}
                thumbColor={colors.surface}
                accessibilityLabel="Toggle content update notifications"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 40 },
    aboutCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: 13,
      marginBottom: 9,
    },
    aboutLabel: {
      ...font.semibold,
      fontSize: fontSize.tiny,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    segRow: { flexDirection: 'row', gap: 7 },
    segBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 9,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
    },
    segText: { ...font.semibold, fontSize: fontSize.small, color: colors.textMuted },
    segTextActive: { color: colors.onAccent },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    accountText: { flex: 1 },
    accountEmail: { ...font.semibold, fontSize: fontSize.base, color: colors.text },
    accountSub: { ...font.regular, fontSize: fontSize.body, color: colors.textSecondary, lineHeight: 20, marginTop: 2 },
    signOutBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
    },
    signOutText: { ...font.semibold, fontSize: fontSize.small, color: colors.text },
    signInBtn: {
      marginTop: 11,
      paddingVertical: 12,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    signInText: { ...font.bold, fontSize: fontSize.base, color: colors.onAccent },
  });
