# Immediate account access rollout

The new flow creates a signed-in account, sends a nonblocking verification email,
and displays a small reminder. Favorites, preferences and forum access work while
verification is pending. Email-delivery failures never report account creation as
failed. The user can resend later.

## Deployment order

1. Apply `supabase/migrations/20260923_email_verification.sql` **once, while Confirm
   email is still enabled**. It preserves existing confirmed accounts. Do not rerun
   its backfill after auto-confirmation is enabled.
2. Publish the client and verify the exact preview `/auth` callback is allowed in
   Supabase. Keep the production Site URL and existing callbacks until cutover.
3. Update Supabase's **Magic link or OTP** email template:
   - Ready-to-paste HTML: `supabase/templates/verify-email.html`.
   - Subject: `Verify your GalactoGuide email`
   - Body: `Your account is ready to use. Confirm your email whenever convenient.`
   - Link using `{{ .ConfirmationURL }}`: `Verify email and continue`
   - Keep the standard Supabase verification URL; never replace it with SiteURL.
4. With action-time approval, disable **Confirm email**. This changes the live
   project's signup policy for all clients, not just the preview. Supabase's
   `email_confirmed_at` now means auto-confirmation; it is not ownership evidence.
5. User tests a fresh signup: immediate session, favorites/sync, email received,
   reminder displayed, link opened in the same browser, reminder gone, status
   retained after sign-out/sign-in. Also check resend and recovery.

## Verification model

The private `email_verifications` table cannot be read or written directly by
clients. Its RPC accepts only server-signed, matching-email magic-link/recovery/
email-change evidence, or a Google identity with a verified matching email.
Changing the account email clears the separate verification state. Client-editable
user metadata, password login, signup and SMS OTP do not prove email ownership.
Magic links reuse the existing Supabase SMTP configuration; no new API key is
needed. The reminder refreshes after auth changes and returning to the app.

Email links use the existing PKCE callback behavior; this website launch tests
the same Chrome profile. Native deep-link verification needs its own device test
before shipping a native release.

## Rollback

Re-enable Confirm email to restore blocking signup. Keep the additive verification
table and existing account records. Accounts already created while auto-confirmation
was enabled retain their access; do not blanket-revoke or relabel them as verified.
