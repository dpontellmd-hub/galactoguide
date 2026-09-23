import type { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { webPath } from '@/lib/site';

// Required so the web popup/redirect auth flow can complete on some browsers.
WebBrowser.maybeCompleteAuthSession();

/**
 * The URL Supabase redirects back to after OAuth / password reset.
 * Web callbacks use the current host and an explicit route, preserving the
 * optional Pages base path. Preview sessions stay on the preview host.
 * Native callbacks need a real route: pathless custom schemes can lose their
 * slashes when the auth server constructs the PKCE return URL.
 */
function authRedirectTo(path: 'auth' | 'reset-password' = 'auth'): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin + webPath(path);
  }
  return makeRedirectUri({ scheme: 'galactoguide', path, native: `galactoguide://${path}` });
}

interface AuthResult {
  /** User-facing error message, or undefined on success. */
  error?: string;
  sessionStarted?: boolean;
}

interface AuthContextValue {
  /** Current Supabase session, or null when logged out. */
  session: Session | null;
  /** Convenience accessor for the signed-in user. */
  user: User | null;
  /** True once the initial getSession() has resolved (avoids an auth flash). */
  hydrated: boolean;
  /** True while an auth call is in flight (disable buttons). */
  busy: boolean;
  /** Whether Supabase credentials are configured at all. */
  configured: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  verifySignupCode: (email: string, code: string) => Promise<AuthResult>;
  resendSignupCode: (email: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  passwordRecovery: boolean;
  authCallbackError: string | null;
  dismissPasswordRecovery: () => void;
  updatePassword: (password: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Complete native OAuth using the flow configured in the Supabase client. */
async function createSessionFromUrl(url: string): Promise<AuthResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  // Log stages only: never log callback URLs, codes, tokens, or user details.
  console.info('[auth] callback received', { hasCode: !!params.code, hasError: !!(errorCode || params.error) });
  if (errorCode || params.error || params.error_description) {
    return { error: params.error_description || params.error || errorCode! };
  }

  // PKCE returns a one-time code, not tokens. Supabase exchanges it using the
  // persisted verifier, saves the session, and emits SIGNED_IN to our listener.
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    console.info('[auth] code exchange finished', { hasSession: !!data.session, errorCode: error?.code });
    return { error: error?.message ?? (data.session ? undefined : 'No session returned from provider.') };
  }

  // Keep support for older implicit-flow links containing a token pair.
  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return { error: 'No session returned from provider.' };
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  return { error: error?.message };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // When Supabase isn't configured there's nothing to load — start hydrated.
  const [hydrated, setHydrated] = useState(!supabaseConfigured);
  const [busy, setBusy] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(null);
  // supabase-js owns session persistence; we just mirror it into React state.
  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;

    // initialize() reuses SDK initialization. getSession alone can return an
    // older valid session after a failed callback, so inspect both results.
    (async () => {
      const { error } = await supabase.auth.initialize();
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      // With no PKCE verifier (a different browser), the SDK can skip exchange
      // and retain an older session. A code left in the URL is not a valid reset.
      let unresolvedCallback = false;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const fragment = new URLSearchParams(url.hash.slice(1));
        unresolvedCallback = url.searchParams.has('code') || ['error', 'error_code', 'error_description']
          .some((key) => url.searchParams.has(key) || fragment.has(key));
      }
      if (error || unresolvedCallback) setAuthCallbackError('This link could not be verified. Request a new reset link and open it in the same browser.');
      setSession(data.session);
      setHydrated(true);
    })().catch(() => {
      if (active) setAuthCallbackError('Could not verify this link. Check your connection and request a new link.');
      if (active) setHydrated(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const guard = (): AuthResult | null =>
      supabaseConfigured ? null : { error: 'Accounts are not available yet.' };

    return {
      session,
      user: session?.user ?? null,
      hydrated,
      busy,
      configured: supabaseConfigured,
      passwordRecovery,
      authCallbackError,
      dismissPasswordRecovery: () => setPasswordRecovery(false),

      signUp: async (email, password) => {
        const blocked = guard();
        if (blocked) return blocked;
        setBusy(true);
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: authRedirectTo() },
          });
          return { error: error?.message, sessionStarted: !!data?.session };
        } catch {
          return { error: 'Could not create your account. Check your connection and try again.' };
        } finally {
          setBusy(false);
        }
      },

      signInWithPassword: async (email, password) => {
        const blocked = guard();
        if (blocked) return blocked;
        setBusy(true);
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          return { error: error?.message };
        } finally {
          setBusy(false);
        }
      },

      signInWithGoogle: async () => {
        const blocked = guard();
        if (blocked) return blocked;
        setBusy(true);
        try {
          const redirectTo = authRedirectTo();
          if (Platform.OS === 'web') {
            // Full-page redirect; detectSessionInUrl consumes the ?code on return.
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo },
            });
            return { error: error?.message };
          }

          // Native: open an in-app browser, then set the session from the deep link.
          console.info('[auth] starting native Google sign-in');
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, skipBrowserRedirect: true },
          });
          if (error) return { error: error.message };
          if (!data?.url) return { error: 'Could not start Google sign-in.' };

          const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          console.info('[auth] browser finished', { type: res.type });
          if (res.type === 'success') return await createSessionFromUrl(res.url);
          if (res.type === 'cancel' || res.type === 'dismiss') return {};
          return { error: 'Google sign-in did not complete.' };
        } catch {
          if (Platform.OS !== 'web') console.info('[auth] Google sign-in failed unexpectedly');
          return { error: 'Could not finish Google sign-in. Please try again.' };
        } finally {
          setBusy(false);
        }
      },

      signOut: async () => {
        if (!supabaseConfigured) return;
        await supabase.auth.signOut();
      },

      resetPassword: async (email) => {
        const blocked = guard();
        if (blocked) return blocked;
        setBusy(true);
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: authRedirectTo('reset-password'),
          });
          return { error: error?.message };
        } catch {
          return { error: 'Could not send a reset link. Check your connection and try again.' };
        } finally {
          setBusy(false);
        }
      },

      verifySignupCode: async (email, code) => {
        const blocked = guard();
        if (blocked) return blocked;
        setBusy(true);
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: code.trim(),
            type: 'email',
          });
          if (error) return { error: 'That code is invalid or expired. Check the latest email and try again.' };
          return { sessionStarted: !!data.session, error: data.session ? undefined : 'Verification did not start a session. Please try again.' };
        } catch {
          return { error: 'Could not verify the code. Check your connection and try again.' };
        } finally {
          setBusy(false);
        }
      },

      resendSignupCode: async (email) => {
        const blocked = guard();
        if (blocked) return blocked;
        setBusy(true);
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: { emailRedirectTo: authRedirectTo() },
          });
          return { error: error?.message };
        } catch {
          return { error: 'Could not resend the code. Check your connection and try again.' };
        } finally {
          setBusy(false);
        }
      },

      updatePassword: async (password) => {
        const blocked = guard();
        if (blocked) return blocked;
        if (authCallbackError) return { error: authCallbackError };
        if (!session) return { error: 'Open a new password reset link before continuing.' };
        if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
        setBusy(true);
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (!error) setPasswordRecovery(false);
          return { error: error?.message };
        } catch {
          return { error: 'Could not update your password. Check your connection and try again.' };
        } finally {
          setBusy(false);
        }
      },
    };
  }, [session, hydrated, busy, passwordRecovery, authCallbackError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
