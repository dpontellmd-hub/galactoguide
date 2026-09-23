# Immediate signup with deferred email verification

## Goal
Create an account and continue immediately; verify email later from a small reminder.

## Work
- [x] Add server-owned verification records separate from Supabase auto-confirmation.
- [x] Send verification through existing Supabase magic-link email delivery, with resend and nonblocking failures.
- [x] Add a compact reminder; handle account switching and stale requests.
- [x] Test database authorization, signup/session behavior, and web build.
- [ ] Publish the reviewed code, apply migration and email template, then disable blocking confirmation and test live.

## Decisions
- User explicitly selected immediate signed-in access, including saved favorites and syncing.
- Verification is informational; existing account permissions remain unchanged.
- Use server-validated email-link authentication evidence, never editable user metadata or the auto-confirmed email timestamp for new accounts.
- Preserve already-confirmed accounts with a one-time migration before disabling Confirm email.
- Do not change production settings until the new client is ready. Commit/push still requires explicit user instruction.

## Validation / resume point
- Passed TypeScript, focused ESLint, production web export (27 routes), auth callback regression tests, disposable PostgreSQL verification tests, and actual React provider signup/delivery tests.
- No commits, pushes, live database migration, template edits, or auth-setting changes made for this feature yet.
- Next: publish to the existing preview branch with explicit push authorization, then follow `docs/immediate-signup-rollout.md`. Live signup and email-link proof still require user testing.

TLDR: Built and tested locally; publish and activate before users can use the new flow.
