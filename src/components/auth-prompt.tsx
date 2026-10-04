import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, fontSize, radius, spacing, useThemedStyles, type ThemeColors } from '@/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  accessibilityLabel: string;
}

/** Shared signed-out invitation used where account-only actions are available. */
export function AuthPrompt({ icon, title, body, accessibilityLabel }: Props) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} style={styles.icon} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Pressable
        onPress={() => router.push('/auth')}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>Sign in / Create account</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.terraLight,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.round,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { color: colors.accent },
    copy: { gap: 2 },
    title: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    body: { ...font.semibold, fontSize: fontSize.body, lineHeight: 20, color: colors.textSecondary },
    button: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: 10,
    },
    buttonText: { ...font.bold, fontSize: fontSize.body, color: colors.onAccent },
    pressed: { opacity: 0.72 },
  });
