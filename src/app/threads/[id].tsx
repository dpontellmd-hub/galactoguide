import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ForumAuthPrompt } from '@/components/forum-auth-prompt';
import { ForumAuthorRow } from '@/components/forum-author-row';
import { ForumPostActions } from '@/components/forum-post-actions';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormScrollView } from '@/components/form-scroll-view';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/context/AuthContext';
import { useForum } from '@/context/ForumContext';
import { usePortal } from '@/context/PortalContext';
import { type ForumReply } from '@/data/forum';
import { sendCommentReport } from '@/lib/forum-report';
import { font, fontSize, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

function forumMention(name: string): string {
  const username = name.replace(/[^\p{L}\p{N}_]/gu, '');
  return `@${username || 'member'}`;
}

function splitLeadingMention(body: string): { mention: string | null; rest: string } {
  const match = body.match(/^(@[^\s]+)([\s\S]*)$/);
  return match ? { mention: match[1], rest: match[2] } : { mention: null, rest: body };
}

export default function ThreadDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { portal, disclaimerAccepted } = usePortal();
  const { colors } = useTheme();
  const { getThread, getReplies, loading, refreshing, refresh, addReply } = useForum();
  const styles = useThemedStyles(makeStyles);
  const thread = id ? getThread(id) : undefined;
  const replies = useMemo(() => (id ? getReplies(id) : []), [getReplies, id]);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [body, setBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<ForumReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportNoticeId, setReportNoticeId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const reportPending = useRef(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => new Set());

  const submitReport = async (reply: ForumReply) => {
    if (!thread || reportPending.current || reportedIds.has(reply.id)) return;
    reportPending.current = true;
    setReportBusy(true);
    setReportError(null);
    try {
      await sendCommentReport(thread, reply, reportReason);
      setReportedIds((current) => new Set(current).add(reply.id));
      setReportReason('');
    } catch (cause) {
      setReportError(cause instanceof Error ? cause.message : 'Could not send your report. Please try again.');
    } finally {
      reportPending.current = false;
      setReportBusy(false);
    }
  };

  const replyIds = useMemo(() => new Set(replies.map((reply) => reply.id)), [replies]);
  const rootReplies = useMemo(
    () => replies.filter((reply) => !reply.parentReplyId || !replyIds.has(reply.parentReplyId)),
    [replies, replyIds],
  );
  const repliesByParent = useMemo(() => {
    const grouped = new Map<string, ForumReply[]>();
    replies.forEach((reply) => {
      if (!reply.parentReplyId || !replyIds.has(reply.parentReplyId)) return;
      const group = grouped.get(reply.parentReplyId) ?? [];
      group.push(reply);
      grouped.set(reply.parentReplyId, group);
    });
    return grouped;
  }, [replies, replyIds]);
  const replyMention = replyingTo ? forumMention(replyingTo.authorName) : null;
  const replyDraft = body.trimStart();
  const replyMessage = replyMention && replyDraft.startsWith(replyMention)
    ? replyDraft.slice(replyMention.length).trimStart()
    : replyDraft;
  const canPost = replyMessage.trim().length >= 2;

  const startReplyTo = (reply: ForumReply) => {
    const mention = forumMention(reply.authorName);
    const previousMention = replyingTo ? forumMention(replyingTo.authorName) : null;
    setReplyingTo(reply);
    setError(null);
    setBody((current) => {
      const trimmed = current.trimStart();
      if (!trimmed || trimmed === previousMention) return `${mention} `;
      if (trimmed === mention || trimmed.startsWith(`${mention} `)) return current;
      return `${mention} ${trimmed}`;
    });
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      inputRef.current?.focus();
    });
  };

  const cancelReply = () => {
    const mention = replyingTo ? forumMention(replyingTo.authorName) : null;
    if (mention) {
      setBody((current) => {
        const trimmed = current.trimStart();
        return trimmed === mention || trimmed.startsWith(`${mention} `)
          ? trimmed.slice(mention.length).trimStart()
          : current;
      });
    }
    setReplyingTo(null);
  };

  const submitReply = async () => {
    if (!id || busy || !canPost) return;
    const mention = replyingTo ? forumMention(replyingTo.authorName) : null;
    const cleanBody = body.trim();
    const replyBody = mention && cleanBody !== mention && !cleanBody.startsWith(`${mention} `)
      ? `${mention} ${cleanBody}`
      : cleanBody;
    const parentReplyId = replyingTo
      ? (replyingTo.parentReplyId ?? replyingTo.id)
      : null;
    setBusy(true);
    setError(null);
    try {
      const result = await addReply(id, replyBody, parentReplyId);
      if (result.error) setError(result.error);
      else {
        setBody('');
        setReplyingTo(null);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!portal || !disclaimerAccepted) return <Redirect href="/" />;

  if (!thread) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Thread" />
        <View style={styles.missing}>
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Text style={styles.missingTitle}>This thread isn&apos;t available.</Text>
              <Text style={styles.missingText}>It may have been removed or the link may be incomplete.</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
    >
      <ScreenHeader title="Thread" />
      <FormScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 34 }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        <View style={styles.threadCard}>
          <View style={styles.badgeRow}>
            <View style={styles.topicBadge}>
              <Text style={styles.topicText}>{thread.topic}</Text>
            </View>
            {thread.isSample && (
              <View style={styles.exampleBadge}>
                <Text style={styles.exampleText}>EXAMPLE</Text>
              </View>
            )}
          </View>
          <Text style={styles.title} selectable>
            {thread.title}
          </Text>
          {!thread.deletedAt && <ForumAuthorRow
            name={thread.authorName}
            createdAt={thread.createdAt}
            isSample={thread.isSample}
          />}
          <View style={styles.divider} />
          <Text style={styles.body} selectable>
            {thread.body}
          </Text>
          {!thread.deletedAt && <ForumPostActions kind="thread" id={thread.id}
            userId={thread.userId} isSample={thread.isSample} />}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="people-outline" size={18} style={styles.noteIcon} />
          <Text style={styles.noteText}>
            Share experiences with care. For medical concerns or urgent symptoms, contact a
            qualified healthcare professional.
          </Text>
        </View>

        <View style={styles.repliesHeader}>
          <SectionLabel>Replies</SectionLabel>
          <Text style={styles.replyCount}>{replies.length}</Text>
        </View>

        {replies.length > 0 ? (
          <View style={styles.repliesList}>
            {rootReplies.map((reply) => {
              const nestedReplies = repliesByParent.get(reply.id) ?? [];
              const renderReply = (item: ForumReply) => {
                const { mention, rest } = splitLeadingMention(item.body);
                return (
                  <View key={item.id} style={styles.replyContent}>
                    <ForumAuthorRow
                      name={item.authorName}
                      createdAt={item.createdAt}
                      isSample={item.isSample}
                    />
                    <Text style={styles.replyBody} selectable>
                      {mention && <Text style={styles.replyMention}>{mention}</Text>}
                      {rest}
                    </Text>
                    <ForumPostActions kind="reply" id={item.id} userId={item.userId} isSample={item.isSample}
                      onDeleted={() => { if (replyingTo?.id === item.id) cancelReply(); }}>
                        <Pressable
                          onPress={() => startReplyTo(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Reply to ${item.authorName}`}
                          style={({ pressed }) => [styles.replyButton, pressed && styles.pressed]}
                        >
                          <Ionicons name="arrow-undo-outline" size={14} style={styles.replyIcon} />
                          <Text style={styles.replyActionText}>Reply</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            if (reportPending.current) return;
                            setReportNoticeId(item.id);
                            setReportReason('');
                            setReportError(null);
                          }}
                          disabled={reportBusy || reportedIds.has(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Report comment by ${item.authorName}`}
                          accessibilityState={{ disabled: reportBusy || reportedIds.has(item.id) }}
                          style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}
                        >
                          <Ionicons name="flag-outline" size={14} style={styles.reportIcon} />
                          <Text style={styles.reportText}>{reportedIds.has(item.id) ? 'Reported' : 'Report'}</Text>
                        </Pressable>
                    </ForumPostActions>
                    {(reportNoticeId === item.id || reportedIds.has(item.id)) && (
                      <View style={styles.reportNotice} accessibilityLiveRegion="polite">
                        {reportedIds.has(item.id) ? (
                          <Text style={styles.reportNoticeText}>
                            Report submitted. Thank you for letting us know.
                          </Text>
                        ) : (
                          <>
                            <Text style={styles.reportNoticeText}>
                              Send this comment and its thread details to the GalactoGuide team for review?
                            </Text>
                            <TextInput
                              value={reportReason}
                              onChangeText={setReportReason}
                              placeholder="Why are you reporting this? (optional)"
                              placeholderTextColor={colors.textFaint}
                              accessibilityLabel="Reason for reporting (optional)"
                              multiline
                              maxLength={1000}
                              editable={!reportBusy}
                              style={styles.input}
                            />
                            {reportError && <Text style={styles.error} accessibilityRole="alert" selectable>{reportError}</Text>}
                            <View style={styles.reportActions}>
                              <Pressable onPress={() => { setReportNoticeId(null); setReportError(null); setReportReason(''); }}
                                disabled={reportBusy} accessibilityRole="button" accessibilityLabel="Cancel report"
                                accessibilityState={{ disabled: reportBusy }} style={styles.reportButton}>
                                <Text style={styles.reportText}>Cancel</Text>
                              </Pressable>
                              <Pressable onPress={() => void submitReport(item)} disabled={reportBusy}
                                accessibilityRole="button" accessibilityLabel="Send report"
                                accessibilityState={{ disabled: reportBusy, busy: reportBusy }}
                                style={[styles.postButton, reportBusy && styles.disabled]}>
                                <Text style={styles.postButtonText}>{reportBusy ? 'Sending…' : 'Send report'}</Text>
                              </Pressable>
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              };

              return (
                <View key={reply.id} style={styles.replyCard}>
                  {renderReply(reply)}
                  {nestedReplies.length > 0 && (
                    <View style={styles.nestedReplies}>
                      {nestedReplies.map((nestedReply) => renderReply(nestedReply))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyReplies}>No replies yet. You can be the first to respond.</Text>
        )}

        {user ? (
          <View style={styles.composerCard}>
            <View style={styles.composerHeading}>
              <Text style={styles.composerTitle}>
                {replyingTo ? `Reply to ${replyingTo.authorName}` : 'Add a reply'}
              </Text>
              {replyingTo && (
                <Pressable
                  onPress={cancelReply}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              )}
            </View>
            <TextInput
              ref={inputRef}
              value={body}
              onChangeText={setBody}
              placeholder="Share a helpful thought or experience…"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={2000}
              editable={!busy}
              accessibilityLabel="Reply"
              style={styles.input}
            />
            {error && (
              <Text style={styles.error} accessibilityRole="alert" selectable>
                {error}
              </Text>
            )}
            <Pressable
              onPress={submitReply}
              disabled={busy || !canPost}
              accessibilityRole="button"
              accessibilityLabel="Post reply"
              accessibilityState={{ disabled: busy || !canPost }}
              style={({ pressed }) => [
                styles.postButton,
                (busy || !canPost) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Text style={styles.postButtonText}>Post reply</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <ForumAuthPrompt
            action={replyingTo ? `reply to ${replyingTo.authorName}` : 'reply to this thread'}
          />
        )}
      </FormScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 22, paddingTop: spacing.sm, gap: spacing.xl },
    threadCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.md,
      boxShadow: colors.shadowCard,
    },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    topicBadge: {
      backgroundColor: colors.terraLight,
      borderRadius: radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    topicText: { ...font.bold, fontSize: fontSize.tiny, color: colors.brown },
    exampleBadge: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    exampleText: {
      ...font.extrabold,
      fontSize: fontSize.micro,
      letterSpacing: 0.7,
      color: colors.textMuted,
    },
    title: {
      ...font.extrabold,
      fontSize: fontSize.hero,
      lineHeight: 30,
      letterSpacing: -0.25,
      color: colors.text,
    },
    divider: { height: 1.5, backgroundColor: colors.divider },
    body: { ...font.regular, fontSize: fontSize.base, lineHeight: 23, color: colors.text },
    noteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.cream,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    noteIcon: { color: colors.textMuted, marginTop: 1 },
    noteText: {
      ...font.semibold,
      flex: 1,
      fontSize: fontSize.small,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    repliesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    replyCount: {
      ...font.extrabold,
      minWidth: 25,
      textAlign: 'center',
      fontSize: fontSize.small,
      lineHeight: 25,
      color: colors.textSecondary,
      backgroundColor: colors.countChipBg,
      borderRadius: radius.pill,
      fontVariant: ['tabular-nums'],
    },
    repliesList: { gap: spacing.md },
    replyContent: { gap: spacing.md },
    replyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.md,
    },
    nestedReplies: {
      gap: spacing.lg,
      borderLeftWidth: 2,
      borderLeftColor: colors.divider,
      marginLeft: spacing.sm,
      paddingLeft: spacing.lg,
      paddingTop: spacing.sm,
    },
    replyBody: { ...font.regular, fontSize: fontSize.body, lineHeight: 21, color: colors.text },
    replyMention: { ...font.bold, color: colors.accent },
    replyButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
    },
    replyIcon: { color: colors.textMuted },
    replyActionText: { ...font.semibold, fontSize: fontSize.tiny, color: colors.textMuted },
    reportButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
    },
    reportIcon: { color: colors.textMuted },
    reportText: { ...font.semibold, fontSize: fontSize.tiny, color: colors.textMuted },
    reportNotice: {
      gap: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.cream,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    reportNoticeText: { ...font.semibold, fontSize: fontSize.tiny, color: colors.textSecondary },
    reportActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
    emptyReplies: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textSecondary,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    composerCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.md,
    },
    composerHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    composerTitle: { ...font.extrabold, fontSize: fontSize.cardTitle, color: colors.text },
    cancelButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.sm },
    cancelButtonText: { ...font.bold, fontSize: fontSize.small, color: colors.textMuted },
    input: {
      minHeight: 112,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: radius.lg,
      backgroundColor: colors.inputBg,
      padding: spacing.lg,
      textAlignVertical: 'top',
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: 22,
      color: colors.text,
    },
    error: { ...font.semibold, fontSize: fontSize.small, lineHeight: 18, color: colors.noteCaution.strong },
    postButton: {
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
    },
    postButtonText: { ...font.extrabold, fontSize: fontSize.body, color: colors.onAccent },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.72 },
    missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: spacing.sm },
    missingTitle: { ...font.extrabold, fontSize: fontSize.lg, color: colors.text, textAlign: 'center' },
    missingText: {
      ...font.semibold,
      fontSize: fontSize.body,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
