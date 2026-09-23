# Signup code rollout

Supabase **Confirm email must stay enabled**. After account creation, the app shows a code field on the same signup screen. The live Supabase Email OTP length is eight digits; the field accepts the full code without truncation. `verifyOtp` with type `email` confirms the address and starts the session. The user then continues through onboarding or returns to the app from the auth modal.

1. Publish the reviewed client change to the draft replacement PR only after explicit commit/push instruction. Confirm the Vercel preview build succeeded and `/auth` loads.
2. In Supabase → Authentication → Emails → **Confirm sign up**, set the subject to `Your GalactoGuide verification code` and paste `supabase/templates/confirm-signup-code.html` as the body. Keep the link fallback while older clients may be open. This is a shared live-project template, so change it only when the new preview is ready for testing.
3. Use a fresh approved test address in the preview. The user enters their password. Confirm that Create account shows the code field and does not sign in yet. The email must contain an eight-digit code. Enter all eight digits on the same page and tap Verify email; the account should become signed in, with onboarding Next available.
4. Check a wrong code remains on the code screen, resend works after the cooldown, and sign-out/sign-in with the new account succeeds. Check password recovery and Google sign-in still work.
5. Keep the production Site URL, live main branch, and old website unchanged until the separate website cutover. Do not rerun or drop the earlier `email_verifications` migration during this rollout.

The live Confirm sign up template contains the code and a link fallback. Keep the link while older clients may be open. The Magic link/OTP template is separate and is not the signup email.

## Onboarding continuity regression

Verification changes the preference storage owner from guest to the new account. RootNavigator temporarily unmounts while that account's preferences load. Onboarding now keeps the slide number in its route and prepares the pending signup's empty preference cache before calling verification. Only the chosen view and situations explicitly selected in this tour are handed off; guest caches, bookmarks, disclaimer acceptance, and existing account caches are not copied or overwritten.

`node scripts/account-isolation-check.mjs` exercises the actual onboarding screen and AuthForm with delayed account storage and a navigator remount. It verifies wrong-code retry, step 6 returning with Signed in and Next, step 7 and notices, cloud preference reconciliation, and account isolation. The hosted acceptance check must wait for account hydration after verification; a momentary Signed in message alone is insufficient evidence.
