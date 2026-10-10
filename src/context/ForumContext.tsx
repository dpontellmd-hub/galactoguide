import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  isForumTopic,
  type ForumReply,
  type ForumThread,
  type ForumTopic,
} from '@/data/forum';
import { supabase, supabaseConfigured } from '@/lib/supabase';

interface ForumThreadRow {
  deleted_at?: string | null;
  id: string;
  user_id: string | null;
  author_name: string;
  title: string;
  body: string;
  topic: string;
  created_at: string;
  is_sample: boolean;
}

interface ForumReplyRow {
  deleted_at?: string | null;
  id: string;
  thread_id: string;
  parent_reply_id: string | null;
  user_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
  is_sample: boolean;
}

interface ForumMutationResult<T> {
  data?: T;
  error?: string;
}

export interface ForumSafety {
  is_moderator: boolean; is_suspended: boolean;
  blocked_users: { user_id: string; author_name: string }[];
}

export type ForumTargetKind = 'thread' | 'reply';
interface HelpfulRow {
  target_kind: ForumTargetKind;
  target_id: string;
  helpful_count: number;
  marked_helpful: boolean;
}

export interface ForumHelpfulState {
  count: number;
  marked: boolean;
}

interface ForumContextValue {
  threads: ForumThread[];
  replies: ForumReply[];
  loading: boolean;
  refreshing: boolean;
  liveAvailable: boolean;
  safety: ForumSafety | null;
  setBlocked: (userId: string, blocked: boolean) => Promise<ForumMutationResult<boolean>>;
  reportPost: (kind: ForumTargetKind, id: string, category: string, reason: string) => Promise<ForumMutationResult<boolean>>;
  getHelpful: (kind: ForumTargetKind, id: string) => ForumHelpfulState | undefined;
  setHelpful: (kind: ForumTargetKind, id: string, helpful?: boolean) => Promise<ForumMutationResult<boolean>>;
  deletePost: (kind: ForumTargetKind, id: string) => Promise<ForumMutationResult<boolean>>;
  refresh: () => Promise<void>;
  getThread: (id: string) => ForumThread | undefined;
  getReplies: (threadId: string) => ForumReply[];
  createThread: (input: {
    title: string;
    body: string;
    topic: ForumTopic;
  }) => Promise<ForumMutationResult<ForumThread>>;
  addReply: (
    threadId: string,
    body: string,
    parentReplyId?: string | null,
  ) => Promise<ForumMutationResult<ForumReply>>;
}

const ForumContext = createContext<ForumContextValue | null>(null);

function forumAuthorName(user: User): string {
  for (const field of ['full_name', 'display_name', 'name'] as const) {
    const value = user.user_metadata?.[field];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 60);
  }
  return 'Community member';
}

function mapThread(row: ForumThreadRow, replyCount: number): ForumThread | null {
  if (!isForumTopic(row.topic)) return null;
  return {
    id: row.id,
    deletedAt: row.deleted_at,
    userId: row.user_id,
    authorName: row.author_name,
    title: row.title,
    body: row.body,
    topic: row.topic,
    createdAt: row.created_at,
    replyCount,
    isSample: row.is_sample,
  };
}

function mapReply(row: ForumReplyRow): ForumReply {
  return {
    id: row.id,
    threadId: row.thread_id,
    deletedAt: row.deleted_at,
    parentReplyId: row.parent_reply_id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    isSample: row.is_sample,
  };
}

function friendlyForumError(message?: string): string {
  if (message?.includes('content_filter')) return 'Please revise your post to follow the community rules. Threats, abusive language, and sharing private contact details are not allowed.';
  if (message?.includes('suspended')) return 'Posting on this account is suspended. Contact the community team to request a review.';
  if (message?.includes('rate_limit')) return 'Please wait a little before posting again.';
  if (message?.includes('blocked')) return 'You cannot interact with this member while a block is in place.';
  if (message?.includes('forum_threads') || message?.includes('forum_replies')) {
    return 'Posting is not available until the forum database setup is complete.';
  }
  return 'The forum could not save that right now. Check your connection and try again.';
}

export function ForumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [refreshing, setRefreshing] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [helpful, setHelpfulState] = useState<Record<string, ForumHelpfulState>>({});
  const [helpfulViewer, setHelpfulViewer] = useState<string | null | undefined>(undefined);
  const [helpfulLoaded, setHelpfulLoaded] = useState(false);
  const helpfulRequest = useRef(0);
  const helpfulSession = useRef(0);
  const forumRequest = useRef(0);
  const pendingActions = useRef(new Set<string>());
  const viewerId = user?.id ?? null;
  const activeViewer = useRef(viewerId);
  useLayoutEffect(() => { activeViewer.current = viewerId; }, [viewerId]);
  const [forumViewer, setForumViewer] = useState<string | null | undefined>(undefined);
  const [safety, setSafety] = useState<ForumSafety | null>(null);
  const [safetyViewer, setSafetyViewer] = useState<string | null | undefined>(undefined);
  const loadSafety = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const { data, error } = await supabase.rpc('get_forum_safety');
      if (activeViewer.current !== viewerId) return;
      setSafety(error ? null : data as ForumSafety);
      setSafetyViewer(viewerId);
    } catch { if (activeViewer.current === viewerId) setSafety(null); }
  }, [viewerId]);
  useEffect(() => { const timer = setTimeout(() => { void loadSafety(); }, 0); return () => clearTimeout(timer); }, [loadSafety]);

  const loadHelpful = useCallback(async () => {
    const request = ++helpfulRequest.current;
    if (!supabaseConfigured) return;
    try {
      const { data, error } = await supabase.rpc('get_forum_helpful');
      if (request !== helpfulRequest.current) return;
      if (error || !data) { setHelpfulLoaded(false); return; }
      setHelpfulState(Object.fromEntries((data as HelpfulRow[]).map((row) => [
        `${row.target_kind}:${row.target_id}`,
        { count: Number(row.helpful_count), marked: row.marked_helpful },
      ])));
      setHelpfulViewer(viewerId);
      setHelpfulLoaded(true);
    } catch {
      if (request === helpfulRequest.current) setHelpfulLoaded(false);
    }
  }, [viewerId]);

  useEffect(() => {
    const requestRef = helpfulRequest;
    const sessionRef = helpfulSession;
    const timer = setTimeout(() => { void loadHelpful(); }, 0);
    return () => { clearTimeout(timer); requestRef.current++; sessionRef.current++; };
  }, [loadHelpful]);

  const loadForum = useCallback(async (isRefresh = false) => {
    const request = ++forumRequest.current;
    if (!supabaseConfigured) {
      setLoading(false);
      setLiveAvailable(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    try {
      const [threadResult, replyResult] = await Promise.all([
        supabase
          .from('forum_threads')
          .select('id, user_id, author_name, title, body, topic, created_at, is_sample, deleted_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('forum_replies')
          .select('id, thread_id, parent_reply_id, user_id, author_name, body, created_at, is_sample, deleted_at')
          .order('created_at', { ascending: true }),
      ]);

      if (request !== forumRequest.current || activeViewer.current !== viewerId) return;
      if (threadResult.error || replyResult.error) {
        setLiveAvailable(false);
        return;
      }

      // Hide old seed rows until administrative database cleanup is complete.
      const threadRows = (threadResult.data as ForumThreadRow[])
        .filter((row) => !row.is_sample && isForumTopic(row.topic));
      const threadIds = new Set(threadRows.map((row) => row.id));
      const remoteReplies = (replyResult.data as ForumReplyRow[])
        .filter((row) => !row.is_sample && threadIds.has(row.thread_id))
        .map(mapReply);
      const replyIds = new Set(remoteReplies.map((reply) => reply.id));
      const visibleReplies = remoteReplies.map((reply) => ({
        ...reply,
        parentReplyId: reply.parentReplyId && replyIds.has(reply.parentReplyId) ? reply.parentReplyId : null,
      }));
      const replyCounts = new Map<string, number>();
      visibleReplies.forEach((reply) => {
        replyCounts.set(reply.threadId, (replyCounts.get(reply.threadId) ?? 0) + 1);
      });

      const remoteThreads = threadRows
        .map((row) => mapThread(row, replyCounts.get(row.id) ?? 0))
        .filter((row): row is ForumThread => row !== null)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      setForumViewer(viewerId);
      setThreads(remoteThreads);
      setReplies(visibleReplies);
      setLiveAvailable(true);
    } catch {
      if (request === forumRequest.current) setLiveAvailable(false);
    } finally {
      if (request === forumRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [viewerId]);

  useEffect(() => {
    const requestRef = forumRequest;
    const timer = setTimeout(() => {
      loadForum().catch(() => {
        setLoading(false);
        setRefreshing(false);
        setLiveAvailable(false);
      });
    }, 0);
    return () => { clearTimeout(timer); requestRef.current++; };
  }, [loadForum]);

  const createThread = useCallback(
    async ({ title, body, topic }: { title: string; body: string; topic: ForumTopic }) => {
      if (!user) return { error: 'Sign in or create an account to start a thread.' };

      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (cleanTitle.length < 5) return { error: 'Add a slightly longer title.' };
      if (cleanBody.length < 10) return { error: 'Add a little more detail to your post.' };

      const { data, error } = await supabase
        .from('forum_threads')
        .insert({
          user_id: user.id,
          author_name: forumAuthorName(user),
          title: cleanTitle,
          body: cleanBody,
          topic,
          is_sample: false,
        })
        .select('id, user_id, author_name, title, body, topic, created_at, is_sample')
        .single();

      if (activeViewer.current !== user.id) return { error: 'Your account changed. Refresh before posting again.' };
      if (error || !data) return { error: friendlyForumError(error?.message) };
      const created = mapThread(data as ForumThreadRow, 0);
      if (!created) return { error: 'The forum returned an unsupported topic.' };

      forumRequest.current++;
      setThreads((current) => [created, ...current.filter((thread) => thread.id !== created.id)]);
      setLiveAvailable(true);
      return { data: created };
    },
    [user],
  );

  const addReply = useCallback(
    async (threadId: string, body: string, parentReplyId?: string | null) => {
      if (!user) return { error: 'Sign in or create an account to reply.' };
      const cleanBody = body.trim();
      if (cleanBody.length < 2) return { error: 'Write a little more before posting.' };

      const requestedParent = parentReplyId
        ? replies.find((reply) => reply.id === parentReplyId && reply.threadId === threadId)
        : undefined;
      const rootParentId = requestedParent
        ? (requestedParent.parentReplyId ?? requestedParent.id)
        : null;

      const { data, error } = await supabase
        .from('forum_replies')
        .insert({
          thread_id: threadId,
          parent_reply_id: rootParentId,
          user_id: user.id,
          author_name: forumAuthorName(user),
          body: cleanBody,
          is_sample: false,
        })
        .select('id, thread_id, parent_reply_id, user_id, author_name, body, created_at, is_sample, deleted_at')
        .single();

      if (activeViewer.current !== user.id) return { error: 'Your account changed. Refresh before posting again.' };
      if (error || !data) return { error: friendlyForumError(error?.message) };
      const created = mapReply(data as ForumReplyRow);
      forumRequest.current++;
      setReplies((current) => [...current.filter((reply) => reply.id !== created.id), created]);
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId ? { ...thread, replyCount: thread.replyCount + 1 } : thread,
        ),
      );
      setLiveAvailable(true);
      return { data: created };
    },
    [replies, user],
  );

  const deletePost = useCallback(async (kind: ForumTargetKind, id: string) => {
    const post = kind === 'thread' ? threads.find((item) => item.id === id) : replies.find((item) => item.id === id);
    if (!user || !post || post.userId !== user.id || post.isSample) {
      return { error: 'You can only delete posts you created.' };
    }
    const key = `delete:${kind}:${id}`;
    if (pendingActions.current.has(key)) return { error: 'Deletion is already in progress.' };
    pendingActions.current.add(key);
    try {
      if (kind === 'thread') {
        const { data, error } = await supabase.rpc('delete_forum_thread', { p_id: id });
        if (error || !data) return { error: 'Could not delete this thread. Please try again.' };
        if (activeViewer.current !== user.id) return { data: true };
        forumRequest.current++;
        setThreads((current) => current.map((item) => item.id === id ? {
          ...item, title: 'Deleted thread', body: 'This thread was deleted by its author.',
          authorName: 'Deleted author', userId: null, deletedAt: new Date().toISOString(),
        } : item));
        return { data: true };
      }
      const { data, error } = await supabase.rpc('delete_forum_reply', { p_id: id });
      if (error || !data) return { error: 'Could not delete this reply. Please try again.' };
      if (activeViewer.current !== user.id) return { data: true };
      forumRequest.current++;
      // A tombstone preserves responses and report references without retaining the content.
      setReplies((current) => current.map((item) => item.id === id ? {
        ...item, body: 'This reply was deleted by its author.', authorName: 'Deleted author',
        userId: null, deletedAt: new Date().toISOString(),
      } : item));
      return { data: true };
    } catch {
      return { error: 'Could not delete this post. Check your connection and try again.' };
    } finally { pendingActions.current.delete(key); }
  }, [threads, replies, user]);

  const setHelpful = useCallback(async (kind: ForumTargetKind, id: string, selected?: boolean) => {
    if (!user) return { error: 'Sign in to mark posts helpful.' };
    const key = `${kind}:${id}`;
    if (pendingActions.current.has(key)) return { error: 'Your vote is already being saved.' };
    pendingActions.current.add(key);
    const session = helpfulSession.current;
    let snapshotRows: HelpfulRow[] | undefined;
    try {
      if (selected === undefined) {
        const snapshot = await supabase.rpc('get_forum_helpful');
        if (snapshot.error || !snapshot.data) return { error: 'Helpful votes are unavailable right now. Please try again.' };
        if (session !== helpfulSession.current) return { error: 'Your account changed. Please try again.' };
        snapshotRows = snapshot.data as HelpfulRow[];
        const previous = snapshotRows.find((row) => row.target_kind === kind && row.target_id === id);
        selected = !previous?.marked_helpful;
      }
      const { data, error } = await supabase.rpc('set_forum_helpful', { p_kind: kind, p_id: id, p_helpful: selected });
      if (error || !data?.[0]) return { error: 'Could not save your vote. Please try again.' };
      if (session !== helpfulSession.current) return { data: true };
      helpfulRequest.current++;
      const row = data[0] as HelpfulRow;
      setHelpfulState((current) => ({
        ...(snapshotRows ? Object.fromEntries(snapshotRows.map((item) => [
          `${item.target_kind}:${item.target_id}`, { count: Number(item.helpful_count), marked: item.marked_helpful },
        ])) : helpfulViewer === user.id ? current : {}),
        [key]: { count: Number(row.helpful_count), marked: row.marked_helpful },
      }));
      if (snapshotRows) setHelpfulLoaded(true);
      setHelpfulViewer(user.id);
      return { data: true };
    } catch {
      return { error: 'Could not save your vote. Check your connection and try again.' };
    } finally { pendingActions.current.delete(key); }
  }, [user, helpfulViewer]);

  const setBlocked = useCallback(async (targetId: string, blocked: boolean) => {
    if (!user || targetId === user.id) return { error: 'Sign in to block another member.' };
    try {
      const { error } = await supabase.rpc('set_forum_block', { p_user_id: targetId, p_blocked: blocked });
      if (error) return { error: 'Could not update your blocked members. Please try again.' };
      if (activeViewer.current !== user.id) return { error: 'Your account changed. Please refresh.' };
      // Hide cached content before fetching the server-filtered feed.
      forumRequest.current++;
      setThreads([]); setReplies([]);
      await Promise.all([loadForum(true), loadSafety()]);
      return { data: true };
    } catch { return { error: 'Could not update your blocked members. Please try again.' }; }
  }, [user, loadForum, loadSafety]);

  const reportPost = useCallback(async (kind: ForumTargetKind, id: string, category: string, reason: string) => {
    if (!user) return { error: 'Sign in to send a report, or use the contact address in Community rules.' };
    try {
      const { error } = await supabase.rpc('report_forum_post', {
        p_kind: kind, p_id: id, p_category: category, p_reason: reason.trim(),
      });
      if (activeViewer.current !== user.id) return { error: 'Your account changed. Please refresh.' };
      return error ? { error: 'Could not confirm your report. Try again or use the community contact address.' } : { data: true };
    } catch { return { error: 'Could not confirm your report. Please try again.' }; }
  }, [user]);

  const value = useMemo<ForumContextValue>(
    () => ({
      threads: forumViewer === viewerId ? threads : [],
      replies: forumViewer === viewerId ? replies : [],
      safety: safetyViewer === viewerId ? safety : null,
      setBlocked, reportPost,
      loading,
      refreshing,
      liveAvailable,
      getHelpful: (kind, id) => helpfulViewer === viewerId
        ? (helpful[`${kind}:${id}`] ?? (helpfulLoaded ? { count: 0, marked: false } : undefined)) : undefined,
      setHelpful,
      deletePost,
      refresh: async () => { await Promise.all([loadForum(true), loadHelpful(), loadSafety()]); },
      getThread: (id) => forumViewer === viewerId ? threads.find((thread) => thread.id === id) : undefined,
      getReplies: (threadId) => forumViewer === viewerId ? replies.filter((reply) => reply.threadId === threadId) : [],
      createThread,
      addReply,
    }),
    [threads, replies, loading, refreshing, liveAvailable, loadForum, loadHelpful, createThread, addReply,
      helpful, helpfulLoaded, helpfulViewer, viewerId, setHelpful, deletePost,
      forumViewer, safety, safetyViewer, setBlocked, reportPost, loadSafety],
  );

  return <ForumContext.Provider value={value}>{children}</ForumContext.Provider>;
}

export function useForum(): ForumContextValue {
  const context = useContext(ForumContext);
  if (!context) throw new Error('useForum must be used within a ForumProvider');
  return context;
}
