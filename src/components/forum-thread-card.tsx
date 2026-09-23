import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ForumAuthorRow } from '@/components/forum-author-row';
import { helpfulCountLabel } from '@/components/forum-post-actions';
import { useForum } from '@/context/ForumContext';
import type { ForumThread } from '@/data/forum';
import { font, fontSize, radius, spacing, useThemedStyles, type ThemeColors } from '@/theme';

export function ForumThreadCard({ thread }: { thread: ForumThread }) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { getHelpful } = useForum();
  const helpful = getHelpful('thread', thread.id);
  const helpfulCount = helpful?.count ?? 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/threads/[id]', params: { id: thread.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${thread.title}, ${thread.replyCount} ${thread.replyCount === 1 ? 'reply' : 'replies'}${!thread.deletedAt && helpfulCount > 0 ? `, ${helpfulCountLabel(helpfulCount)}` : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
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
      <Text style={styles.title}>{thread.title}</Text>
      <Text style={styles.preview} numberOfLines={2}>
        {thread.body}
      </Text>
      <View style={styles.footer}>
        {!thread.deletedAt && <ForumAuthorRow
          name={thread.authorName}
          createdAt={thread.createdAt}
          isSample={thread.isSample}
        />}
        <View style={styles.replyCount}>
          <Ionicons name="chatbubble-outline" size={14} style={styles.replyIcon} />
          <Text style={styles.replyText}>{thread.replyCount}</Text>
        </View>
      </View>
      {!thread.deletedAt && helpfulCount > 0 && (
        <Text style={styles.replyText}>{helpfulCountLabel(helpfulCount)}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
      boxShadow: colors.shadowSoft,
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
    title: { ...font.extrabold, fontSize: fontSize.lg, lineHeight: 23, color: colors.text },
    preview: { ...font.regular, fontSize: fontSize.body, lineHeight: 20, color: colors.textSecondary },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingTop: spacing.xs,
    },
    replyCount: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 5 },
    replyIcon: { color: colors.textMuted },
    replyText: {
      ...font.bold,
      fontSize: fontSize.small,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    pressed: { opacity: 0.72 },
  });
