export const FORUM_TOPICS = [
  'Everyday support',
  'Pumping & work',
  'Getting support',
  'Questions & experiences',
] as const;

export type ForumTopic = (typeof FORUM_TOPICS)[number];

export const FORUM_SORT_OPTIONS = ['New', 'Popular', 'Trending'] as const;

export type ForumSort = (typeof FORUM_SORT_OPTIONS)[number];

export interface ForumThread {
  deletedAt?: string | null;
  id: string;
  userId: string | null;
  authorName: string;
  title: string;
  body: string;
  topic: ForumTopic;
  createdAt: string;
  replyCount: number;
  isSample: boolean;
}

export interface ForumReply {
  id: string;
  threadId: string;
  parentReplyId: string | null;
  userId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  isSample: boolean;
}

export function isForumTopic(value: unknown): value is ForumTopic {
  return typeof value === 'string' && FORUM_TOPICS.includes(value as ForumTopic);
}

function forumTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function lastThreadActivity(thread: ForumThread, replies: ForumReply[]): number {
  return replies.reduce(
    (latest, reply) =>
      reply.threadId === thread.id ? Math.max(latest, forumTimestamp(reply.createdAt)) : latest,
    forumTimestamp(thread.createdAt),
  );
}

/**
 * Sorts with only observable forum activity: replies determine popularity,
 * while recent thread and reply activity determine what is trending.
 */
export function sortForumThreads(
  threads: ForumThread[],
  replies: ForumReply[],
  sort: ForumSort,
  now = Date.now(),
): ForumThread[] {
  const recentCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const activity = new Map(
    threads.map((thread) => {
      const recentReplies = replies.filter(
        (reply) => reply.threadId === thread.id && forumTimestamp(reply.createdAt) >= recentCutoff,
      ).length;
      const recentThread = forumTimestamp(thread.createdAt) >= recentCutoff ? 1 : 0;
      return [
        thread.id,
        {
          lastAt: lastThreadActivity(thread, replies),
          recentCount: recentReplies + recentThread,
        },
      ];
    }),
  );

  return [...threads].sort((a, b) => {
    const aActivity = activity.get(a.id)!;
    const bActivity = activity.get(b.id)!;

    if (sort === 'Popular') {
      return b.replyCount - a.replyCount || bActivity.lastAt - aActivity.lastAt;
    }

    if (sort === 'Trending') {
      return (
        bActivity.lastAt - aActivity.lastAt ||
        bActivity.recentCount - aActivity.recentCount ||
        b.replyCount - a.replyCount
      );
    }

    return forumTimestamp(b.createdAt) - forumTimestamp(a.createdAt);
  });
}

export function formatForumDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date);
}
