import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useForum, type ForumTargetKind } from '@/context/ForumContext';
import { font, fontSize, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export const REPORT_CATEGORIES = [
  ['harassment', 'Harassment'], ['hate', 'Hate or discrimination'], ['threat', 'Threats or violence'],
  ['privacy', 'Private information'], ['spam', 'Spam or promotion'], ['medical', 'Unsafe medical claims'], ['other', 'Other'],
] as const;

export function ForumSafetyActions({ kind, id, userId }: { kind: ForumTargetKind; id: string; userId: string }) {
  const { user } = useAuth();
  // Remount drafts and confirmations when the account changes.
  return <SafetyActions key={`${user?.id ?? 'anonymous'}:${kind}:${id}`} kind={kind} id={id} userId={userId} />;
}
function SafetyActions({ kind, id, userId }: { kind: ForumTargetKind; id: string; userId: string }) {
  const { user } = useAuth();
  const { reportPost, setBlocked } = useForum();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<'report' | 'block' | null>(null);
  const [category, setCategory] = useState<string>('other');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const submit = async () => {
    if (pending.current || !user || !mode) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = mode === 'report' ? await reportPost(kind, id, category, reason) : await setBlocked(userId, true);
      if (result.error) setError(result.error);
      else { if (mode === 'report') setSent(true); setMode(null); setReason(''); }
    } catch { setError('Could not save that change. Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <View style={styles.root}>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Report ${kind}`} disabled={busy || sent}
        style={styles.button} onPress={() => { setMode('report'); setError(null); }}>
        <Text style={styles.action}>{sent ? 'Reported' : 'Report'}</Text>
      </Pressable>
      {user && user.id !== userId && <Pressable accessibilityRole="button" accessibilityLabel="Block member"
        disabled={busy} style={styles.button} onPress={() => { setMode('block'); setError(null); }}>
        <Text style={styles.action}>Block member</Text>
      </Pressable>}
    </View>
    {sent && <Text style={styles.text} accessibilityLiveRegion="polite">Report received for moderator review. This is not an emergency service.</Text>}
    {mode && <View style={styles.panel}>
      {!user ? <>
        <Text style={styles.text}>Sign in to report this post. You can also use the contact address in Community rules.</Text>
        <Pressable accessibilityRole="link" style={styles.button} onPress={() => router.push('/community-rules')}><Text style={styles.action}>Community rules & contact</Text></Pressable>
      </> : mode === 'block' ? <Text style={styles.text}>Block this member? Their posts will disappear from your signed-in view and they cannot reply to your posts while the block is active. Public posts may still be visible when signed out. Manage blocks in Community rules & safety.</Text> : <>
        <Text style={styles.text}>Report this {kind} to the community moderators. Choose a reason; avoid adding private health or contact information.</Text>
        <View style={styles.row}>{REPORT_CATEGORIES.map(([value, label]) => <Pressable key={value}
          accessibilityRole="radio" accessibilityState={{ checked: category === value }} disabled={busy}
          style={[styles.button, category === value && styles.selected]} onPress={() => setCategory(value)}>
          <Text style={styles.action}>{label}</Text>
        </Pressable>)}</View>
        <TextInput accessibilityLabel="Report details (optional)" placeholder="Additional details (optional)" placeholderTextColor={colors.textMuted}
          value={reason} onChangeText={setReason} maxLength={500} multiline editable={!busy} style={styles.input} />
      </>}
      {error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => { setMode(null); setReason(''); setError(null); }}><Text style={styles.action}>Cancel</Text></Pressable>
        {user && <Pressable accessibilityRole="button" accessibilityLabel={mode === 'report' ? 'Send report' : 'Confirm block member'}
          accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void submit()} style={styles.button}>
          <Text style={styles.action}>{busy ? 'Saving…' : mode === 'report' ? 'Send report' : 'Block member'}</Text>
        </Pressable>}
      </View>
    </View>}
  </View>;
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { gap: spacing.sm }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.md },
  action: { ...font.bold, color: colors.accent, fontSize: fontSize.small },
  text: { ...font.regular, color: colors.text, fontSize: fontSize.body, lineHeight: 22 },
  panel: { backgroundColor: colors.cream, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  selected: { borderWidth: 1, borderColor: colors.accent },
  input: { minHeight: 90, textAlignVertical: 'top', padding: spacing.md, color: colors.text, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md },
});
