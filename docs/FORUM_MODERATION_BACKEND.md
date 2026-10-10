# Forum moderation backend — prepared, not deployed

`supabase/migrations/20261010_forum_moderation.sql` is an isolated release-readiness migration. It makes **no moderator assignments** and does not enable a service, contact an external processor, or call a live database. Run it after the existing schema/helpful migration and before `20261011_account_deletion.sql`. A fresh database also needs this incremental migration after `schema.sql`; that file still describes the launched base schema.

## Access and operation

- The only authority is `public.forum_moderators.user_id`. User profile metadata, email addresses, client flags, and JWT user metadata do not grant moderation access. Only a database administrator can insert membership; no application RPC can self-grant it.
- Reports, blocks, suspensions, role membership and audit tables have RLS enabled and no direct grants to PUBLIC, anonymous, or authenticated clients. Checked RPCs use an empty search path. Moderator RPCs check membership on every call. Service credentials must never be placed in the app.
- Adam and Diana are the intended operators, but neither account has been assigned a live role. Before an approved deployment, verify their actual Supabase account UUIDs through an authorized administrator, confirm both can sign in securely, and review whether they should both have remove/suspend/restore authority. Assign only those verified UUIDs after approval; do not infer account identity from a name or user-editable profile.
- The queue returns up to 200 oldest matching reports with current database content and a linkable thread ID. Process open reports, then refresh to expose the next batch. Reported posts cannot be edited pending review; authors may still erase their own content through tombstone RPCs. Reports do not preserve a second copy of a post. A deleted post remains identifiable to moderators through the report's target user ID until account deletion.
- `dismiss` closes a report; `remove` replaces only the reported post with a placeholder; `suspend` removes that post and stops the target account from posting/editing/voting. Existing other posts remain. Replies by other people and reply relationships remain intact. A repeated identical action is safe; a conflicting stale action fails and requires refresh. Moderator accounts cannot be suspended through a report. Restoration removes a suspension and is audited.
- Suspended users retain safety reporting, block/unblock, reading, and their own content/account-deletion controls. A suspension applies to that account, not to new accounts or anonymous browsing. The app has no direct/private messaging.
- Blocks are private to the blocker; both signed-in accounts stop seeing or interacting with one another's posts. A blocked root hides all its replies. Anonymous public reading cannot enforce an account-specific block. Unblocking restores visibility. Replies to a hidden parent and helpful-vote RPC/table bypasses are denied.

## Deterministic content checks and abuse bounds

The database checks direct client inserts **and** edits. It rejects a small explicit set of severe threats, hate and abusive phrases (including basic punctuation/whitespace evasions), common email addresses and formatted ten-digit phone numbers, four or more URL occurrences, and runs of at least 25 identical characters. It permits clinical/anatomical words, medication-dose numbers, and ISO dates. It is deliberately an assistive filter: it does not reliably identify all harassment, medical misinformation, personal details, phone formats, languages, euphemisms, or obfuscated text. Human reporting/review remains necessary. No AI processor receives posts.

The database permits at most five combined new threads/replies per account per rolling minute and twenty new reports per rolling day; retries of an already-open report return its ID. Private post-rate markers prevent a post/delete loop from resetting the allowance. Clients cannot supply their own creation timestamps or change ownership, IDs, sample flags, deletion markers, or reply destination. Rate checks serialize per account and do not rely on a client's clock. These account limits do not replace infrastructure-wide rate limits or account-abuse monitoring.

## Proposed data handling needing approval

Reports contain target references, category, optional reason (0–500 characters), status and timestamps. No emails, auth tokens, raw post snapshots or free-form moderator notes are stored. The `p_note` compatibility argument is not retained; the interface should not promise to save it. Minimal audit records store action, acting moderator ID, report/subject reference and timestamp. Both report author and reported account deletion cascade their reports and associated audit rows; deleting a moderator clears the actor ID in surviving audit rows. Blocks, roles, suspensions and subject audit references cascade on account deletion.

The private `forum_post_events` limiter holds at most five timestamps per account; expired timestamps are discarded on that account's next posting attempt, or all markers are erased on account deletion. No post text is stored there. Inactive accounts retain their last marker timestamps until one of those events; include this bounded technical data in the retention review.

This favors deletion/privacy over retaining evidence after account deletion. It does not prevent a deleted account from returning under a new account. This is a **proposed retention/product choice**, coordinated with the off-by-default account-deletion implementation, and needs approval before production deployment. There is no automatic time-based purge yet. Decide a report/audit retention period and any necessary exceptions before deployment; do not silently introduce indefinite evidence retention or copy deleted content elsewhere.

Operational decisions still required: confirm Adam and Diana's coverage, ownership of urgent cases, response targets, escalation/appeal contact, fair restoration criteria, and how they learn about new queue items. This implementation supplies an in-app queue; it does not send email/push alerts or prove that the queue is staffed. Confirm the published support contact is monitored. No response-time commitment should be published until agreed.

## Isolated verification

The script creates in-memory PostgreSQL with mock `auth.users`, `auth.uid()` and the actual Supabase application roles/RLS. It reads no `.env` and accepts no database URL. Install its test-only dependency in a temporary directory outside the repository:

```powershell
npm install --prefix "$env:TEMP/galactoguide-pg-fixture" @electric-sql/pglite@0.3.15 --ignore-scripts --no-audit --no-fund
$env:FORUM_TEST_RUNTIME = "$env:TEMP/galactoguide-pg-fixture"
node scripts/forum-moderation-database-check.mjs
```

Coverage includes repeated migration, anonymous/member denials, metadata self-grant attempts, direct table bypasses, filter positive/negative cases, immutable fields, bilateral blocks and hidden root replies, authoritative queue, blank/oversize reasons, duplicate reports, conflicting stale decisions, author/moderator tombstones preserving others' replies, suspension/restoration, five-post and twenty-report rate limits, and account-deletion cascades. PGlite does not validate Supabase gateway/JWT configuration, production grants drift, realtime subscriptions, concurrent multi-connection load, or physical-device interactions. Run those later against a separately configured disposable Supabase project; **do not point preview QA at the production project**.

## RPC contract

| RPC | Result |
| --- | --- |
| `get_forum_safety()` | JSON `{ is_moderator, is_suspended, blocked_users: [{ user_id, author_name }] }` |
| `set_forum_block(p_user_id, p_blocked)` | `boolean` |
| `report_forum_post(p_kind, p_id, p_category, p_reason)` | report UUID; kind `thread`/`reply`; categories `harassment`, `hate`, `threat`, `privacy`, `spam`, `medical`, `other` |
| `moderation_queue(p_status = 'open')` | rows: id, target_kind, target_id, thread_id, reason, category, status, created_at, author_id, author_name, title, body, resolution; status `open`/`resolved`/`all` |
| `moderate_forum_report(p_report_id, p_action, p_note = '')` | `boolean`; action `dismiss`/`remove`/`suspend` |
| `list_forum_suspensions()` | rows: user_id, created_at |
| `set_forum_suspension(p_user_id, p_suspended)` | `boolean`; only `false` permitted (new suspension requires reviewed report) |
| `delete_forum_reply(p_id)` | removed reply UUID; own reply tombstone |

Existing helpful RPCs retain their response shape and now enforce blocks/suspension. Existing own thread deletion retains its signature. Never fall back to privileged client writes when an RPC is unavailable: show setup-unavailable state until an approved migration is deployed.
