import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { clearDeletedAccountCache, deleteOwnAccount, DELETION_SUPPORT_URL, getDeletionReceipt, getServerDeletionReceipt, setDeletionReceipt, subscribeDeletionReceipt } from '@/lib/account-deletion';
import { font, radius, spacing, useThemedStyles, type ThemeColors } from '@/theme';

export default function DeleteAccountScreen() {
  const auth = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const storedReceipt = useSyncExternalStore(subscribeDeletionReceipt, getDeletionReceipt, getServerDeletionReceipt);
  const receipt = storedReceipt && (!auth.user || auth.user.id === storedReceipt.ownerId) ? storedReceipt : null;
  useEffect(() => {
    if (storedReceipt && auth.user && auth.user.id !== storedReceipt.ownerId) setDeletionReceipt(null);
  }, [storedReceipt, auth.user]);
  const deleted = !!receipt;
  const inFlight = useRef(false);
  const providers = auth.user?.identities?.map((identity) => identity.provider) ?? [];

  // Switching accounts or returning from a provider never carries deletion consent.
  const [consentOwner, setConsentOwner] = useState(auth.user?.id);
  if (consentOwner !== auth.user?.id) {
    setConsentOwner(auth.user?.id);
    setConfirmation('');
    setPassword('');
  }

  const verify = async (provider: 'password' | 'google' | 'apple') => {
    if (inFlight.current) return;
    inFlight.current = true;
    setWorking(true); setMessage(''); setConfirmation('');
    try {
      const result = provider === 'password'
        ? await auth.signInWithPassword(auth.user?.email ?? '', password)
        : provider === 'google' ? await auth.signInWithGoogle('delete-account') : await auth.signInWithApple();
      setMessage(result.error ?? (result.cancelled ? 'Verification cancelled. Your account was not deleted.'
        : result.sessionStarted ? 'Identity verified. Review the account shown and type DELETE to confirm.'
        : 'Review the account shown before confirming. Only a completed sign-in verifies your identity; cancelling does not delete anything.'));
    } catch { setMessage('Could not verify your identity. Please try again.'); }
    finally { setPassword(''); setWorking(false); inFlight.current = false; }
  };

  const remove = async () => {
    const owner = auth.user?.id;
    if (inFlight.current || !owner || confirmation !== 'DELETE' || auth.authCallbackError || auth.busy || !auth.hydrated) return;
    inFlight.current = true;
    setWorking(true); setMessage('');
    let serverDeleted = false;
    try {
      // Capture the account being confirmed. A concurrent account switch must not
      // turn consent for one account into a deletion request for another account.
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id !== owner) {
        setMessage('The signed-in account changed. Review it and confirm again.');
        return;
      }
      const result = await deleteOwnAccount(confirmation, data.session.access_token);
      if (!result.deleted) { setMessage(result.error ?? 'Deletion was not confirmed.'); return; }
      serverDeleted = true;
      setDeletionReceipt({ ownerId: owner, phase: 'clearing' });
      // The provider outlives this route. It serializes auth operations and
      // checks the live SDK session before clearing only the deleted account.
      // A stale screen ref after unmount must never sign out a newer account.
      const cleanup = await auth.finalizeDeletedAccount(owner);
      await clearDeletedAccountCache(owner);
      setDeletionReceipt({ ownerId: owner, phase: cleanup.manualCleanupRequired ? 'manual_cleanup' : 'complete' });
    } catch {
      if (serverDeleted) setDeletionReceipt({ ownerId: owner, phase: 'local_cleanup_failed' });
      else setMessage('Deletion was not confirmed. Check your connection and try again.');
    } finally { setConfirmation(''); setPassword(''); setWorking(false); inFlight.current = false; }
  };

  const disabled = working || auth.busy || !auth.hydrated;
  const receiptMessage = receipt?.phase === 'complete'
    ? 'Your confirmed account and its saved data were deleted. Your discussion text and author identity were removed; other people’s replies remain.'
    : receipt?.phase === 'manual_cleanup' ? 'Your confirmed account was deleted. This browser’s saved sign-in was not cleared automatically. Clear GalactoGuide site data in your browser settings before sharing this device. This also signs out any other GalactoGuide account in this browser.'
    : receipt?.phase === 'clearing' ? 'Account deletion confirmed. Clearing this device’s account data…'
    : receipt?.phase === 'local_cleanup_failed' ? 'Deletion completed, but this device could not finish clearing local data. Clear this app’s storage or this website’s site data before sharing the device.' : '';
  return (
    <View style={styles.root}>
      <ScreenHeader title="Delete account" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Your account, your choice</Text>
        <Text style={styles.copy}>Deletion is permanent. It removes your sign-in account, synced saved substances, selected situations, preferences, and helpful votes. Your own discussion titles, text, and author identity become deleted-content placeholders. Other people’s replies remain.</Text>
        <Text style={styles.copy}>Copies made by other people, previous support emails, service logs, and backups are separate from the active account. Contact support about those records. Do not include medical information or passwords in a request.</Text>
        {receiptMessage || message ? <Text accessibilityRole="alert" style={styles.notice}>{receiptMessage || message}</Text> : null}
        {auth.authCallbackError ? <Text accessibilityRole="alert" style={styles.notice}>{auth.authCallbackError}</Text> : null}
        {!deleted && auth.user ? <>
          <Text style={styles.heading}>Account: {auth.user.email ?? 'Current signed-in account'}</Text>
          <Text style={styles.copy}>Verify your identity with a fresh sign-in before deleting. After verification, review the account and confirm below within five minutes.</Text>
          {providers.includes('email') && <>
            <TextInput secureTextEntry value={password} onChangeText={setPassword} style={styles.input} placeholder="Current password" accessibilityLabel="Current password" autoComplete="current-password" editable={!disabled} />
            <Pressable style={styles.button} disabled={disabled || !password} onPress={() => verify('password')} accessibilityRole="button"><Text style={styles.buttonText}>Verify with password</Text></Pressable>
          </>}
          {providers.includes('google') && <Pressable style={styles.button} disabled={disabled} onPress={() => verify('google')} accessibilityRole="button"><Text style={styles.buttonText}>Verify with Google</Text></Pressable>}
          {Platform.OS === 'ios' && providers.includes('apple') && auth.appleAvailable && <View pointerEvents={disabled ? 'none' : 'auto'} accessibilityElementsHidden={disabled}>
            <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} style={{ height: 44, width: '100%' }} cornerRadius={radius.md} onPress={() => verify('apple')} />
          </View>}
          <Text style={styles.copy}>Type DELETE to permanently delete the account shown above. You can leave this page to cancel.</Text>
          <TextInput value={confirmation} onChangeText={setConfirmation} style={styles.input} placeholder="DELETE" accessibilityLabel="Type DELETE to confirm permanent account deletion" autoCapitalize="characters" autoCorrect={false} editable={!disabled} />
          <Pressable style={[styles.button, (disabled || confirmation !== 'DELETE') && styles.disabled]} disabled={disabled || confirmation !== 'DELETE' || !!auth.authCallbackError} onPress={remove} accessibilityRole="button"><Text style={styles.buttonText}>{working ? 'Please wait…' : 'Permanently delete my account'}</Text></Pressable>
        </> : !deleted ? <>
          <Text style={styles.copy}>Sign in to verify which account you want to delete. If you cannot sign in, use the deletion request link; support must verify ownership before acting.</Text>
          <Pressable style={styles.button} onPress={() => router.push('/auth')} accessibilityRole="button"><Text style={styles.buttonText}>Sign in</Text></Pressable>
        </> : null}
        <Pressable style={styles.button} onPress={() => Linking.openURL(DELETION_SUPPORT_URL).catch(() => setMessage('Email adam@dyadhealthcollective.com with the subject GalactoGuide account deletion request.'))} accessibilityRole="link"><Text style={styles.buttonText}>Request deletion / Get help</Text></Pressable>
        <Text style={styles.copy}>Email adam@dyadhealthcollective.com. Include the email used for your account. Sending a request does not itself delete an account; support will verify ownership and explain the next steps.</Text>
        <Pressable style={styles.button} disabled={working || receipt?.phase === 'clearing'} onPress={() => { setDeletionReceipt(null); router.replace('/account'); }} accessibilityRole="button"><Text style={styles.buttonText}>{deleted ? 'Return to account' : 'Cancel / Keep my account'}</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: 50 },
  heading: { ...font.bold, fontSize: 18, color: colors.text },
  copy: { ...font.regular, fontSize: 15, lineHeight: 23, color: colors.textSecondary },
  notice: { ...font.semibold, fontSize: 15, lineHeight: 23, color: colors.text, padding: spacing.md, backgroundColor: colors.inputBg },
  input: { ...font.regular, color: colors.text, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, padding: spacing.md, borderRadius: radius.md },
  button: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, padding: spacing.md },
  buttonText: { ...font.semibold, color: colors.text, fontSize: 15 },
  disabled: { opacity: 0.45 },
});
