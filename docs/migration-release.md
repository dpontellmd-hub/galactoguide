# Website migration release checklist

Prepared on 2026-09-19. The user authorized branch publication while arranging
Vercel access. Production cutover remains a separate approval.

## Ready locally

- Destination repository: `dpontellmd-hub/galactoguide`.
- Legacy main: `00c6c3ce16d5d12dec2a7ad5947a55a721649264`, rechecked with fetch
  and `git ls-remote`. The archive tag/branch are published on GitHub; local ZIP
  and verified Git-bundle backups also exist.
- Replacement branch: `codex/website-replacement`, based on the legacy commit.
  Source provenance and excluded files are in [migration provenance](migration-provenance.md).
- Clean `npm ci` completed in the isolated replacement checkout with Node 24.15.0
  and npm 11.12.1. Production export works without the source checkout's `.env`.
- Automated checks cover password recovery, forum behavior, account isolation,
  responsive navigation, static routes, and legal pages. Local browser checks use
  mocked services and a routing model; they do not verify Vercel or live email.
- Live example-content cleanup is complete. Preserve the remaining real thread
  and reply. The maintenance SQL is not an automatic deployment step.

## Branch publication

1. Re-fetch destination main. If it differs from the legacy SHA above, review the
   changes and refresh preservation before proceeding. Do not overwrite new work.
2. With the user's commit/push authorization, commit only the reviewed replacement
   files in the isolated clone. Publish `codex/website-replacement` and open a
   **draft PR into main**. Confirm remote branch/tag SHAs afterward.
3. Leave `main` at the legacy commit. Vercel may attempt preview builds from branch
   pushes, but a GitHub push is not proof of a working hosted preview.

Keep the repository active: preserving the old release in refs does not require
archiving or deleting the repository that will host the replacement.

## Preview and launch gates

- Get access to the existing Vercel project. The signed-in `admolofto` account
  currently receives 404; the user is asking Danielle for access.
- Verify the connected repository, root directory, production branch (`main`),
  preview behavior, build settings, environment variables, and domains. Capture
  old values before changing settings. See [launch configuration](website-launch.md).
- Confirm the actual production deployment and available rollback target.
  GitHub currently reports the legacy deployment at:
  https://vercel.com/dpontellmd-hubs-projects/galactoguide/DGeBmDm2v6k7gUu1UAzUhkGzM4e7
- Verify the preview's exact commit, successful build, and returned routes.
- Have the operator review privacy/terms contact and retention wording.
- Finish [Resend DNS verification](galactoguide-email-dns.md), then connect Supabase
  SMTP using a dedicated private key. No credentials belong in Git.
- Add the exact preview callbacks and test delivery with an approved mailbox.
- Keep the production Site URL unchanged until the new production routes exist.

| Check on the hosted preview | Expected result |
| --- | --- |
| Phone and desktop walkthrough | Browse, search, Guide, details, and navigation work |
| Fresh signup and confirmation | Delivered email returns to the correct preview account |
| Email and Google sign-in, sign-out | Correct account and destination; no stale account data |
| Password recovery | Same-browser email link, validation, save, and sign-in with the changed password work |
| Account A → sign-out → account B | Saved entries and situation preferences stay separate |
| Save/reload/remove an entry | Correct account owns the change and it survives reload |
| Threads/replies/helpful votes | Agreed test content works; examples stay absent; unrelated content remains |
| Report/feedback | Submit only with explicit test-message authorization; recipient receives it |
| Direct detail URLs and refresh | Thread/substance routes load correctly |
| Old legal links and missing assets | Legal links work; missing assets return 404 |

Record test-account content created during verification; remove only those agreed
test records afterward. Local mocks are not evidence of delivery or live writes.

## Website domains

Read-only HTTP checks on 2026-09-19 found:

| Address | Result |
| --- | --- |
| `https://www.galactoguide.com` | HTTP 200, existing legacy website served by Vercel |
| `https://galactoguide.vercel.app` | HTTP 200, identical HTML to the www address |
| `https://galactoguide.com` | Host lookup failed (`ENOTFOUND`) |

Keep both working hosts attached to the same existing Vercel project. Confirm the
preferred public host with the operator before changing `EXPO_PUBLIC_SITE_URL`.
For **every host on which people can sign in**, configure `/auth` and
`/reset-password` redirects, or redirect that host to the chosen host before login.
Resolve the bare-domain routing using the exact DNS instructions from the verified
Vercel project; do not guess an A record from older guides. Authentication email
DNS is a separate set of records and does not fix website routing.

## Production cutover

1. Resolve the launch gates above and obtain explicit cutover approval for the
   reviewed revision. Record preview SHA and legacy deployment ID.
2. Apply the verified production build/environment settings. Merge the reviewed
   PR into `main` and confirm Vercel deploys that resulting Git SHA.
3. Once new routes are available, set Supabase Site URL to the chosen verified
   production host and confirm its callback allowlist. Preserve active old clients.
4. Check both working public hosts, canonical routing, deep links, legal
   links, signup/recovery, account isolation, saved entries, and discussions.
5. Record deployed SHA, final URLs, verification results, and unresolved issues.

## Rollback

Before launch, confirm that Vercel offers the legacy deployment as an eligible
rollback target. Use the dashboard's **Instant Rollback** if the release is broken,
then check all production domains and the old site's key pages. A rollback changes
the serving deployment; it does not restore Supabase settings or database rows.
Preserve accounts and real content; do not replay the example-content backup.

If a source rollback is needed, prepare a reviewed revert on a new branch and
restore compatible build settings from the recorded snapshot. Do not force-push
or rewrite main history. Keep the archive tag and Git bundle.

Vercel disables automatic production-domain assignment after Instant Rollback;
explicitly promote the reviewed recovery deployment when ready to resume releases.
Eligibility depends on the project's plan and retained deployments, so the source
backup alone does not prove dashboard rollback is available.
Source: [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback).

**TLDR:** Preserve legacy refs and publish the approved draft PR now. Verify hosting
access/settings, preview behavior, and email before approving production cutover.
