import type { Session, SupabaseClient } from '@supabase/supabase-js';

export const CALLBACK_ERROR = 'This link could not be verified. Request a new link and open it on the same device and in the same app or browser where you requested it.';

export interface NativeCallbackResult {
  handled: boolean;
  error?: string;
  session?: Session;
  recovery?: boolean;
}

/** One handler per mounted auth provider. PKCE verifiers stay in Supabase storage. */
export function createNativeCallbackHandler(
  auth: Pick<SupabaseClient['auth'], 'exchangeCodeForSession'>,
  onStart: () => void,
  onComplete: (result: NativeCallbackResult) => void,
  canStart: () => boolean = () => true,
) {
  const attempts = new Map<string, Promise<NativeCallbackResult>>();
  let running = false;

  const handle = (rawUrl: string): Promise<NativeCallbackResult> => {
    if (!canStart()) return Promise.resolve({ handled: true, error: 'Please finish signing out before opening another sign-in link.' });
    let url: URL;
    try { url = new URL(rawUrl); } catch { return Promise.resolve({ handled: false }); }
    // Never exchange credentials found in arbitrary web links or app content URLs.
    if (url.protocol !== 'galactoguide:' || url.username || url.password || url.port ||
        url.pathname !== '' || !['auth', 'reset-password', 'delete-account'].includes(url.hostname)) {
      return Promise.resolve({ handled: false });
    }
    const code = url.searchParams.get('code');
    const invalid = !!url.hash || !code || url.searchParams.getAll('code').length !== 1 ||
      ['error', 'error_code', 'error_description', 'errorCode'].some(key => url.searchParams.has(key));
    const key = invalid ? rawUrl : code;
    // Linking and WebBrowser may deliver the same callback concurrently. A second
    // delivery must neither spend the one-time code nor reactivate recovery.
    const previous = attempts.get(key);
    if (previous) return previous;
    if (running) return Promise.resolve({ handled: true, error: 'Another sign-in link is being checked. Please try this link again.' });
    running = true;
    onStart();
    const attempt = (async (): Promise<NativeCallbackResult> => {
      if (invalid) return { handled: true, error: CALLBACK_ERROR };
      try {
        const { data, error } = await auth.exchangeCodeForSession(code);
        if (error || !data.session) return { handled: true, error: CALLBACK_ERROR };
        // Supabase stores this marker with the PKCE verifier when requesting a
        // password reset. The URL route alone is not proof of recovery intent.
        // auth-js returns redirectType at runtime, but its public AuthTokenResponse
        // declaration omits it. Fail closed if a future SDK stops returning it.
        const recovery = (data as typeof data & { redirectType?: string | null }).redirectType === 'recovery';
        if (url.hostname === 'reset-password' && !recovery) return { handled: true, error: CALLBACK_ERROR };
        return { handled: true, session: data.session, recovery };
      } catch {
        return { handled: true, error: CALLBACK_ERROR };
      }
    })().then(result => {
      running = false;
      onComplete(result);
      return result;
    });
    attempts.set(key, attempt);
    // Keep only bounded, in-memory replay protection; never persist/log codes.
    if (attempts.size > 64) attempts.delete(attempts.keys().next().value!);
    return attempt;
  };
  return Object.assign(handle, { whenIdle: () => Promise.all(attempts.values()) });
}
