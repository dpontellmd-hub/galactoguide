import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/** Fresh Apple grant; no Supabase session replacement or provider-token storage. */
export async function deleteAppleAccount(accessToken: string): Promise<{ deleted: boolean; error?: string }> {
  if (Platform.OS !== 'ios' || Constants.expoConfig?.extra?.appleSignInEnabled !== true) {
    return { deleted: false, error: 'Apple authorization revocation is not available here. Use the deletion request link for help.' };
  }
  const invoke = (body: Record<string, string>) => supabase.functions.invoke('apple-account-deletion', {
    body, headers: { Authorization: `Bearer ${accessToken}` }, timeout: 60000,
  });
  try {
    if (!accessToken || !await AppleAuthentication.isAvailableAsync()) throw new Error('unavailable');
    const start = await invoke({ action: 'challenge', confirmation: 'DELETE' });
    const challenge = start.data;
    if (start.error || !/^[a-f0-9-]{36}$/.test(challenge?.id ?? '') || !/^[a-f0-9]{64}$/.test(challenge?.nonce ?? '')) throw new Error('unavailable');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [], state: challenge.id,
      nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, challenge.nonce),
    });
    if (credential.state !== challenge.id || !credential.authorizationCode) throw new Error('unverified');
    const finish = await invoke({ action: 'complete', confirmation: 'DELETE', requestId: challenge.id, code: credential.authorizationCode });
    if (!finish.error && finish.data?.deleted === true) return { deleted: true };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      return { deleted: false, error: 'Apple verification cancelled. Your account was not deleted.' };
    }
  }
  return { deleted: false, error: 'Deletion was not confirmed. Apple access may already have been revoked. Sign in again to retry, or use the deletion request link for help.' };
}
