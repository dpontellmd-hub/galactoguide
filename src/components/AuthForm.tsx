import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { LegalLinks } from '@/components/legal-links';
import {
  font,
  fontSize,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

type Mode = 'signin' | 'signup' | 'reset';

const TITLES: Record<Mode, string> = {
  signin: 'Welcome back',
  signup: 'Create an account',
  reset: 'Reset password',
};

const SUBTITLES: Record<Mode, string> = {
  signin: 'Sign in to sync your saved substances and preferences across devices.',
  signup: 'Optional — accounts let you sync saved substances and preferences across devices.',
  reset: "Enter your email, then open the reset link in this same browser.",
};

interface AuthFormProps {
  initialMode?: Mode;
  /** Accent color (terra for mothers, navy for providers). */
  accent: string;
  /** Hide the internal title/subtitle (when the host screen supplies its own). */
  hideHeader?: boolean;
  /** Optional wrapper style override. */
  style?: StyleProp<ViewStyle>;
}

/**
 * The email/password + Google sign-in form, shared by the `/auth` modal and the
 * onboarding welcome deck. Performs the auth calls but does no navigation — hosts
 * react to `useAuth().user` to decide what to do on success.
 */
export function AuthForm({ accent, hideHeader, style, initialMode = 'signin' }: AuthFormProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { busy, configured, signIn } = useAuthActions();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submitLabel =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link';

  const onSubmit = async () => {
    setError(null);
    setNotice(null);
    const action =
      mode === 'signin'
        ? signIn.password(email, password)
        : mode === 'signup'
          ? signIn.signUp(email, password)
          : signIn.reset(email);
    const { error: err, message } = await action;
    if (err) {
      setError(err);
      return;
    }
    if (message) setNotice(message);
    // On a successful session the host (modal / deck) reacts to useAuth().user.
  };

  const onGoogle = async () => {
    setError(null);
    setNotice(null);
    const { error: err } = await signIn.google();
    if (err) setError(err);
  };

  return (
    <View style={style}>
      {!hideHeader && (
        <>
          <Text style={styles.title}>{TITLES[mode]}</Text>
          <Text style={styles.subtitle}>{SUBTITLES[mode]}</Text>
        </>
      )}

      {!configured && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Accounts aren&apos;t set up yet. Add your Supabase credentials to enable sign-in.
          </Text>
        </View>
      )}

      {mode !== 'reset' && <Text style={styles.subtitle}>
        Signing in syncs your saved entries, selected situations, and preferences with your account.
      </Text>}

      {/* Google */}
      {mode !== 'reset' && (
        <Pressable
          onPress={onGoogle}
          disabled={busy || !configured}
          style={[styles.googleBtn, (busy || !configured) && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Ionicons name="logo-google" size={18} color={colors.text} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>
      )}

      {mode !== 'reset' && (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      {/* Email */}
      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
        style={styles.input}
        editable={!busy && configured}
      />

      {/* Password (not in reset mode) */}
      {mode !== 'reset' && (
        <>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            secureTextEntry
            style={styles.input}
            editable={!busy && configured}
            onSubmitEditing={onSubmit}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Pressable
        onPress={onSubmit}
        disabled={busy || !configured}
        style={[styles.submitBtn, { backgroundColor: accent }, (busy || !configured) && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
      >
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.submitText}>{submitLabel}</Text>
        )}
      </Pressable>

      {/* Mode switches */}
      <View style={styles.switchRow}>
        {mode === 'signin' && (
          <Pressable onPress={() => setMode('reset')} accessibilityRole="button">
            <Text style={[styles.switchLink, { color: accent }]}>Forgot password?</Text>
          </Pressable>
        )}
        {mode !== 'signin' && (
          <Pressable onPress={() => setMode('signin')} accessibilityRole="button">
            <Text style={[styles.switchLink, { color: accent }]}>Back to sign in</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
        </Text>
        <Pressable
          onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          accessibilityRole="button"
        >
          <Text style={[styles.footerLink, { color: accent }]}>
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </Text>
        </Pressable>
      </View>
      <LegalLinks />
    </View>
  );
}

/** Uniform result for the form's actions. */
type ActionResult = { error?: string; message?: string };

/** Small adapter that maps AuthContext methods to a uniform `{ error, message }` result. */
function useAuthActions() {
  const auth = useAuth();
  return {
    user: auth.user,
    busy: auth.busy,
    configured: auth.configured,
    signIn: {
      password: async (email: string, password: string): Promise<ActionResult> => {
        if (!email || !password) return { error: 'Enter your email and password.' };
        return auth.signInWithPassword(email, password);
      },
      signUp: async (email: string, password: string): Promise<ActionResult> => {
        if (!email || !password) return { error: 'Enter your email and password.' };
        if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
        const res = await auth.signUp(email, password);
        if (res.error) return res;
        return { message: 'Check your inbox to confirm your email, then sign in.' };
      },
      reset: async (email: string): Promise<ActionResult> => {
        if (!email) return { error: 'Enter your email.' };
        const res = await auth.resetPassword(email);
        if (res.error) return res;
        return { message: 'If that email has an account, a reset link is on its way.' };
      },
      google: (): Promise<ActionResult> => auth.signInWithGoogle(),
    },
  };
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...font.extrabold,
      fontSize: fontSize.headline,
      color: colors.text,
      marginBottom: 6,
    },
    subtitle: {
      ...font.regular,
      fontSize: fontSize.body,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.xl,
    },
    banner: {
      backgroundColor: colors.dotAmber,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    bannerText: { ...font.regular, fontSize: fontSize.body, color: colors.text, lineHeight: 20 },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      paddingVertical: 13,
      borderRadius: radius.xl,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
    },
    googleText: { ...font.semibold, fontSize: fontSize.base, color: colors.text },
    btnDisabled: { opacity: 0.5 },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: spacing.xl,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { ...font.regular, fontSize: fontSize.tiny, color: colors.textMuted },
    fieldLabel: {
      ...font.semibold,
      fontSize: fontSize.tiny,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 6,
    },
    input: {
      ...font.regular,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: fontSize.base,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    error: {
      ...font.regular,
      fontSize: fontSize.body,
      color: colors.safetyAvoid.fg,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    notice: {
      ...font.regular,
      fontSize: fontSize.body,
      color: colors.safetyRecommend.fg,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    submitBtn: {
      paddingVertical: 15,
      borderRadius: radius.xl,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    submitText: { ...font.bold, fontSize: fontSize.base, color: colors.onAccent },
    switchRow: { alignItems: 'center', marginTop: spacing.lg },
    switchLink: { ...font.semibold, fontSize: fontSize.body },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 5,
      marginTop: spacing.xl,
    },
    footerText: { ...font.regular, fontSize: fontSize.body, color: colors.textSecondary },
    footerLink: { ...font.bold, fontSize: fontSize.body },
  });
