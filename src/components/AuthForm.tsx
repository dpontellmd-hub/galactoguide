import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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

type Mode = 'signin' | 'signup' | 'verify' | 'reset';

const TITLES: Record<Mode, string> = {
  signin: 'Welcome back',
  signup: 'Create an account',
  verify: 'Check your email',
  reset: 'Reset password',
};

const SUBTITLES: Record<Mode, string> = {
  signin: 'Sign in to sync your saved substances and preferences across devices.',
  signup: 'Optional — accounts let you sync saved substances and preferences across devices.',
  verify: 'Enter the code we emailed you to finish creating your account.',
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
  /** Lets the onboarding deck hold Next until account verification finishes. */
  onVerificationPendingChange?: (pending: boolean) => void;
  /** Finish the host's account handoff before verification emits an auth event. */
  onBeforeSignupVerification?: (signupUserId: string) => Promise<void>;
}

/**
 * The email/password + Google sign-in form, shared by the `/auth` modal and the
 * onboarding welcome deck. Performs the auth calls but does no navigation — hosts
 * react to `useAuth().user` to decide what to do on success.
 */
export function AuthForm({ accent, hideHeader, style, initialMode = 'signin', onVerificationPendingChange, onBeforeSignupVerification }: AuthFormProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { busy, configured, signIn } = useAuthActions();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string>();
  const [code, setCode] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    onVerificationPendingChange?.(mode === 'verify');
    return () => onVerificationPendingChange?.(false);
  }, [mode, onVerificationPendingChange]);

  useEffect(() => {
    if (mode !== 'verify' || !resendAvailableAt) return;
    const update = () => setResendSeconds(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [mode, resendAvailableAt]);

  const switchMode = (next: Mode) => {
    setError(null);
    setNotice(null);
    setMode(next);
  };

  const submitLabel = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account'
    : mode === 'verify' ? 'Verify email' : 'Send reset link';

  const onSubmit = async () => {
    setError(null);
    setNotice(null);
    if (mode === 'verify') {
      if (!/^\d+$/.test(code)) {
        setError('Enter the code from your email.');
        return;
      }
      try {
        if (pendingUserId) await onBeforeSignupVerification?.(pendingUserId);
      } catch {
        setError('Could not save your place. Please try verifying again.');
        return;
      }
      const result = await signIn.verifySignupCode(pendingEmail, code);
      if (result.error) setError(result.error);
      else setNotice('Email verified. Tap Next to continue.');
      return;
    }
    const action =
      mode === 'signin'
        ? signIn.password(email, password)
        : mode === 'signup'
          ? signIn.signUp(email, password)
          : signIn.reset(email);
    const { error: err, message, sessionStarted, signupUserId } = await action;
    if (err) {
      setError(err);
      return;
    }
    if (message) setNotice(message);
    if (mode === 'signup' && !sessionStarted) {
      setPendingEmail(email.trim());
      setPendingUserId(signupUserId);
      setPassword('');
      setCode('');
      setResendAvailableAt(Date.now() + 60_000);
      setResendSeconds(60);
      switchMode('verify');
    }
    // On a successful session the host (modal / deck) reacts to useAuth().user.
  };

  const onGoogle = async () => {
    setError(null);
    setNotice(null);
    const { error: err } = await signIn.google();
    if (err) setError(err);
  };

  const onResend = async () => {
    if (Date.now() < resendAvailableAt) return;
    setError(null);
    setNotice(null);
    const result = await signIn.resendSignupCode(pendingEmail);
    if (result.error) setError(result.error);
    else {
      setCode('');
      setNotice('A new code is on its way. Use the most recent email.');
      setResendAvailableAt(Date.now() + 60_000);
      setResendSeconds(60);
    }
  };

  return (
    <View style={style}>
      {!hideHeader && (
        <>
          <Text style={styles.title}>{TITLES[mode]}</Text>
          <Text style={styles.subtitle}>{SUBTITLES[mode]}</Text>
        </>
      )}

      {hideHeader && mode === 'verify' && (
        <>
          <Text style={styles.title}>{TITLES.verify}</Text>
          <Text style={styles.subtitle}>{SUBTITLES.verify}</Text>
        </>
      )}

      {!configured && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Accounts aren&apos;t set up yet. Add your Supabase credentials to enable sign-in.
          </Text>
        </View>
      )}

      {mode !== 'reset' && mode !== 'verify' && <Text style={styles.subtitle}>
        Signing in syncs your saved entries, selected situations, and preferences with your account.
      </Text>}

      {/* Google */}
      {mode !== 'reset' && mode !== 'verify' && (
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

      {mode !== 'reset' && mode !== 'verify' && (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      {mode === 'verify' ? (
        <>
          <Text style={styles.codeEmail}>{pendingEmail}</Text>
          <Text style={styles.fieldLabel}>Verification code</Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
            placeholder="Email code"
            placeholderTextColor={colors.textFaint}
            autoComplete="one-time-code"
            keyboardType="number-pad"
            inputMode="numeric"
            style={styles.input}
            editable={!busy && configured}
            onSubmitEditing={onSubmit}
            accessibilityLabel="Verification code"
          />
        </>
      ) : (
        <>
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
        </>
      )}

      {/* Password (not in reset mode) */}
      {mode !== 'reset' && mode !== 'verify' && (
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

      {mode === 'verify' && (
        <View style={styles.verifyActions}>
          <Pressable
            onPress={onResend}
            disabled={busy || resendSeconds > 0}
            accessibilityRole="button"
            accessibilityLabel="Resend verification code"
          >
            <Text style={[styles.switchLink, { color: accent }, (busy || resendSeconds > 0) && styles.btnDisabled]}>
              {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
            </Text>
          </Pressable>
          <Pressable onPress={() => switchMode('signup')} accessibilityRole="button">
            <Text style={[styles.switchLink, { color: accent }]}>Use a different email</Text>
          </Pressable>
          <Pressable onPress={() => switchMode('signin')} accessibilityRole="button">
            <Text style={[styles.switchLink, { color: accent }]}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      )}

      {/* Mode switches */}
      {mode !== 'verify' && <View style={styles.switchRow}>
        {mode === 'signin' && (
          <Pressable onPress={() => switchMode('reset')} accessibilityRole="button">
            <Text style={[styles.switchLink, { color: accent }]}>Forgot password?</Text>
          </Pressable>
        )}
        {mode !== 'signin' && (
          <Pressable onPress={() => switchMode('signin')} accessibilityRole="button">
            <Text style={[styles.switchLink, { color: accent }]}>Back to sign in</Text>
          </Pressable>
        )}
      </View>}

      {mode !== 'verify' && <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
        </Text>
        <Pressable
          onPress={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
          accessibilityRole="button"
        >
          <Text style={[styles.footerLink, { color: accent }]}>
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </Text>
        </Pressable>
      </View>}
      <LegalLinks />
    </View>
  );
}

/** Uniform result for the form's actions. */
type ActionResult = { error?: string; message?: string; sessionStarted?: boolean; signupUserId?: string };

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
        return res;
      },
      verifySignupCode: (email: string, code: string): Promise<ActionResult> => auth.verifySignupCode(email, code),
      resendSignupCode: (email: string): Promise<ActionResult> => auth.resendSignupCode(email),
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
    codeEmail: { ...font.semibold, fontSize: fontSize.body, color: colors.text, marginBottom: spacing.xl },
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
    verifyActions: { alignItems: 'center', gap: spacing.lg, marginTop: spacing.lg },
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
