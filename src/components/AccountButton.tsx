import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { font, fontSize, useThemedStyles, type ThemeColors } from '@/theme';

const NAME_FIELDS = ['full_name', 'display_name', 'name'] as const;

function firstCharacter(value: string): string | null {
  const match = value.match(/[\p{L}\p{N}]/u);
  return match?.[0]?.toLocaleUpperCase() ?? null;
}

/** Derive an identity mark only from real profile data already held by auth state. */
export function accountInitials(user: User | null): string | null {
  if (!user) return null;

  for (const field of NAME_FIELDS) {
    const value = user.user_metadata?.[field];
    if (typeof value !== 'string') continue;
    const words = value.trim().split(/\s+/u).filter(Boolean);
    if (!words.length) continue;
    const first = firstCharacter(words[0]);
    const last = words.length > 1 ? firstCharacter(words[words.length - 1]) : null;
    const initials = `${first ?? ''}${last ?? ''}`;
    if (initials) return initials;
  }

  const emailLocalPart = user.email?.split('@', 1)[0]?.trim();
  return emailLocalPart ? firstCharacter(emailLocalPart) : null;
}

export function AccountButton({ onPress }: { onPress: () => void }) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const initials = accountInitials(user);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open my account"
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {initials ? (
        <Text
          style={styles.initials}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.4}
        >
          {initials}
        </Text>
      ) : (
        <Ionicons name="person-outline" size={17} style={styles.icon} />
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1.5,
      borderColor: colors.accent,
      backgroundColor: colors.countChipBg,
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: colors.shadowSoft,
    },
    initials: {
      ...font.extrabold,
      fontSize: fontSize.body,
      lineHeight: 18,
      color: colors.accent,
      textAlign: 'center',
      maxWidth: 30,
    },
    icon: { color: colors.accent },
    pressed: { opacity: 0.72 },
  });
