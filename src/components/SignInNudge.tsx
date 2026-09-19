import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useDismissibleNudge } from '@/hooks/useDismissibleNudge';
import {
  fontSize,
  radius,
  spacing,
  useThemedStyles,
  type PortalAccent,
  type ThemeColors,
} from '@/theme';

interface SignInNudgeProps {
  /** The encouragement, e.g. "Sign in to save your bookmarks across devices." */
  message: string;
  /** Stable id for the dismissal record (per nudge), e.g. "save-bookmarks". */
  storageKey: string;
  /** Portal accent (from getPortalAccent) so the tint matches the screen. */
  accent: PortalAccent;
  /** Days to snooze after the user dismisses. Defaults to 14. */
  cooldownDays?: number;
}

/**
 * A gentle "sign in to keep your stuff" banner shown to signed-out users who
 * already have local data worth saving. The caller decides *whether there's
 * something to save* (e.g. has bookmarks); this component owns the rest:
 * it hides itself when auth isn't configured, while loading, when signed in,
 * or while the user's dismissal is still snoozed.
 */
export function SignInNudge({ message, storageKey, accent, cooldownDays }: SignInNudgeProps) {
  const router = useRouter();
  const { user, hydrated, configured } = useAuth();
  const nudge = useDismissibleNudge(storageKey, cooldownDays);
  const styles = useThemedStyles(makeStyles);

  if (!configured || !hydrated || user || !nudge.visible) return null;

  return (
    <Pressable
      onPress={() => router.push('/auth')}
      accessibilityRole="button"
      accessibilityLabel={message}
      style={[styles.banner, { backgroundColor: accent.light }]}
    >
      <Ionicons name="cloud-upload-outline" size={16} color={accent.main} />
      <Text style={[styles.text, { color: accent.on }]} numberOfLines={2}>
        {message}
      </Text>
      <Text style={[styles.action, { color: accent.main }]}>Sign in</Text>
      <Pressable
        onPress={nudge.dismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={10}
        style={styles.dismiss}
      >
        <Ionicons name="close" size={15} color={accent.on} />
      </Pressable>
    </Pressable>
  );
}

const makeStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: radius.md + 2,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: spacing.sm,
    },
    text: { flex: 1, fontSize: fontSize.small, lineHeight: 16 },
    action: { fontSize: fontSize.small, fontWeight: '700' },
    dismiss: { marginLeft: 2, opacity: 0.7 },
  });
