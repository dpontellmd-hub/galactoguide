# Forum deletion and helpful votes

For an existing database, apply `migrations/20260914_forum_helpful.sql` before releasing the updated app.
For a fresh database, run `schema.sql`, which includes this migration. Both can be re-run.

- Authors can remove their thread's title, body, and author identity. A deleted-thread placeholder keeps the conversation and every response intact.
- Direct thread deletion is denied by row-level security, including for older app versions.
- Authors can delete their own replies. Responses to a deleted reply remain as top-level replies.
- Signed-in users can mark each thread or reply helpful once and undo their vote. Public reads return totals and only the current viewer's selection; voter identities remain private.
- The migration creates capabilities only. Applying it does not delete any existing posts.

## Local checks

These use disposable PostgreSQL and API fixtures; they do not connect to the live service.

```powershell
npm install --prefix .tmp/forum-test-runtime @electric-sql/pglite react-test-renderer@19.2.3 --ignore-scripts --no-audit --no-fund
$env:FORUM_TEST_RUNTIME = '.tmp/forum-test-runtime'
node scripts/forum-database-check.mjs
node scripts/forum-interactions-check.mjs
npx tsc --noEmit
```

Live deployment and native-device interaction review are separate from these checks.

## Example-content cleanup

The app no longer bundles example posts or adds them to live results, and `schema.sql`
now starts an empty forum. The approved live sample cleanup was applied on
2026-09-19 to project `axxuefnkoxfifftjnuxo` through the Supabase SQL editor.

`maintenance/20260919_remove_example_forum_content.sql` targets exactly the six known
sample threads, fourteen sample replies, and three attached replies confirmed by the
user as test content. Their helpful votes are removed through foreign-key cascades.
The other thread and reply remain intact. New or reclassified content causes the
transaction to abort for review. This script is not part of automatic migrations.

The targeted records were exported before execution to the ignored local folder
`.tmp/forum-cleanup-20260919/`: `before-cleanup.csv` is the original export and
`before-cleanup.json` is a parsed convenience copy. Keep these private local files
for recovery; they are excluded from Git.

Live verification confirmed removal of 6 threads, 17 replies, and 2 helpful votes.
One unrelated thread and one reply remain, with all row fields unchanged according
to before/after database checksums. There are no sample rows or helpful votes left.
The database result is saved in `after-cleanup.csv`; the public API also confirmed
the resulting counts in `public-api-verification.json` in that same local folder.
The prepared client changes still need deployment; older clients may retain their
bundled examples until updated.

Local verification: `node scripts/forum-cleanup-check.mjs` with `FORUM_TEST_RUNTIME`
pointing at the temporary PGlite runtime above.
