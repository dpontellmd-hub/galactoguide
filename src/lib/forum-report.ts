import type { ForumReply, ForumThread } from '@/data/forum';

export const REPORT_EMAIL = 'adam@dyadhealthcollective.com';

// Reports use the existing feedback inbox. Formspree controls its recipient;
// REPORT_EMAIL is a direct-contact fallback, not a payload delivery override.
const REPORT_ENDPOINT = process.env.EXPO_PUBLIC_FORUM_REPORT_ENDPOINT ?? 'https://formspree.io/f/xlgokjgl';

export async function sendCommentReport(thread: ForumThread, reply: ForumReply, reason: string): Promise<void> {
  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(REPORT_ENDPOINT)) {
    throw new Error(`Reporting is being set up. Please email ${REPORT_EMAIL} with the comment details.`);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        subject: 'GalactoGuide: reported comment',
        report_type: 'Forum comment',
        thread_id: thread.id,
        thread_title: thread.title,
        comment_id: reply.id,
        parent_comment_id: reply.parentReplyId,
        comment_author: reply.authorName,
        comment_author_id: reply.userId,
        comment_body: reply.body,
        comment_created_at: reply.createdAt,
        example_comment: reply.isSample,
        reason: reason.trim() || 'No additional details provided.',
        reported_at: new Date().toISOString(),
      }),
    });
    const result = await response.json();
    if (!response.ok || result?.ok !== true) throw new Error('Report not accepted');
  } catch {
    throw new Error(`Could not confirm your report was sent. Please try again or email ${REPORT_EMAIL}.`);
  } finally {
    clearTimeout(timeout);
  }
}
