# Account deletion: review implementation, not deployed

The app's My Account screen links to `/delete-account`. The public, no-login request page is `/account-deletion.html` (a distinct filename so it cannot overwrite Expo's exported route). Both include a manual request path to the existing contact `adam@dyadhealthcollective.com`. No request or live deletion has been sent. Confirm that Adam will own this inbox workflow; moderation staffing does not automatically establish deletion-request staffing.

## Decisions required before enabling

- Approve `erase_owned_content_v1`: permanently erase the departing user's account, saved substances, selected situations/preferences, votes, forum text/title/author identity. Preserve placeholders and other people's responses. Erase reports by/about them, report reasons and associated moderation audit through moderation FKs. This favors erasure over retaining abuse evidence. Confirm whether any narrow, disclosed retention obligation changes that choice; do not enable until resolved.
- Set an approved duration/handling policy for support emails, existing Formspree reports, provider logs and backups. The SQL does not reach those systems, erase other people's copies, or erase caches on other devices. No universal immediate-erasure promise is made.
- Confirm manual request owner, response expectations and ownership verification. A matching email address in a request alone is never authority to delete. Verify through an authenticated channel or reviewed recovery process; do not ask users for passwords/codes.
- Apple-linked accounts remain blocked by the ordinary deletion RPC. The draft now includes a separate, default-disabled Edge Function and service-only RPC path for fresh Apple code exchange, verified revocation, and deletion. No provider tokens are retained; a fresh Apple sheet is required each attempt. External setup and real-provider/device validation are still release blockers. See [Apple setup](apple-sign-in-setup.md).

## Server design and isolated setup

Apply the existing `schema.sql`, `20261010_forum_moderation.sql`, then `20261011_account_deletion.sql` and `20261014_apple_account_deletion.sql` to a disposable local/isolated project only. No deployment or live DB changes are authorized. The deletion function is `SECURITY DEFINER` with an empty search path and no caller-supplied user ID. Supabase/PostgREST verifies the bearer JWT; `auth.uid()` determines the sole target. The client pins that exact session's token to the request to prevent an account-switch race.

The non-Apple self-delete RPC requires exact `DELETE` confirmation and a signed AMR password/oauth/otp authentication timestamp within five minutes; a recent token refresh is insufficient. Unknown/missing AMR fails closed. Confirm actual provider AMR claims against an isolated Supabase environment before enabling. Test fixture values are not a claim that live providers are configured.

Deletion takes a lock on the auth user and executes account-data cleanup and `auth.users` deletion in one database transaction. Supabase auth-table cascades remove identity/session rows; all constraints must be checked against the target isolated schema/version. Any failure rolls back the entire deletion. The old access token can remain cryptographically valid until expiry; the auth user is gone and protected mutation functions must check active membership/user existence. Do not use JWT validity alone for privileged authorization.

`private.account_deletion_config` is inaccessible to anon/authenticated clients. It defaults disabled, even after migration. Only after explicit approval and isolated validation, an authorized operator may set `enabled=true, retention_strategy='erase_owned_content_v1'` on its singleton row. This document does not authorize doing so. The ordinary RPC always blocks Apple-linked users. The separate Apple path additionally requires `apple_revocation_enabled=true`, an enabled isolated Edge Function, a valid DB session, fresh subject/nonce-bound Apple proof, and successful Apple revocation. A client cannot finalize that path or supply an owner ID.

The UI offers inline password/Google verification for non-Apple accounts. For Apple-linked accounts it asks for fresh Apple verification only after explicit deletion confirmation, without replacing the Supabase session. Google web returns to the allowlisted `/delete-account` route; add that exact callback only in an approved isolated provider setup. It resets confirmation after verification and account changes, never auto-deletes from a callback, prevents duplicate clicks, and clears local account caches after successful deletion. Cleanup calls the auth provider's serialized, account-aware `finalizeDeletedAccount(owner)`: it checks the live session and preserves a different account even if the deleting screen already unmounted before the server responded. Cache removal is scoped to the captured deleted account. An ephemeral in-memory receipt created only after server success preserves the completion message across account-provider hydration/remounts; it is not read from a URL or persisted storage and is cleared when acknowledged or when a different account signs in. Recovery errors prevent deletion. Cancellation does not call the deletion RPC.

## Verification

### Browser cleanup limitation

The installed auth SDK cannot atomically sign out only the expected account across tabs. Web deletion therefore never calls generic SDK sign-out or removes shared auth storage automatically, even when the current account initially matches the deleted owner. The provider suppresses that deleted owner's in-memory session and returns `manualCleanupRequired`; the UI confirms server deletion but instructs the user to clear GalactoGuide site data in browser settings before sharing the device. This user-initiated action also signs out other GalactoGuide accounts in that browser. This limitation is explicit rather than risking deletion cleanup signing out a newer account in another tab. Reloading before clearing site data can restore the SDK's stale local session until it is rejected by the server.

Native deletion retains serialized, owner-checked local sign-out. If another account is active, both platforms preserve it and clear only the deleted owner's cache keys. Device/provider cache lifecycle checks remain necessary in the isolated validation environment.

`scripts/account-deletion-check.mjs` runs actual client helper/screen behavior with mocked auth/network/storage. `scripts/account-deletion-database-check.mjs` executes SQL in disposable PGlite PostgreSQL: grants, off-by-default config, confirmation, stale/missing/future authentication, Apple gate, transactional rollback, self-only erasure, cascades, preserved other-user responses and replay denial. No test connects to Supabase.

Still required after review: real isolated Supabase Auth/PostgREST verification, cache clearing on devices, native/web reauthentication paths and account switches, failure/retry behavior, and Apple revocation integration. Public pages are review copy, not a finalized retention policy or a deployed customer promise.

The October 14 Apple regression runs use real WebCrypto signatures and SQL in
PGlite, with mocked Auth/Apple transports. They are not a claim of real Apple or
Edge Runtime deployment verification. The earlier October 10 real local Auth /
PostgREST run covered revision `727fb8f`, not this new Apple migration. The local
Docker backend remains stopped.
