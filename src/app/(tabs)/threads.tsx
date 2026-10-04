import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageColumns } from '@/components/page-columns';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { ForumAuthPrompt } from '@/components/forum-auth-prompt';
import { ForumThreadCard } from '@/components/forum-thread-card';
import { SectionLabel } from '@/components/SectionLabel';
import { CollapsingScrollView } from '@/components/collapsing-scroll-view';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { useAuth } from '@/context/AuthContext';
import { useForum } from '@/context/ForumContext';
import {
  FORUM_SORT_OPTIONS,
  FORUM_TOPICS,
  sortForumThreads,
  type ForumSort,
  type ForumTopic,
} from '@/data/forum';
import {
  font,
  fontSize,
  layout,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';

type TopicFilter = 'All' | ForumTopic;

function FilterPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={({ pressed }) => [
        styles.filterPill,
        selected && styles.filterPillSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.filterPillText, selected && styles.filterPillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function ThreadsScreen() {
  const router = useRouter();
  const { isDesktop, hasSupportingColumn } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { threads, replies, loading, refreshing, refresh, liveAvailable } = useForum();
  const [sort, setSort] = useState<ForumSort>('New');
  const [topic, setTopic] = useState<TopicFilter>('All');
  const styles = useThemedStyles(makeStyles);
  const visibleThreads = useMemo(() => {
    const filtered = topic === 'All' ? threads : threads.filter((thread) => thread.topic === topic);
    return sortForumThreads(filtered, replies, sort);
  }, [replies, sort, threads, topic]);

  const communityNote = (
    <View style={styles.communityNote}>
      <Ionicons name="heart-outline" size={17} style={styles.noteIcon} />
      <Text style={styles.noteText}>
        Be kind and protect your privacy. Community posts are personal experiences, not medical
        advice.
      </Text>
    </View>
  );
  const controls = (
    <View style={styles.sidebarContent}>
      {user ? (
        <Pressable
          onPress={() => router.push('/threads/new')}
          accessibilityRole="button"
          accessibilityLabel="Start a new thread"
          style={({ pressed }) => [styles.newThreadButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={colors.onAccent} />
          <Text style={styles.newThreadText}>Start a thread</Text>
        </Pressable>
      ) : (
        <ForumAuthPrompt action="start a thread or reply" />
      )}

      <View style={styles.controls}>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Sort threads</Text>
          <View style={styles.sortRow} accessibilityRole="radiogroup" accessibilityLabel="Sort threads">
            {FORUM_SORT_OPTIONS.map((option) => (
              <FilterPill
                key={option}
                label={option}
                selected={sort === option}
                onPress={() => setSort(option)}
              />
            ))}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Filter by tag</Text>
          <ScrollView
            horizontal={!hasSupportingColumn}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.tagRow, hasSupportingColumn && styles.desktopTags]}
            accessibilityRole="radiogroup"
            accessibilityLabel="Filter threads by tag"
          >
            {(['All', ...FORUM_TOPICS] as TopicFilter[]).map((filter) => (
              <FilterPill
                key={filter}
                label={filter}
                selected={topic === filter}
                onPress={() => setTopic(filter)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
      {hasSupportingColumn && communityNote}
    </View>
  );

  return (
    <CollapsingScrollView
      headerTitle="Community threads"
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + layout.screenHeaderTopSpacing },
        isDesktop && styles.desktopContent,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />
      }
    >
      <TabScreenHeader title="Community threads" style={styles.header}>
        <Text style={styles.intro}>
          Ask questions, swap practical ideas, and connect over the everyday parts of feeding and
          milk production.
        </Text>
      </TabScreenHeader>

      <PageColumns testID="threads-columns" sidebar={controls} sidebarSide="right">
        <View style={[styles.feed, !hasSupportingColumn && styles.compactFeed]}>
          <View style={styles.sectionRow}>
            <SectionLabel>Discussions</SectionLabel>
            {loading && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          {!loading && !liveAvailable && (
            <View style={styles.emptyCard} accessibilityRole="alert">
              <Text style={styles.emptyTitle}>{"Couldn't load discussions"}</Text>
              <Text style={styles.emptyText}>Check your connection and try again.</Text>
              <Pressable onPress={() => void refresh()} disabled={refreshing}
                accessibilityRole="button" accessibilityLabel="Retry loading discussions"
                accessibilityState={{ disabled: refreshing }}>
                <Text style={styles.controlLabel}>{refreshing ? 'Trying again…' : 'Try again'}</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.threadList}>
            {visibleThreads.map((thread) => (
              <ForumThreadCard key={thread.id} thread={thread} />
            ))}
            {visibleThreads.length === 0 && !loading && liveAvailable && (
              <View style={styles.emptyCard} accessibilityLiveRegion="polite">
                <Text style={styles.emptyTitle}>{topic === 'All' ? 'No discussions yet' : 'No threads with this tag yet'}</Text>
                <Text style={styles.emptyText}>{topic !== 'All'
                  ? 'Choose another tag or start the first discussion.'
                  : user ? 'Start the first discussion.' : 'Sign in to start the first discussion.'}</Text>
              </View>
            )}
          </View>

        </View>
      </PageColumns>
      {!hasSupportingColumn && communityNote}
    </CollapsingScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBg },
    content: { paddingHorizontal: layout.screenPaddingHorizontal, paddingBottom: 34, gap: spacing.xl },
    desktopContent: { paddingHorizontal: layout.desktopPagePadding, paddingTop: 40, gap: 28 },
    sidebarContent: { gap: spacing.xl },
    feed: { gap: spacing.xl },
    compactFeed: { marginTop: spacing.xl },
    desktopTags: { flexDirection: 'row', flexWrap: 'wrap' },
    header: { marginBottom: 0 },
    intro: { ...font.semibold, fontSize: fontSize.base, lineHeight: 22, color: colors.textSecondary },
    newThreadButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    newThreadText: { ...font.extrabold, fontSize: fontSize.base, color: colors.onAccent },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 22,
    },
    controls: {
      gap: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.xl,
      paddingVertical: spacing.lg,
      boxShadow: colors.shadowSoft,
    },
    controlGroup: { gap: spacing.sm },
    controlLabel: {
      ...font.extrabold,
      paddingHorizontal: spacing.lg,
      fontSize: fontSize.small,
      color: colors.textSecondary,
    },
    sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
    tagRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
    filterPill: {
      minHeight: 38,
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
    },
    filterPillSelected: { borderColor: colors.ink.bg, backgroundColor: colors.ink.bg },
    filterPillText: { ...font.bold, fontSize: fontSize.small, color: colors.textSecondary },
    filterPillTextSelected: { color: colors.ink.fg },
    threadList: { gap: spacing.md },
    emptyCard: {
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    emptyTitle: { ...font.extrabold, fontSize: fontSize.body, color: colors.text },
    emptyText: { ...font.semibold, fontSize: fontSize.small, lineHeight: 19, color: colors.textSecondary },
    communityNote: {
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
    pressed: { opacity: 0.72 },
  });
