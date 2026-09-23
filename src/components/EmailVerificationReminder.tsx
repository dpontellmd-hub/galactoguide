import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { font, fontSize, spacing, useTheme } from '@/theme';

/** Informational only: never intercepts navigation or blocks account features. */
export function EmailVerificationReminder() {
  const { user, emailVerified, emailVerificationUnavailable, verificationSending, verificationNotice, sendVerification, refreshVerification } = useAuth();
  const { colors } = useTheme();
  if (!user || emailVerified === true || (emailVerified === null && !emailVerificationUnavailable)) return null;
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.copy, { color: colors.textSecondary }]} accessibilityLiveRegion="polite">
        {verificationNotice ?? (emailVerified === false
          ? 'Verify your email when convenient. Your account is ready to use.'
          : 'Your account is ready. Email verification status could not be checked.')}
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={verificationSending} onPress={sendVerification}
          style={styles.action}>
          <Text style={[styles.link, { color: colors.accent }]}>{verificationSending ? 'Sending…' : 'Send verification email'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={refreshVerification} style={styles.action}>
          <Text style={[styles.link, { color: colors.accent }]}>I’ve verified</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  copy: { ...font.regular, fontSize: fontSize.small, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg },
  action: { minHeight: 44, justifyContent: 'center' },
  link: { ...font.semibold, fontSize: fontSize.small },
});
