import type { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { webPath } from '@/lib/site';
import { CALLBACK_ERROR, createNativeCallbackHandler, type NativeCallbackResult } from '@/lib/native-auth-callback';
import { signInWithAppleNative } from '@/lib/apple-sign-in';

// Required so the web popup/redirect auth flow can complete on some browsers.
WebBrowser.maybeCompleteAuthSession();

/**
 * The URL Supabase redirects back to after OAuth / password reset.
 * Web callbacks use the current host and an explicit route, preserving the
 * optional Pages base path. Preview sessions stay on the preview host.
 * Native callbacks need a real route: pathless custom schemes can lose their
 * slashes when the auth server constructs the PKCE return URL.
 */
function authRedirectTo(path: 'auth' | 'reset-password' | 'delete-account' = 'auth'): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin + webPath(path);
  }
  return makeRedirectUri({ scheme: 'galactoguide', path, native: `galactoguide://${path}` });
}

interface AuthResult {
  /** User-facing error message, or undefined on success. */
  error?: string;
  sessionStarted?: boolean;
  cancelled?: boolean;
  signupUserId?: string;
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
  signInWithGoogle: (returnTo?: 'delete-account') => Promise<AuthResult>;
  signInWithApple: () => Promise<AuthResult>;
  appleAvailable: boolean;
  signOut: () => Promise<void>;
  signOutError: string | null;
  /** Clears only the deleted owner's current local session; never another account. */
  finalizeDeletedAccount: (expectedUserId: string) => Promise<{ clearedSession: boolean; manualCleanupRequired?: boolean }>;
  resetPassword: (email: string) => Promise<AuthResult>;
  passwordRecovery: boolean;
  authCallbackError: string | null;
  authCallbackPending: boolean;
  dismissPasswordRecovery: () => void;
  updatePassword: (password: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // When Supabase isn't configured there's nothing to load — start hydrated.
  const [hydrated, setHydrated] = useState(!supabaseConfigured);
  const [busy, setBusy] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(null);
  const [authCallbackPending, setAuthCallbackPending] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [deletionCleanupPending, setDeletionCleanupPending] = useState(false);
  const deletionCleanupFlight = useRef<Promise<{ clearedSession: boolean; manualCleanupRequired?: boolean }> | null>(null);
  const deletionCleanupGate = useRef(false);
  const deletionCleanupDraining = useRef(false);
  // Process-local suppression only. Never remove shared browser auth storage for
  // a deleted owner: another tab may have replaced that storage with account B.
  const deletedAccountOwners = useRef(new Set<string>());
  const authEventRevision = useRef(0);
  const signOutFlight = useRef<Promise<void> | null>(null);
  const socialPending = useRef(false);
  const signingOut = useRef(false);
  const signOutEpoch = useRef(0);
  const recoveryCancelled = useRef(false);
  const authOperations = useRef(new Set<Promise<void>>());
  const beginOperation = useCallback(() => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    authOperations.current.add(pending);
    return () => { authOperations.current.delete(pending); finish(); };
  }, []);
  const onCallbackStart = useCallback(() => {
    recoveryCancelled.current = false;
    setAuthCallbackPending(true);
    setAuthCallbackError(null);
    setPasswordRecovery(false);
  }, []);
  const onCallbackComplete = useCallback((result: NativeCallbackResult) => {
    setAuthCallbackPending(false);
    if (signingOut.current) return;
    if (result.session && deletedAccountOwners.current.has(result.session.user.id)) return;
    setAuthCallbackError(result.error ?? null);
    setPasswordRecovery(!!result.recovery && !result.error && !recoveryCancelled.current);
    if (result.session) setSession(result.session);
  }, []);
  const canStartCallback = useCallback(() => !signingOut.current &&
    (!deletionCleanupGate.current || (deletionCleanupDraining.current && socialPending.current)), []);
  const handleNativeCallback = useMemo(() => createNativeCallbackHandler(
    // Factory only stores closures; it never invokes them or reads refs during render.
    // eslint-disable-next-line react-hooks/refs
    supabase.auth, onCallbackStart, onCallbackComplete, canStartCallback,
  ), [onCallbackStart, onCallbackComplete, canStartCallback]);

  useEffect(() => {
    let active = true;
    if (Platform.OS === 'ios' && Constants.expoConfig?.extra?.appleSignInEnabled === true) {
      AppleAuthentication.isAvailableAsync().then(available => {
        if (active) setAppleAvailable(available);
      }).catch(() => { if (active) setAppleAvailable(false); });
    }
    return () => { active = false; };
  }, []);
  // supabase-js owns session persistence; we just mirror it into React state.
  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    let authRevision = 0;
    const initializationEpoch = signOutEpoch.current;
    // Subscribe before reading the launch URL so a resume event cannot be lost.
    // Both paths wait for SDK initialization; the callback handler deduplicates.
    const initialized = supabase.auth.initialize();
    const linkSubscription = Platform.OS !== 'web' ? Linking.addEventListener('url', ({ url }) => {
      void initialized.then(() => { if (active) return handleNativeCallback(url); }).catch(() => {
        if (active) setAuthCallbackError(CALLBACK_ERROR);
      });
    }) : null;

    // initialize() reuses SDK initialization. getSession alone can return an
    // older valid session after a failed callback, so inspect both results.
    (async () => {
      const { error } = await initialized;
      const revisionBeforeRead = authRevision;
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (revisionBeforeRead === authRevision && initializationEpoch === signOutEpoch.current && !signingOut.current) {
        setSession(data.session && !deletedAccountOwners.current.has(data.session.user.id) ? data.session : null);
      }
      // With no PKCE verifier (a different browser), the SDK can skip exchange
      // and retain an older session. A code left in the URL is not a valid reset.
      let unresolvedCallback = false;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const fragment = new URLSearchParams(url.hash.slice(1));
        unresolvedCallback = url.searchParams.has('code') || ['error', 'error_code', 'error_description']
          .some((key) => url.searchParams.has(key) || fragment.has(key));
      }
      if (error || unresolvedCallback) setAuthCallbackError(CALLBACK_ERROR);
      if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (active && initialUrl && initializationEpoch === signOutEpoch.current) await handleNativeCallback(initialUrl);
      }
      if (active) setHydrated(true);
    })().catch(() => {
      if (active) setAuthCallbackError('Could not verify this link. Check your connection and request a new link.');
      if (active) setHydrated(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      authRevision += 1;
      authEventRevision.current += 1;
      if (signingOut.current) return;
      if (next && deletedAccountOwners.current.has(next.user.id)) return;
      setSession(next);
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') setAuthCallbackError(null);
      if (event === 'SIGNED_IN') setPasswordRecovery(false);
      if (event === 'PASSWORD_RECOVERY' && !recoveryCancelled.current) setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      linkSubscription?.remove();
    };
  }, [handleNativeCallback]);

  const value = useMemo<AuthContextValue>(() => {
    const guard = (): AuthResult | null => signingOut.current
      ? { error: 'Please finish signing out before continuing.' }
      : deletionCleanupGate.current ? { error: 'Account cleanup is in progress. Please try again shortly.' }
      : supabaseConfigured ? null : { error: 'Accounts are not available yet.' };

    const signOut = (): Promise<void> => {
      if (!supabaseConfigured) return Promise.resolve();
      if (deletionCleanupFlight.current) return deletionCleanupFlight.current.catch(() => undefined).then(signOut);
      if (signOutFlight.current) return signOutFlight.current;
      signOutEpoch.current += 1;
      signingOut.current = true;
      recoveryCancelled.current = true;
      setSignOutPending(true);
      setSignOutError(null);
      setBusy(true);
      setSession(null);
      setPasswordRecovery(false);
      const operation = (async () => { try {
        // SDK exchanges persist sessions before returning. Wait for all of them,
        // ignore their events/results, then clear that persisted session last.
        await Promise.all([handleNativeCallback.whenIdle(), ...authOperations.current]);
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
        signingOut.current = false;
        setAuthCallbackError(null);
      } catch {
        // Keep incoming auth state suppressed until the user retries sign-out.
        setSignOutError('Could not finish signing out. Check your connection and try again.');
      } finally { setBusy(false); setSignOutPending(false); signOutFlight.current = null; }
      })();
      signOutFlight.current = operation;
      return operation;
    };

    const finalizeDeletedAccount = (expectedUserId: string): Promise<{ clearedSession: boolean; manualCleanupRequired?: boolean }> => {
      if (!supabaseConfigured || !expectedUserId) return Promise.reject(new Error('Could not verify the deleted account.'));
      // Finalizers outlive their route. Serialize them against each other and an
      // explicit sign-out without capturing any screen/provider render's owner.
      if (deletionCleanupFlight.current) return deletionCleanupFlight.current.catch(() => undefined)
        .then(() => finalizeDeletedAccount(expectedUserId));
      if (signOutFlight.current) return signOutFlight.current.then(() => finalizeDeletedAccount(expectedUserId));
      if (signingOut.current) return Promise.reject(new Error('Finish signing out before clearing account data.'));
      deletionCleanupGate.current = true;
      deletionCleanupDraining.current = true;
      setDeletionCleanupPending(true);
      const operation = (async () => {
        let clearingOwner = false;
        try {
          // Existing sign-ins may replace A with B while a deletion RPC is in
          // flight. Drain them first. New sign-ins/links are barred throughout
          // the subsequent SDK-owner check AND local sign-out critical section.
          await Promise.all([handleNativeCallback.whenIdle(), ...authOperations.current]);
          deletionCleanupDraining.current = false;
          // A browser callback may have arrived while its existing social action
          // was draining. Close the gate, then include that last callback too.
          await handleNativeCallback.whenIdle();
          const revisionBeforeOwnerRead = authEventRevision.current;
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (Platform.OS === 'web') {
            deletedAccountOwners.current.add(expectedUserId);
            setSession(current => current?.user.id === expectedUserId ? null : current);
            if (data.session?.user.id === expectedUserId && revisionBeforeOwnerRead === authEventRevision.current) {
              setPasswordRecovery(false);
            }
            // Supabase has no public atomic "sign out only owner A" operation.
            // A local gate/revision check cannot protect shared storage against
            // another tab between getSession and signOut. NEVER call signOut or
            // erase shared auth keys here, even if this snapshot still shows A.
            return { clearedSession: false, manualCleanupRequired: data.session?.user.id === expectedUserId };
          }
          if (data.session?.user.id !== expectedUserId) return { clearedSession: false };

          signOutEpoch.current += 1;
          clearingOwner = true;
          signingOut.current = true;
          recoveryCancelled.current = true;
          setSession(null);
          setPasswordRecovery(false);
          const { error } = await supabase.auth.signOut({ scope: 'local' });
          if (error) throw error;
          signingOut.current = false;
          setSignOutError(null);
          setAuthCallbackError(null);
          return { clearedSession: true };
        } catch (error) {
          if (clearingOwner) setSignOutError('Your account was deleted, but signing out on this device failed. Check your connection and retry sign out.');
          throw error;
        } finally {
          deletionCleanupFlight.current = null;
          deletionCleanupGate.current = false;
          deletionCleanupDraining.current = false;
          setDeletionCleanupPending(false);
        }
      })();
      deletionCleanupFlight.current = operation;
      return operation;
    };

    return {
      session,
      user: session?.user ?? null,
      hydrated,
      busy: busy || authCallbackPending || signOutPending || deletionCleanupPending,
      configured: supabaseConfigured,
      passwordRecovery,
      authCallbackError,
      authCallbackPending,
      appleAvailable,
      signOutError,
      finalizeDeletedAccount,
      dismissPasswordRecovery: () => { recoveryCancelled.current = true; setPasswordRecovery(false); },

      signUp: async (email, password) => {
        const blocked = guard();
        if (blocked) return blocked;
        const endOperation = beginOperation();
        setBusy(true);
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: authRedirectTo() },
          });
          return { error: error?.message, sessionStarted: !!data?.session, signupUserId: data?.user?.id };
        } catch {
          return { error: 'Could not create your account. Check your connection and try again.' };
        } finally {
          endOperation();
          setBusy(false);
        }
      },

      signInWithPassword: async (email, password) => {
        const blocked = guard();
        if (blocked) return blocked;
        const endOperation = beginOperation();
        setBusy(true);
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          return { error: error?.message, sessionStarted: !!data?.session };
        } finally {
          endOperation();
          setBusy(false);
        }
      },

      signInWithGoogle: async (returnTo) => {
        const blocked = guard();
        if (blocked) return blocked;
        if (socialPending.current) return { error: 'Please wait for the current sign-in to finish.' };
        socialPending.current = true;
        const endOperation = beginOperation();
        setBusy(true);
        try {
          const redirectTo = authRedirectTo(returnTo === 'delete-account' ? returnTo : 'auth');
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
          if (res.type === 'success') {
            const result = await handleNativeCallback(res.url);
            return { error: result.handled ? result.error : CALLBACK_ERROR, sessionStarted: !!result.session && !result.error };
          }
          if (res.type === 'cancel' || res.type === 'dismiss') return { cancelled: true };
          return { error: 'Google sign-in did not complete.' };
        } catch {
          if (Platform.OS !== 'web') console.info('[auth] Google sign-in failed unexpectedly');
          return { error: 'Could not finish Google sign-in. Please try again.' };
        } finally {
          endOperation();
          socialPending.current = false;
          setBusy(false);
        }
      },

      signInWithApple: async () => {
        const blocked = guard();
        if (blocked) return blocked;
        if (!appleAvailable || Platform.OS !== 'ios') return { error: 'Apple sign-in is not available on this device.' };
        if (socialPending.current || busy || authCallbackPending) return { error: 'Please wait for the current sign-in to finish.' };
        socialPending.current = true;
        const endOperation = beginOperation();
        setBusy(true);
        try {
          const result = await signInWithAppleNative(supabase.auth);
          return signingOut.current ? { cancelled: true } : result;
        }
        finally { endOperation(); socialPending.current = false; setBusy(false); }
      },

      signOut,

      resetPassword: async (email) => {
        const blocked = guard();
        if (blocked) return blocked;
        const endOperation = beginOperation();
        setBusy(true);
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: authRedirectTo('reset-password'),
          });
          return { error: error?.message };
        } catch {
          return { error: 'Could not send a reset link. Check your connection and try again.' };
        } finally {
          endOperation();
          setBusy(false);
        }
      },

      verifySignupCode: async (email, code) => {
        const blocked = guard();
        if (blocked) return blocked;
        const endOperation = beginOperation();
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
          endOperation();
          setBusy(false);
        }
      },

      resendSignupCode: async (email) => {
        const blocked = guard();
        if (blocked) return blocked;
        const endOperation = beginOperation();
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
          endOperation();
          setBusy(false);
        }
      },

      updatePassword: async (password) => {
        const blocked = guard();
        if (blocked) return blocked;
        if (authCallbackError) return { error: authCallbackError };
        if (authCallbackPending || !session || !passwordRecovery) return { error: 'Open a new password reset link before continuing.' };
        if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
        const endOperation = beginOperation();
        setBusy(true);
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (!error) setPasswordRecovery(false);
          return { error: error?.message };
        } catch {
          return { error: 'Could not update your password. Check your connection and try again.' };
        } finally {
          endOperation();
          setBusy(false);
        }
      },
    };
  }, [session, hydrated, busy, passwordRecovery, authCallbackError, authCallbackPending, appleAvailable, handleNativeCallback, beginOperation, signOutPending, signOutError, deletionCleanupPending]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
