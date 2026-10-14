import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Native Apple sheet + nonce-bound Supabase exchange. No client secret belongs here. */
export async function signInWithAppleNative(auth: Pick<SupabaseClient['auth'], 'signInWithIdToken'>) {
  try {
    const bytes = await Crypto.getRandomBytesAsync(32);
    const nonce = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const state = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
      state,
    });
    if (!credential.identityToken || credential.state !== state) {
      return { error: 'Apple sign-in could not be verified. Please try again.' };
    }
    const { data, error } = await auth.signInWithIdToken({
      provider: 'apple', token: credential.identityToken, nonce,
    });
    if (error || !data.session) return { error: 'Could not finish Apple sign-in. Please try again.' };
    return { sessionStarted: true };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      return { cancelled: true };
    }
    return { error: 'Could not finish Apple sign-in. Please try again.' };
  }
}
