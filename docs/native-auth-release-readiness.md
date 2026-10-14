# Native authentication preparation

These changes are prepared for review only. No provider, Apple capability,
credential, redirect allowlist, live account, or shared backend was changed.
Apple sign-in is **disabled by default**. Do not publish this branch as a ready
Apple-enabled release until the configuration and deletion/revocation work below
has been approved and verified in an isolated environment.

## Password recovery and Google

The native auth provider listens for launch URLs and resumed-app URLs before
hydration. The same handler completes Google browser returns, so duplicate
delivery cannot spend a PKCE code twice. Only `galactoguide://auth`,
`galactoguide://reset-password`, and `galactoguide://delete-account` are accepted.
Arbitrary web URLs, credentials in fragments, malformed and repeated codes fail
closed. Old implicit-token links need to be replaced with a new reset request.

Recovery requires the `recovery` marker Supabase stores with its PKCE verifier,
not just a URL named `reset-password`. A stale signed-in session cannot authorize
resetting a password after a failed callback. Successful update, cancellation of
the reset screen, sign-out, or a different normal sign-in clears recovery mode.
Duplicate callbacks do not reactivate it. The in-memory replay cache is bounded
to 64 attempts; the server independently enforces one-time codes. A callback from
a cold start after an already-used code will show a new-link request, not accept
the previous account session as recovery proof.

Refreshing the web recovery screen after its one-time callback was consumed also
requires a new reset link. A restored ordinary session does not preserve recovery
permission. Complete the password change before refreshing or closing the page.

Explicit sign-out immediately suppresses auth state, waits for any pending
callback or sign-in exchange, then clears the SDK's persisted session. If that
sign-out fails, new auth state stays suppressed until sign-out is retried.
Cancelling a reset while its callback is pending also suppresses late recovery
mode, so a completed exchange cannot reopen the reset screen.

The installed auth-js implementation returns `data.redirectType` from
`exchangeCodeForSession`, although its public TypeScript result omits that field.
The handler narrowly describes this field and fails closed if it is absent.
Keep the callback regression test when upgrading Supabase.

Configuration to verify later, with separate approval:

- Keep PKCE enabled. Preserve `{{ .ConfirmationURL }}` in the recovery template.
- Allow the exact native URLs above in the intended Supabase project. Existing
  `galactoguide://**` covers them; this change does not broaden any live allowlist.
- Allow `/auth`, `/reset-password`, and `/delete-account` on each explicitly
  approved web origin. The deletion path returns the user to a new confirmation
  screen after Google reauthentication; it never auto-deletes.
- Request a reset in the same installed app/device or same browser/profile that
  will open it. Another device lacks the persisted verifier. Requesting several
  reset/OAuth flows before opening their links can replace that verifier; use the
  latest request. The app does not import credentials from another environment.

## Apple sign-in: isolated implementation prepared, external setup pending

Native sign-in uses the system Apple sheet and Apple's native button, device
availability checks, a fresh 256-bit nonce and random state. SHA-256(nonce) goes
to Apple; the original nonce goes to Supabase `signInWithIdToken`. Supabase
validates signature/audience/nonce. Only email is requested, not a legal name.
Cancellation never reports a session. The ordinary sign-in helper does not
exchange or retain provider refresh tokens.

`app.config.js` now prepares `ios.usesAppleSignIn` and the
`expo-apple-authentication` plugin when `GALACTOGUIDE_APPLE_SIGN_IN=1` and
`GALACTOGUIDE_NATIVE_BUILD=1`. It refuses the production backend. Outside the
synthetic QA export, an explicit isolated `EXPO_PUBLIC_SUPABASE_URL`, client-safe
publishable key, and matching `GALACTOGUIDE_APPLE_ISOLATED_BACKEND` are required.
Default configuration remains unchanged and Apple remains disabled. Evaluating
this config is local; running EAS Build could synchronize Apple capabilities and
profiles, so no signed build is authorized or run here.

The prepared Edge Function exchanges a **fresh deletion-specific authorization
code**, validates Apple's signed ID token against the stored Apple identity and
server challenge, revokes the resulting refresh token, and only then finalizes
atomic account deletion through a service-only RPC. Tokens stay in server memory;
no reusable provider token is stored. This design requires the user to complete
the Apple sheet at deletion time. It does not offer unattended token revocation
or bypass Apple verification when the user cannot complete it.

See [Apple setup and approval handoff](apple-sign-in-setup.md) for the exact flow,
security gates, operator settings, failure recovery and approval-dependent steps.
No Apple key, provider configuration, capability, profile or hosted resource has
been created or modified. No migration or Edge Function has been deployed.

If Apple email relay is used, verify the sender/relay configuration for account
email before rollout. Existing Google/email accounts are not manually merged by
this implementation; verify intended account-linking behavior in isolated tests,
especially Apple Hide My Email. Do not change live linking/security settings as a
side effect of setup.

## Verification and limits

`node scripts/auth-callback-check.mjs` runs the real React provider lifecycle
against fake auth, Linking, browser, and Apple boundaries. It covers signed-out
cold/warm recovery, stale hydration/session races, duplicate callbacks, failed
and missing-session exchanges, invalid URLs, password retry, cancellation, web
redirects, and Apple's platform gate, nonce/state binding and error paths.
Signup regressions remain in `signup-code-check.mjs` and
`signup-code-form-check.mjs`. No fixture sends email, creates an account, or writes
to a live backend.

Still required after isolated provider/capability configuration: signed iPhone
tests of Apple first/repeat login, cancellation, Hide My Email, revoked access and
deletion/revocation; Android/iPhone Google login; reset email cold/warm return and
same-device verifier persistence; browser return to deletion with fresh explicit
confirmation; network loss/retry and account switching. Windows export/type
checks do not validate Apple entitlements, provisioning, device presentation, or
live provider configuration.

References: [Expo SDK 57 AppleAuthentication](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/),
[Supabase Apple authentication](https://supabase.com/docs/guides/auth/social-login/auth-apple).
