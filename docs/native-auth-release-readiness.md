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

## Apple sign-in: configuration still required

The prepared iOS flow uses the system Apple sheet and Apple's native button,
checks device availability, generates a fresh 256-bit nonce and random state,
sends SHA-256(nonce) to Apple, validates returned state and identity token, and
sends the original nonce to Supabase `signInWithIdToken`. Supabase verifies the
token signature/audience and nonce. Only email is requested; there is no need to
collect a legal name for this app. Google and email sign-in remain available.
Cancellation is not reported as a successful session. Tokens/codes are never
logged or written by this helper.

Before enabling, obtain approval for all of these external steps:

1. In the intended isolated Supabase project, enable the Apple provider with
   `com.dyadhealthcollective.galactoguide` as an accepted native client ID/audience.
   Keep nonce verification enabled. Native ID-token sign-in does not require
   adding an Apple web OAuth flow or embedding a client secret in the app.
2. On Apple team `WZPCR7N6GT`, enable Sign in with Apple for the existing bundle ID.
   Review its association/grouping and the correct publisher/team before doing so.
3. Add `ios.usesAppleSignIn: true` and the `expo-apple-authentication` config plugin
   to app configuration **after approval**. They are intentionally absent now.
   Regenerate the provisioning profile to include the entitlement only through an
   approved credential workflow. This branch does not change that profile.
4. Complete the server-side Apple token-revocation design for account deletion
   before enabling Apple for real users. The current helper does not retain Apple's
   short-lived authorization code or obtain/store an Apple refresh token. Deletion
   of an Apple-linked account therefore remains blocked by the prepared backend.
   A future approved server flow must exchange a fresh Apple authorization code,
   securely keep/use the provider token needed for revocation, and revoke it before
   deleting the app account. This requires a server-held Apple signing key/client
   secret and approved storage/retention choices; never place those in `extra`,
   `EXPO_PUBLIC_*`, the JavaScript bundle, or source control. Do not enable Apple
   merely because an ID-token test passes.
5. Only when these prerequisites are satisfied, set
   `GALACTOGUIDE_APPLE_SIGN_IN=1` for an approved native build. The flag alone does
   not enable the Apple capability. No build or submission was made in this phase.

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
