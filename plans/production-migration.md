# GalactoGuide production migration

## Goal
Replace the old app in `dpontellmd-hub/galactoguide`, preserve its history and a recoverable legacy version, and review the new app before production cutover.

## Phases
### 1. Review and cleanup
- [x] Inspect the local checkout, old repository, deployment metadata, and forum data.
- [x] Run baseline TypeScript, lint, auth callback, navigation, forum interaction, reporting, and web export checks.
- [x] Remove bundled example threads, replies, sample vote counts, and fresh-database seeds; verify loading, empty, error, and real-content states.
- [x] Prepare and verify a narrowly scoped database cleanup in disposable PostgreSQL.
- [x] Export targeted live records and apply the cleanup with authenticated administrative access; verify the resulting live counts.
- [x] Complete password recovery with a dedicated form, validation, error/retry handling, successful update, and callback checks.
- [x] Preserve `/privacy.html` and `/terms.html`; update content for account/community features and add visible links.
- [x] Reproduce and fix account-switching crossover in local favorites/preferences; verify owner-specific caches, pending writes, and delayed reads.
- [ ] Have the operator review the updated policies against actual contact/retention practices before publication.
- [ ] Verify production sign-up, email confirmation, sign-in, password recovery, saved entries, posting, replies, deletion, helpful votes, and report delivery with an approved test account.
- [ ] Walk through the final app at phone and desktop sizes together; retain clinician-approved clinical wording.

### 2. Prepare the replacement
- [x] Confirm website-first launch using the current `https://galactoguide.vercel.app` address.
- [x] Configure the web build for Vercel root hosting, dynamic-route reloads, and the production share URL.
- [x] Inspect Supabase Site URL, redirect allowlist, signup settings, email templates, SMTP, and Auth Hooks.
- [ ] Verify Vercel project access, build settings, environment variables, and production branch before preview sign-off and production cutover.
- [ ] Configure the verified Vercel/preview auth callbacks and coordinate the default Site URL change with cutover.
- [ ] Configure a production email sender and verified sending domain; verify signup/recovery delivery outside the Supabase project team.
- [x] Create the Resend sending domain and prepare its exact DNS records for the domain administrator.
- [x] Preserve the old release locally in a tag/branch, verified full-history bundle, and downloadable source ZIP.
- [x] Publish the legacy tag/branch after explicit push approval; verify both remote refs against the legacy SHA.
- [x] Prepare the replacement on a local `codex/` branch based on the destination history, preserving current source provenance and excluding local-only artifacts.
- [x] Verify a clean dependency install and production export in the isolated replacement checkout.
- [x] Prepare the release/rollback checklist and a local draft PR description.
- [x] Obtain explicit commit/push approval for the prepared change while the user arranges Vercel access.
- [ ] Publish the replacement branch, create a draft PR, and validate its preview before production cutover.

### 3. Cutover
- [ ] Record the verified old deployment and rollback steps, including any Vercel setting changes.
- [ ] Obtain production cutover approval after preview review; merge/deploy the exact reviewed revision.
- [ ] Verify the live URL, deep links, legal pages, auth callbacks, empty/real forum content, and feedback routing.
- [ ] Re-read destination GitHub HEAD and deployed revision; document final status.

## Findings — 2026-09-19
- Local checkout: `C:/Users/adamj/_dev/galactoguide`, branch `main`, HEAD `a27204cd85c7c214236a33515edf613411da6867`; remote is `admolofto/galactoguide`. Only pre-existing untracked file: `specs/breastfeeding-log.md` (preserve it).
- Destination default branch: `main`, HEAD `00c6c3ce16d5d12dec2a7ad5947a55a721649264`. Repository metadata lists `https://galactoguide.vercel.app`; the commit has a successful Vercel deployment status. Current Vercel dashboard settings/live rendering remain unverified.
- Connected GitHub access reports push permission but no admin permission. Repository archive/rename or protection settings need separate access.
- Initial configuration used the Pages `/galactoguide` prefix and Pages share links. The prepared website now uses root paths and canonical Vercel share links; the existing Pages workflow explicitly opts into the prefix and runs only in the original development repository.
- The old repository includes `privacy.html`, `terms.html`, and `manifest.json`. The legal documents are now restored under `public/`, with privacy wording corrected for the current features and terms extended for accounts/community. Old source inspection found no Supabase, localStorage, or sessionStorage references; do not assume an account-data migration exists.
- Live public forum read: 7 threads (6 samples), 18 replies (14 samples), including 3 non-sample replies attached to sample threads. The remaining non-sample thread and its reply are outside the authorized cleanup.
- Live public reads support `deleted_at`, `parent_reply_id`, and `get_forum_helpful`. These reads do not prove authenticated write permissions or full RLS behavior.
- TypeScript, lint, auth callback checks, 28 navigation size cases, mocked forum interactions, mocked report delivery, and web static export passed at baseline. No report/email was sent.
- Installed PGlite only in the ignored `.tmp/report-test-runtime` and passed the existing SQL permissions/votes/deletion tests plus the new cleanup tests. Verified exact target deletion, unrelated content/vote preservation, repeat execution, and aborts for unexpected replies, reclassified samples, or unrelated dependent replies.
- After cleanup changes, TypeScript passed; lint caught one JSX apostrophe, which was fixed and passed focused lint. The production web export and both browser suites passed: six widths, empty/error/retry states, fixture discussion navigation, search/filter/source/Guide interactions, dark mode, keyboard/Back behavior, and deep links using a local fallback server. The desktop empty-state screenshot was inspected. These tests do not verify Vercel routing or physical native devices.
- Live cleanup at `supabase/maintenance/20260919_remove_example_forum_content.sql` was applied through the signed-in Supabase SQL editor on 2026-09-19 after exporting the exact target records. No administrator credentials were added to project configuration.
- Native project is still owned by Expo account `admolofto`; GitHub migration does not transfer Expo, Supabase, Vercel, or store ownership.

## Website fixes and verification — 2026-09-19
- Recovery uses `/reset-password`, Supabase `updateUser`, confirmation/length validation, saved drafts after failure, duplicate-submit prevention, and a success screen. Old valid callbacks are redirected to recovery. Invalid/expired links and missing PKCE verifiers cannot silently use a previous session.
- `vercel.json` specifies installation/build/output, clean URLs, and dynamic detail rewrites. `src/lib/site.ts` centralizes canonical public URLs and optional web base paths. Local configuration checks passed for Vercel, Pages, and native asset roots.
- Privacy now discloses selected-situation sync, public posts, local storage, feedback/report payloads, and service providers. No unverified automatic deletion, fixed retention schedule, or no-personal-data promise remains. Legal links appear in sign-in, disclaimers, and About.
- TypeScript, full lint, auth callback/recovery unit checks, production web export, the new production-export browser suite, and both existing responsive browser suites passed. The new suite exercises PKCE callbacks and password updates through the real SDK with intercepted network responses, expired links with/without a prior session, missing verifiers, refresh, retry, success, legacy legal URLs, root assets, and deep links. Recovery and privacy screenshots were visually inspected.
- These tests use a local routing model and mocked account/email services. Live Vercel behavior, dashboard settings, and real email delivery still require preview/account access; no live configuration has changed.
- Exact hosting/allowlist settings and verification commands are in `docs/website-launch.md`.

## Live cleanup verification — 2026-09-19
- User explicitly authorized execution of the previously reviewed cleanup.
- Exported 6 target threads, 17 replies (14 seeded plus 3 approved test replies), and 2 helpful votes before applying the tested transaction. Original recovery export: ignored local `.tmp/forum-cleanup-20260919/before-cleanup.csv`; parsed copy: `before-cleanup.json` in the same folder.
- Supabase reported successful execution. The database verification at 22:12 UTC confirmed 1 thread, 1 reply, 0 sample rows, and 0 helpful votes remaining. Before/after database checksums matched for all retained thread/reply/vote data.
- Independent public API reads at 22:13 UTC confirmed 1 thread, 1 reply, no sample rows, and no helpful aggregates. Evidence is saved locally in `after-cleanup.csv` and `public-api-verification.json` beside the backup.
- Prepared client changes still need deployment; a previously deployed client can retain its bundled example content until updated.

## Hosting audit and migration preparation — 2026-09-19
- Supabase currently defaults to `https://admolofto.github.io/galactoguide/`; its four allowed redirects cover native, Pages, and two localhost ports only. Production Vercel auth and recovery callbacks are absent. Exact current/required values are recorded in `docs/website-launch.md`; no authentication settings were changed.
- Public signup and email confirmation are enabled. Custom SMTP is disabled and no email Auth Hook is configured. Production email delivery is a launch blocker; the built-in sender is restricted to project-team addresses. User confirmed no sender is configured and selected Dyad's existing domain for the recommended Resend setup.
- Confirmation and password-reset templates display links using `{{ .ConfirmationURL }}`. Their link templates are compatible with the prepared flow once callback URLs and production sending are configured.
- Vercel sign-in succeeded after the user-facing authorization handoff. The signed-in `admolofto` account receives a 404 for the owner's project. Project access (or a verified renamed project URL) is required; build/environment/rollback checks remain pending.
- Cloned the destination into ignored `.tmp/production-migration/destination`, then verified local HEAD and GitHub main both remain `00c6c3ce16d5d12dec2a7ad5947a55a721649264`.
- Prepared local `legacy-website-2026-09-19` tag and `codex/legacy-website-2026-09-19` branch. Created source ZIP and a full-history bundle in `.tmp/production-migration/`; `git bundle verify` passed. These refs have not been pushed.
- Prepared local `codex/website-replacement` from destination main. Source provenance is in `docs/migration-provenance.md`; a SHA-256 copy manifest is stored outside the replacement checkout. Local environment/editor files and the pre-existing untracked breastfeeding-log specification are excluded. The original source checkout remains intact.
- All 164 copied files matched their source hashes. A web export from the isolated replacement checkout passed (27 static routes), using the existing installed dependency runtime and without copying the local `.env`. This verifies the prepared source export; fresh CI dependency installation and Vercel hosting remain unverified.
- Prepared Resend/Supabase SMTP settings, now using proposed sending subdomain `auth.galactoguide.com` after the user confirmed ownership of that domain. User must complete Resend account creation; Diana or the domain administrator can apply the exact generated DNS records. Verisign RDAP identifies the registrar as Squarespace Domains LLC, with `ns-cloud-b1` through `ns-cloud-b4.googledomains.com` nameservers. No DNS or auth configuration was changed. Setup details are in `docs/website-launch.md`.

## Signup experience change — 2026-09-23
- The user replaced the earlier immediate-access design with in-place email-code verification. Supabase Confirm email is enabled and was rechecked after saving.
- The code-entry form and Confirm sign up email template are prepared; see `plans/signup-code.md` and `docs/signup-code-rollout.md`. The old immediate-access reminder is removed. The earlier additive `email_verifications` table remains in live Supabase but is unused by this flow.
- Keep Confirm email enabled. Publish the client to draft PR #2 only after explicit commit/push instruction; update the shared signup template when its preview is ready to test. Production cutover remains separate.

## Resend domain setup — 2026-09-19
- User completed Resend signup and explicitly asked to perform the domain setup. Created `auth.galactoguide.com` in the signed-in `adamjlof` account, region `us-east-1`, ID `501592f0-6758-412a-9520-e7256a6fdc1a`.
- Retrieved the exact DNS values from the domain's rendered record table: TXT `resend._domainkey.auth`, CNAME `rsend.auth`, and CNAME `send.auth`. Prepared the public-key value, CNAME targets, and Squarespace field instructions in `docs/galactoguide-email-dns.md`.
- Sending is enabled; receiving is disabled; no tracking subdomain is configured. No emails were sent, no API key was created, and Supabase SMTP was not changed.
- Resend domain status is **Not Started**. All three public DNS names currently return NXDOMAIN. The local Squarespace browser is at the login page, so administrator access or administrator-applied records are required to finish verification.

## Decision log
- User requested preservation of the old version and a walkthrough before launch.
- User confirmed that the three non-sample replies attached to example threads are also disposable test content and should be removed.
- User confirmed a website-first launch and authorized the three identified fixes. Native store publication remains outside this launch.
- User selected Dyad's existing domain for authentication email instead of buying a separate GalactoGuide domain. Resend account creation and DNS verification are pending.
- User subsequently confirmed they cannot access Dyad's DNS dashboard and asked about a separate GalactoGuide domain and its cost. A new domain is under consideration; no domain has been selected or purchased. Having Dyad's DNS administrator add the required records remains an alternative that does not require sharing dashboard access.
- User clarified that `galactoguide.com` is already owned, managed by Danielle or someone else. This supersedes the potential domain purchase: use the existing domain and prepare email-verification records for its administrator after Resend signup. Do not change the website's canonical URL merely because this domain will send authentication email.
- Proposed archive strategy: keep the existing repository/production address and preserve the old commit with a named legacy tag and branch. A separate read-only archive repository remains an option if desired.
- At the end of the local review, the approved live forum cleanup was complete and legacy backups/replacement files were prepared locally; no GitHub publication or deployment had been performed.
- User is handling DNS and will ask Danielle to grant the signed-in `admolofto` account access to the existing Vercel project.
- User then explicitly requested pushing the replacement to `dpontellmd-hub/galactoguide` while arranging Vercel access. Publish the preserved legacy refs and a separate replacement branch/draft PR; keep `main` and production cutover separate. Both remote legacy refs were successfully published and verified at `00c6c3ce16d5d12dec2a7ad5947a55a721649264`.

## Independent migration review — 2026-09-19
- Fresh fetch and `git ls-remote` confirm destination main is still `00c6c3ce16d5d12dec2a7ad5947a55a721649264`; GitHub reports push access and the same successful legacy Vercel deployment.
- `www.galactoguide.com` and `galactoguide.vercel.app` both returned HTTP 200 with identical legacy HTML. Bare `galactoguide.com` failed host lookup. Website routing and custom-host auth callbacks are included in `docs/migration-release.md`; the canonical URL has not changed.
- Clean `npm ci --no-audit --no-fund` installed 870 packages in the isolated clone using Node 24.15.0/npm 11.12.1. `npm run build:web` exported 27 static routes without `.env` or the parent dependency runtime.
- The package review found outdated README/auth setup instructions; corrected website-first setup, existing-database handling, current features, callback paths, and account storage behavior. A credential-pattern scan of the prepared files found no matching private keys, provider secrets, database-password URLs, or GitHub tokens. Public Supabase configuration is expected and retained.
- Review also found shared unowned favorites/situation caches that could carry one account's data into another. A fixture regression test failed on the old implementation, then passed with owner-specific v2 caches, separate guest preferences, auth/local hydration guards, stale-response rejection, and cancelled/deferred preference uploads. Unowned legacy caches remain on disk but are not imported into accounts; server data is preserved.
- Added `scripts/account-isolation-check.mjs`, updated existing browser fixtures, and aligned privacy wording with separate guest/account selections. TypeScript, full lint, account isolation, auth callback, and forum interaction checks passed. The updated isolated clone exported 27 routes; the production browser suite and both responsive suites passed, including six widths, dark mode, keyboard/Back, deep links, and recovery cases. Browser launch required normal sandbox escalation; no real remote writes were sent.
- Release/rollback steps are in `docs/migration-release.md`. The PR description was prepared locally at `.tmp/production-migration/pull-request.md` for the authorized branch publication.

## Status / resume point
The user has authorized GitHub publication while arranging DNS and Vercel access. Publish the replacement branch and draft PR without changing `main`. Once hosting access is available, verify the existing project's settings, both working domains, production branch, rollback target, and hosted preview. Finish Resend verification/SMTP and exact callback URLs before real signup/recovery tests. Change the default Site URL with the approved production cutover.

**TLDR:** Draft PR #2 already contains the superseded immediate-access design. The new code-entry flow is prepared locally; preview testing and production cutover remain pending.

## References
- [Old repository](https://github.com/dpontellmd-hub/galactoguide)
- [Old source snapshot](https://github.com/dpontellmd-hub/galactoguide/tree/00c6c3ce16d5d12dec2a7ad5947a55a721649264)
- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo SDK 57 app configuration](https://docs.expo.dev/versions/v57.0.0/config/app/)
