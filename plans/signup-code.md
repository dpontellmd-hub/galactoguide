# In-place signup email verification

## Goal
Create an account, enter the six-digit email code on the next screen, then continue signed in. A password alone must not grant access before the email is verified.

## Work
- [x] Restore and verify Supabase Confirm email is enabled.
- [x] Add signup-code verification and resend to the shared account form.
- [x] Hold onboarding Next while verification is pending; return to the app when the auth modal completes.
- [x] Remove the previous immediate-access reminder from the active UI.
- [x] Prepare the Confirm sign up email template with `{{ .Token }}` and a link fallback for older clients.
- [x] Pass focused provider/form tests, callback regressions, TypeScript, lint, and web export.
- [ ] Publish the reviewed client change after explicit user approval to commit and push.
- [ ] Save the live Confirm sign up template, then test a fresh signup on the preview with the user entering their own password and code.
- [ ] Coordinate website production cutover separately after preview acceptance.

## Release guard
The earlier immediate-access client is already in draft PR #2. Its separate `email_verifications` table was installed in live Supabase; it is unused by this final flow. Leave the additive table in place for now. Never disable Confirm email for this rollout. Keep the old signup email's link working until the new client is deployed.

TLDR: The code-entry flow is ready locally; publish the client and email template together, then verify a fresh signup before cutover.
