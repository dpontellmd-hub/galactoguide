import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export const DELETION_CONFIRMATION = 'DELETE';
export const DELETION_SUPPORT_URL = 'mailto:adam@dyadhealthcollective.com?subject=GalactoGuide%20account%20deletion%20request';

export interface DeletionReceipt {
  ownerId: string;
  phase: 'clearing' | 'complete' | 'local_cleanup_failed';
}
// Ephemeral, process-local receipt: survives route/provider hydration remounts,
// but is never trusted from a URL, persisted storage, or a caller callback.
let receipt: DeletionReceipt | null = null;
const receiptListeners = new Set<() => void>();
export const getDeletionReceipt = () => receipt;
export const getServerDeletionReceipt = () => null;
export function subscribeDeletionReceipt(listener: () => void) {
  receiptListeners.add(listener);
  return () => { receiptListeners.delete(listener); };
}
export function setDeletionReceipt(next: DeletionReceipt | null) {
  receipt = next;
  receiptListeners.forEach((listener) => listener());
}

export function accountCacheKeys(userId: string): string[] {
  return ['favorites', 'session', 'situations'].map((name) => `galactoguide.${name}.v2:${userId}`);
}

/** The server derives the owner from the verified JWT. Never send a target user ID. */
export async function deleteOwnAccount(confirmation: string, accessToken: string): Promise<{ deleted: boolean; error?: string }> {
  if (confirmation !== DELETION_CONFIRMATION) return { deleted: false, error: 'Type DELETE to confirm.' };
  if (!supabaseConfigured) return { deleted: false, error: 'Account deletion is not configured. Use the deletion request link for help.' };
  try {
    if (!accessToken) return { deleted: false, error: 'Sign in again before deleting your account.' };
    const { data, error } = await supabase.rpc('delete_own_account', { p_confirmation: confirmation })
      .setHeader('Authorization', `Bearer ${accessToken}`);
    if (error) {
      const messages: Record<string, string> = {
        deletion_disabled: 'Automatic deletion is not available yet. Use the deletion request link below; support must verify account ownership before deleting anything.',
        deletion_reauthentication_required: 'Please verify your identity below, then type DELETE again to confirm.',
        deletion_apple_revocation_required: 'This account uses Apple sign-in. Use the deletion request link so support can verify ownership and complete Apple authorization revocation before deletion.',
        deletion_session_invalid: 'This session is no longer valid. Sign in again before deleting your account.',
      };
      return { deleted: false, error: messages[error.message] ?? 'Deletion was not confirmed. Check your connection and try again, or contact support. No success has been reported.' };
    }
    return data === true
      ? { deleted: true }
      : { deleted: false, error: 'Deletion was not confirmed. Contact support before trying again.' };
  } catch {
    return { deleted: false, error: 'The result could not be confirmed. Check your connection. If you cannot sign in again, contact support to check whether deletion completed.' };
  }
}

/** Call after local sign-out so account providers cannot repopulate these keys. */
export async function clearDeletedAccountCache(userId: string): Promise<void> {
  await AsyncStorage.multiRemove(accountCacheKeys(userId));
}
