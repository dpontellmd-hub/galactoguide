# Release-readiness review — not deployed

This draft starts from launched revision `b0a9851b6ffc8b688cd149a12ce4734908fc3629` in a separate worktree on `codex/release-readiness`. It does not change the existing Android APK or TestFlight 1.1.1 (9). No live database migration, account deletion, moderator grant, Apple capability/provider change, website deployment, or new native build is part of this phase.

`vercel.json` disables automatic Git deployments for this exact branch. The existing Pages workflow only runs on a push to `main` in the original `admolofto/galactoguide` repository. Do not merge or deploy this draft until the decisions and isolated service validation below are complete.

## Review the implementation

- Native auth handles launch URLs and foreground callbacks with one PKCE exchange, error handling and replay protection. Apple login code is prepared behind an explicit disabled-by-default configuration flag. See [native authentication preparation](native-auth-release-readiness.md) for external prerequisites.
- My Account offers an explicit, freshly authenticated deletion flow. The server derives the sole account from its verified JWT and defaults to disabled. See [account deletion](ACCOUNT_DELETION.md) for the proposed retention strategy and the Apple revocation blocker.
- Discussions retain their existing purpose, with thread/reply reports, blocking, a server-enforced first-pass content filter, and a moderator queue. Adam and Diana are the intended operators; no real account has received a role. Review [moderation setup](FORUM_MODERATION_BACKEND.md) before granting access.

## Keep QA isolated

The base `app.json` still contains the launched public Supabase URL and publishable key. A normal development preview therefore connects to the existing project. Do not exercise writes using that configuration.

For mocked browser and export checks, unset `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then set `GALACTOGUIDE_ISOLATED_QA=1`. This replaces the backend with `https://release-fixture.invalid` and a noncredential fixture key. Conflicting overrides fail the export. Browser fixtures block service workers and abort every external request except the reserved backend, which they fulfill locally. SQL checks use disposable in-memory PGlite with synthetic auth users and claims; they never connect to Supabase.

Example PowerShell export and browser check:

```powershell
$env:GALACTOGUIDE_ISOLATED_QA = '1'
$env:WEB_EXPORT_DIR = '.tmp/release-readiness-web'
npx expo export --clear --platform web --output-dir .tmp/release-readiness-web
node scripts/web-launch-check.mjs
$env:GALACTOGUIDE_NATIVE_BUILD = '1'
npx expo export --clear --platform ios --platform android --output-dir .tmp/release-readiness-native
```

These are local JavaScript export checks, not signed builds or EAS submissions. Real iPhone/Android login and recovery, Apple identity/nonce exchange, Auth/PostgREST claims, role enforcement in a full isolated Supabase stack, and device cache cleanup still require a separately configured test environment.

## Validation completed for this draft

- `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed.
- Client fixtures passed: `auth-callback-check`, `signup-code-check`, `signup-code-form-check`, `account-isolation-check`, `account-deletion-check`, `forum-interactions-check`, `forum-report-check`, and `navigation-layout-check` (28 size cases). These script names have the `.mjs` suffix under `scripts/`. The auth suite also checks the installed Supabase SDK with intercepted transport, delayed exchanges/sign-out, retry after logout failure, and stale initialization. Deletion tests include provider remounts and completion-receipt isolation.
- SQL fixtures passed: `forum-database-check.mjs`, `forum-moderation-database-check.mjs`, and `account-deletion-database-check.mjs`. They exercise actual SQL grants/RLS, rollback, cascades, role spoofing, blocked/suspended interactions, report-preserving author deletion, rate limits, and off-by-default deletion. Use the temporary PGlite runtime described in the moderation notes; point `FORUM_TEST_RUNTIME` back to the repository for React client fixtures.
- `release-isolation-check.cjs` passed. Final `expo export --clear --platform all` passed for web, iOS and Android. Local output is ignored at `.tmp/release-readiness-final`.
- `web-launch-check.mjs` passed against that export: recovery success/failure and stale-session protection, deletion consent/cancellation/backend gate/explicit manual browser cleanup, moderator role gate and confirmed action, legal/deletion pages at phone and desktop widths, routes and assets. It rejects a QA bundle containing the production backend address and aborts all unmocked external requests. Screenshots are kept locally under ignored `scripts/ui-shots/launch`; deletion and moderation confirmation layouts were visually reviewed.

These results do not validate Apple/Supabase production configuration or establish a staffed moderation service. Existing dependency audit findings were not addressed by blanket upgrades in this change.

## Review follow-up and PR checks

Delayed deletion cleanup now runs through the auth provider, drains existing auth operations, and checks the live SDK account while new sign-ins and links are barred. A deletion response for account A after its screen unmounts cannot sign out account B. Native cleanup signs out only the deleted owner. Web deletion deliberately does not issue generic SDK sign-out or remove shared browser auth storage: another tab can replace that account, and the SDK has no atomic conditional-owner sign-out API. The deleted owner is suppressed locally, only its account caches are cleared, and the receipt explicitly explains manual browser cleanup. Regression fixtures cover the unmounted screen, provider serialization, cross-tab auth events, failures, and retry.

Blocked members show their current public display name and a stable account reference, in deterministic order. Unblocking requires confirmation for that exact account. SQL and UI regressions cover duplicate names, reordered lists, deleted public posts, cancellation, retry, and removing only the selected block.

`.github/workflows/release-readiness-checks.yml` runs on PRs targeting `main`, with only `contents: read` and no persisted checkout credential. It installs dependencies, checks types/lint, runs client and disposable SQL fixtures, then creates an isolated web export for mocked browser checks. It has no deployment, EAS build, signing, secret, or live migration step. Local passes are separate from the GitHub Actions result; inspect the PR checks for that result.

## Decisions before deployment

1. Approve or revise deletion retention: erase owned forum text/identity and reports by/about the departing account while preserving other people's replies. Decide whether a narrowly defined abuse-evidence retention exception is needed, and set support-email, provider-log and backup retention. Do not enable the deletion configuration before that review.
2. Confirm the deletion-request operator, ownership-verification procedure and response target. Adam and Diana's moderation assignment does not establish who handles deletion requests.
3. Approve and implement Apple server-side authorization revocation before automatic deletion for Apple-linked accounts. Separately approve Apple capability and Supabase Apple-provider setup before enabling login in a signed build.
4. Verify Adam and Diana's exact account IDs in an isolated setup, then separately approve real moderator grants. Agree queue review frequency, urgent-report escalation, suspension/appeal handling and final community rules. The code alone does not establish staffed moderation.
5. Finalize publisher identity, privacy/store declarations, icons and other outstanding release checklist items separately. This draft is not evidence of store compliance or permission to submit publicly.
