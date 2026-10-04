# Immediate account access rollout (superseded)

The user changed the signup requirement on 2026-09-23. Keep Supabase **Confirm email enabled** and follow [the signup-code rollout](signup-code-rollout.md). This file remains only to record that the earlier deferred-verification rollout was abandoned before production cutover. Its additive `email_verifications` table was already installed and should not be rerun or dropped during the replacement rollout.
