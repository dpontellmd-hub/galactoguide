# Website launch configuration

Website-first release. These are the settings for the prepared code. Supabase
dashboard settings were inspected on 2026-09-19; no authentication settings have
been changed and real email delivery remains untested. Vercel sign-in succeeded,
but the current account receives a 404 for the owner's project; project access
must be resolved before its configuration can be verified.

## Live configuration audit — 2026-09-19

- Supabase project: `axxuefnkoxfifftjnuxo`.
- Current Site URL: `https://admolofto.github.io/galactoguide/`.
- Current redirect allowlist: `galactoguide://**`,
  `https://admolofto.github.io/galactoguide/**`,
  `http://localhost:8081/galactoguide/**`, and
  `http://localhost:8082/galactoguide/**`.
- The Vercel `/auth` and `/reset-password` URLs below are missing. Add the verified
  production and exact preview callback URLs before testing those deployments.
  Switch the default Site URL during the coordinated production cutover, after
  the new routes are available. Preserve existing callbacks for active clients.
- New signup and email confirmation are enabled. Email and Google providers are
  enabled; anonymous sign-in is disabled.
- Custom SMTP is disabled and no Send Email Auth Hook exists. This is a public
  email-authentication launch blocker: Supabase's built-in email sender only sends
  to project-team addresses and is not intended for production. Configure a
  production sender and verified sending domain before testing public signup or
  recovery. Source: [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
- Confirmation and recovery templates both use `{{ .ConfirmationURL }}`; no
  hardcoded destination was found in their displayed links.
- The signed-in Vercel account is `admolofto`; the owner's project returns 404.
  This does not establish whether it was renamed or whether account access is
  missing. Confirm the project with its owner and use an account that can open it.

## Vercel

Keep the existing `dpontellmd-hub/galactoguide` repository and Vercel project so the
production address remains `https://galactoguide.vercel.app`. Preserve the old source
and deployment before merging the replacement.

Read-only HTTP checks on 2026-09-19 also confirmed that
`https://www.galactoguide.com` returns the same legacy HTML as the Vercel address.
The bare `https://galactoguide.com` host lookup failed (`ENOTFOUND`). Verify both
working hosts in the owner's Vercel project and use that project's exact DNS
instructions to fix bare-domain routing. The email DNS records do not fix website
routing. The [release checklist](migration-release.md) records the cutover and
rollback sequence; canonical-host changes still need operator agreement.

- Framework preset: Other (`framework: null` in `vercel.json`).
- Root directory: repository root.
- Node.js: 22.x or a supported newer version; Expo SDK 57 requires at least 22.13.
- Install: `npm ci`.
- Build: `npm run build:web`.
- Output: `dist`.
- Do not set `GALACTOGUIDE_WEB_BASE_PATH` for Vercel. Root paths are the default.
- Optional `EXPO_PUBLIC_SITE_URL`: `https://galactoguide.vercel.app` (the code default).
  Change it if the verified production domain changes; never set it to a preview URL.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` can override the
  client/public project values already in `app.json`. Do not place a service-role
  key or other administrative credential in an `EXPO_PUBLIC_*` variable.

`vercel.json` serves static routes with clean URLs and rewrites dynamic substance
and thread detail URLs to their exported HTML shells. Existing static routes such
as `/threads/new` take precedence. Missing assets and unrelated paths remain 404s.
The old `/privacy.html` and `/terms.html` addresses redirect to `/privacy` and `/terms`
and serve the restored documents. Query strings on auth routes must be preserved.

The existing GitHub Pages workflow is restricted to `admolofto/galactoguide` and
explicitly sets `GALACTOGUIDE_WEB_BASE_PATH=/galactoguide`. It will not deploy Pages
from the destination repository. Native builds continue to use root asset paths.

## Supabase Authentication → URL Configuration

Before the production release, configure and verify:

- Site URL: `https://galactoguide.vercel.app`.
- Allowed redirect URLs:
  - `https://galactoguide.vercel.app/auth`
  - `https://galactoguide.vercel.app/reset-password`
- If the existing custom host remains usable for sign-in, also allow
  `https://www.galactoguide.com/auth` and
  `https://www.galactoguide.com/reset-password`. Otherwise configure its redirect
  to the chosen canonical host before sign-in. Apply the same rule to the bare
  domain after its website routing is fixed.
- Add the exact `/auth` and `/reset-password` URLs for the specific preview being
  reviewed. Avoid a wildcard that permits unrelated Vercel projects.
- Retain existing native and Pages callback URLs while those clients remain in use.
- Recovery and confirmation email templates must honor the requested redirect.
  The standard `{{ .ConfirmationURL }}` link handles the verification step. A custom
  template that hardcodes `{{ .SiteURL }}` may bypass the requested recovery route;
  inspect it before changing it. Never put a raw session token into these docs.

Configure a production SMTP provider (or an explicit Send Email Auth Hook) using
credentials in the provider dashboards, never in the website's public environment
variables. Confirm the sender domain and From address with the operator, then test
delivery to an approved address outside the Supabase project team. Keep email
confirmation enabled.

## Email setup — Resend domain created; DNS verification pending

The user confirmed that `galactoguide.com` is already owned and that Danielle or
someone else manages its domain account. Use this existing domain for the proposed
Resend setup; no new domain purchase is needed. Its administrator can add the
generated email records without sharing dashboard access. The website can keep its
current Vercel URL; the sending domain is independent of the website address.

The user completed Resend signup. Created `auth.galactoguide.com` in the signed-in
`adamjlof` Resend account on 2026-09-19, domain ID
`501592f0-6758-412a-9520-e7256a6fdc1a`, region `us-east-1`. Sending is enabled,
receiving is disabled, and no tracking subdomain is configured. The domain status
is **Not Started** until DNS is added and verification is run.

Squarespace currently opens to its login page in the local browser. The exact
three generated records are ready for the administrator in
`docs/galactoguide-email-dns.md`. They are one TXT record and two CNAME records;
do not replace them with the generic TXT/MX examples from older provider guides.
Public DNS checks returned NXDOMAIN for all three names. No DNS record or
Supabase email configuration has changed.

Sending configuration (Supabase connection not yet applied):

| Setting | Value |
| --- | --- |
| Provider | Resend |
| Sending domain | `auth.galactoguide.com` |
| Sender address | `no-reply@auth.galactoguide.com` |
| Sender name | GalactoGuide |
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` |
| SMTP username | `resend` |
| SMTP password | A dedicated Resend API key, entered directly into Supabase |

Remaining setup:

1. Have Danielle or the domain administrator manage the records for
   `galactoguide.com`. The public Verisign RDAP record identifies the registrar as
   **Squarespace Domains LLC**; its nameservers are `ns-cloud-b1.googledomains.com`
   through `ns-cloud-b4.googledomains.com`. Checked on 2026-09-19 via
   `https://rdap.verisign.com/com/v1/domain/galactoguide.com`.
2. Add the three exact records in `docs/galactoguide-email-dns.md` and verify the
   domain in Resend. Preserve existing website and mailbox records.
3. After verification, configure Supabase SMTP with the values above and a
   dedicated key. Keep credentials out of Git, public client config, and chat.
4. With the verified preview callback URLs configured, test confirmation and
   password reset to an approved non-team test mailbox. The user completes any
   password-entry/change steps. No real auth email has been sent by this work.

Source: [Resend's Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp).

Password recovery uses Supabase's PKCE flow. Request the email and open its link in
the same browser/profile. The reset page handles invalid/expired links, missing
verifiers, validation, failed saves, retry, and success. Existing recovery links
returning to `/auth` or `/` are redirected when the SDK emits `PASSWORD_RECOVERY`.
The SDK handles callback exchange once; the app also checks initialization errors
so an older signed-in session cannot conceal a failed recovery callback.

## Privacy and terms

- `public/privacy.html` replaces the old policy's inaccurate no-accounts/no-data
  statements with the actual website data flows: optional accounts, selected
  situations and saved-entry sync, public discussions, local session storage,
  feedback/report delivery, and provider processing.
- `public/terms.html` preserves the prior medical-use and other terms, updates
  the website address and milk-production wording, and adds account/community use.
- Legal links are available in authentication, the disclaimer, and About. Static
  documents load without JavaScript or an account and support light/dark appearance.
- The existing Dyad contact website remains the contact route. No new privacy
  inbox, retention deadline, jurisdictional compliance guarantee, or automatic
  account-deletion feature is assumed. The operator should verify its contact and
  retention practices against this wording before publication.

## Verification

```powershell
npm run build:web -- --output-dir .tmp/website-launch-web
node scripts/auth-callback-check.mjs
# With temporary React test dependencies from supabase/README.md:
# $env:FORUM_TEST_RUNTIME = '.tmp/forum-test-runtime'
# node scripts/account-isolation-check.mjs
node scripts/web-launch-check.mjs
# Optional existing responsive suites, using the same local server:
$env:CHECK_DESKTOP = '1'
node scripts/web-launch-check.mjs
npx tsc --noEmit
npm run lint
```

The browser check serves the export using the configured routing rules and mocks
all recovery/database operations. It sends no real email and changes no account.
It is not proof of the live Vercel or Supabase configuration. Before cutover, review
the actual preview and test confirmation, sign-in, recovery email delivery, saving,
posting, and report delivery with an approved test account.

Account-switching regression checks cover owner-specific caches, separate guest
preferences, unknown-owner legacy data, delayed storage/server reads, pending
preference uploads, and auth hydration. Old unowned favorites/situation caches are
not imported; existing account data comes from Supabase. Returning guest users of
the development app may need to select situations again once.

## Sources checked

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Supabase password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase redirect URLs and email templates](https://supabase.com/docs/guides/auth/redirect-urls)
- Legacy privacy/terms from destination commit `00c6c3ce16d5d12dec2a7ad5947a55a721649264`.
