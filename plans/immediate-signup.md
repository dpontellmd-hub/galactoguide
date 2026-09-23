# Superseded: immediate signup with deferred email verification

The user chose in-place signup code verification on 2026-09-23. Do not disable Supabase Confirm email. Follow `plans/signup-code.md` and `docs/signup-code-rollout.md` instead.

The earlier client design was pushed to draft PR #2 at `83e2a20925c17a127f578efb0fa5b2c959b15837`. Its additive `email_verifications` migration was installed in live Supabase but is unused by the replacement flow. Leave the table in place during cutover; do not rerun its backfill or remove it as part of this signup change.

TLDR: The immediate-access design is abandoned; account access now waits for the email code.
