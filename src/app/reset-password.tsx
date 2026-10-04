import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthForm } from '@/components/AuthForm';
import { FormScrollView } from '@/components/form-scroll-view';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { font, fontSize, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { user, hydrated, busy, authCallbackError, updatePassword, dismissPasswordRecovery } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const pending = useRef(false);
  const leave = () => { dismissPasswordRecovery(); router.replace('/'); };

  const submit = async () => {
    if (pending.current || busy) return;
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    pending.current = true;
    try {
      const result = await updatePassword(password);
      if (result.error) { setError(result.error); return; }
      setPassword('');
      setConfirmation('');
      setComplete(true);
    } catch {
      setError('Could not update your password. Please try again.');
    } finally { pending.current = false; }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Reset password" onBack={leave} />
      <FormScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!hydrated ? <ActivityIndicator accessibilityLabel="Checking reset link" color={colors.accent} />
          : complete ? (
            <View style={styles.section} accessibilityLiveRegion="polite">
              <Text style={styles.title}>Password updated</Text>
              <Text style={styles.copy}>Your new password is ready to use.</Text>
              <Pressable accessibilityRole="button" onPress={leave} style={styles.button}>
                <Text style={styles.buttonText}>Continue to GalactoGuide</Text>
              </Pressable>
            </View>
          ) : authCallbackError || !user ? (
            <View style={styles.section}>
              <Text style={styles.copy} accessibilityRole="alert">
                {authCallbackError ?? 'Open a password reset link to choose a new password. If your link expired or was already used, request another below.'}
              </Text>
              <AuthForm accent={colors.accent} initialMode="reset" hideHeader />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.title}>Choose a new password</Text>
              <Text style={styles.copy}>Use at least 6 characters.</Text>
              <Text style={styles.label}>New password</Text>
              <TextInput accessibilityLabel="New password" value={password} onChangeText={setPassword}
                secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false}
                editable={!busy} style={styles.input} />
              <Text style={styles.label}>Confirm new password</Text>
              <TextInput accessibilityLabel="Confirm new password" value={confirmation} onChangeText={setConfirmation}
                secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false}
                editable={!busy} style={styles.input} onSubmitEditing={() => void submit()} />
              {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
              <Pressable accessibilityRole="button" accessibilityLabel="Save new password"
                accessibilityState={{ disabled: busy, busy }} disabled={busy}
                onPress={() => void submit()} style={[styles.button, busy && styles.disabled]}>
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.buttonText}>Save new password</Text>}
              </Pressable>
            </View>
          )}
      </FormScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.appBg },
  content: { padding: spacing.xl, paddingBottom: 48 },
  section: { gap: spacing.md },
  title: { ...font.extrabold, fontSize: fontSize.xl, color: colors.text },
  copy: { ...font.regular, fontSize: fontSize.base, lineHeight: 23, color: colors.textSecondary },
  label: { ...font.bold, fontSize: fontSize.base, color: colors.text },
  input: { ...font.regular, fontSize: 16, minHeight: 48, borderWidth: 1.5, borderColor: colors.inputBorder,
    borderRadius: radius.md, backgroundColor: colors.inputBg, color: colors.text, padding: spacing.md },
  button: { minHeight: 48, padding: spacing.md, backgroundColor: colors.accent, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...font.bold, fontSize: fontSize.base, color: colors.onAccent },
  error: { ...font.regular, fontSize: fontSize.base, color: colors.safetyAvoid.fg },
  disabled: { opacity: 0.5 },
});
