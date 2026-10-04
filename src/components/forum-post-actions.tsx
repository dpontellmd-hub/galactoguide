import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ForumAuthPrompt } from '@/components/forum-auth-prompt';
import { useAuth } from '@/context/AuthContext';
import { useForum, type ForumTargetKind } from '@/context/ForumContext';
import { font, fontSize, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export function helpfulCountLabel(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? 'person' : 'people'} found this helpful`;
}

export function ForumPostActions({ kind, id, userId, isSample, onDeleted, children }: {
  kind: ForumTargetKind; id: string; userId: string | null; isSample: boolean; onDeleted?: () => void;
  children?: ReactNode;
}) {
  const { user } = useAuth();
  const { getHelpful, setHelpful, deletePost } = useForum();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const helpful = getHelpful(kind, id);
  const helpfulCount = helpful?.count ?? 0;
  const [confirming, setConfirming] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = !!user && userId === user.id && !isSample;

  const act = async (action: 'helpful' | 'delete') => {
    if (pending.current) return;
    if (!user) { setAuthPrompt(true); return; }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = action === 'delete' ? await deletePost(kind, id)
        : await setHelpful(kind, id, helpful ? !helpful.marked : undefined);
      if (result.error) setError(result.error);
      else if (action === 'delete') { setConfirming(false); onDeleted?.(); }
    } catch {
      setError('Could not save that change. Please try again.');
    } finally { pending.current = false; setBusy(false); }
  };

  return (
    <View style={styles.root} testID={`post-actions-${id}`}>
      <View style={styles.row}>
        {/* Pressable exposes a selected state to assistive technology; Expo UI Button does not. */}
        <Pressable onPress={() => void act('helpful')} disabled={busy}
          accessibilityRole="button" accessibilityLabel={helpful?.marked ? 'Undo helpful vote' : 'Was this helpful?'}
          accessibilityState={{ selected: helpful?.marked ?? false, disabled: busy, busy }}
          aria-pressed={helpful?.marked ?? false}
          style={({ pressed }) => [styles.helpful, (pressed || busy) && styles.dim]}>
          <Ionicons name={helpful?.marked ? 'thumbs-up' : 'thumbs-up-outline'} size={14}
            color={helpful?.marked ? colors.accent : colors.textMuted} />
          <Text style={[styles.helpfulText, helpful?.marked && styles.selectedText]}>Helpful</Text>
        </Pressable>
        {children}
        {canDelete && !confirming && (
          <Pressable onPress={() => { setError(null); setConfirming(true); }} disabled={busy}
            accessibilityRole="button" accessibilityLabel={`Delete ${kind}`}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.dim]}>
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            <Text style={styles.secondary}>Delete</Text>
          </Pressable>
        )}
      </View>
      {helpfulCount > 0 && (
        <Text style={styles.secondary} accessibilityLiveRegion="polite">{helpfulCountLabel(helpfulCount)}</Text>
      )}
      {confirming && canDelete && (
        <View style={styles.confirmation}>
          <Text style={styles.message} selectable>
            {kind === 'thread'
              ? 'Delete your thread? Your title, post, and author name will be removed. Everyone’s replies and responses will stay. This cannot be undone.'
              : 'Delete your reply? Other people’s responses will stay. This cannot be undone.'}
          </Text>
          <View style={styles.row}>
            <Pressable onPress={() => { setConfirming(false); setError(null); }} disabled={busy}
              accessibilityRole="button" accessibilityLabel="Cancel deletion" style={styles.deleteButton}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => void act('delete')} disabled={busy}
              accessibilityRole="button" accessibilityLabel={`Confirm delete ${kind}`}
              accessibilityState={{ disabled: busy, busy }} style={[styles.deleteButton, busy && styles.dim]}>
              <Text style={styles.buttonText}>{busy ? 'Deleting…' : `Delete ${kind}`}</Text>
            </Pressable>
          </View>
        </View>
      )}
      {error && <Text style={styles.message} accessibilityRole="alert" selectable>{error}</Text>}
      {authPrompt && !user && <ForumAuthPrompt action="mark posts helpful" />}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { gap: spacing.xs, marginTop: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  helpful: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: spacing.sm },
  helpfulText: { ...font.semibold, color: colors.textMuted, fontSize: fontSize.tiny },
  selectedText: { color: colors.accent },
  deleteButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  buttonText: { ...font.bold, color: colors.accent, fontSize: fontSize.small, flexShrink: 1 },
  secondary: { ...font.semibold, color: colors.textMuted, fontSize: fontSize.small },
  message: { ...font.semibold, color: colors.textSecondary, fontSize: fontSize.body, lineHeight: 20 },
  confirmation: { padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.cream },
  dim: { opacity: 0.6 },
});
