# Apple sign-in: isolated setup handoff

Prepared October 14, 2026 in draft PR #3. Nothing in this document authorizes a
production change, credential creation, capability sync, signed build, or submission.
Apple remains disabled by default. The production Supabase project
`axxuefnkoxfifftjnuxo` is explicitly rejected by the prepared Apple configuration
and deletion handler.

## What is implemented

- Native `usesAppleSignIn` and `expo-apple-authentication` configuration behind an
  explicit native/isolated opt-in. Default web and native configuration stays off.
- Existing email-only Apple login: native nonce/state, Supabase ID-token validation,
  platform/availability gates, cancellation and auth lifecycle protection.
- An additional native deletion helper: exact DELETE consent comes first; it pins
  the original Supabase bearer to both function calls and does not replace the
  Supabase session when showing the Apple sheet. It sends only a fresh authorization
  code and request ID; no client-supplied target account or Apple subject is accepted.
- `supabase/functions/apple-account-deletion`: a dependency-free Web API handler
  and Deno adapter. Auth `/user` verifies the bearer before claims are used. SQL
  independently verifies session ownership and the stored Apple identity.
- `20261014_apple_account_deletion.sql`: default-off Apple gate, private challenges,
  service-only begin/claim/finish RPCs, and shared atomic account-data cleanup.
  The public `delete_own_account` RPC still unconditionally blocks Apple identities,
  including accounts linked to both Apple and password/Google.

## Exchange, verification and revocation

1. After explicit confirmation, the authenticated function generates a 256-bit nonce.
   SQL stores only its SHA-256 hash, a random request ID, the validated owner/session,
   the Apple subject from `auth.identities`, and a five-minute expiry.
2. The native Apple sheet receives that hash and request ID as state. Cancellation,
   mismatched state or missing code prevents the completion request. No extra profile
   scopes are requested for deletion.
3. Completion revalidates Auth and atomically changes the owned request from pending
   to exchanging. Wrong owner/session/subject, expired requests and repeat claims fail.
   Five challenges per account per ten minutes are allowed; the owner lock serializes
   the limit and claims.
4. The server creates a five-minute ES256 client secret in memory using an operator-held
   Apple key, and POSTs the code to Apple's fixed HTTPS `/auth/token` endpoint. Native
   authorization has no browser redirect URI. HTTP redirects are rejected.
5. It verifies the returned ID token's RS256 signature using Apple's fixed JWKS
   endpoint, then exact issuer, native bundle audience, stored Apple subject, nonce,
   expiry and recent issuance. Email and editable user metadata are never identity proof.
6. It revokes the returned refresh token via `/auth/revoke`. Only HTTP 200 permits the
   service-only finish RPC. The final transaction rechecks the deployment gate,
   active session, current identity, claim and expiry, then erases the account using
   the existing retention strategy. Other authors' replies remain intact.

No code, private key, client secret, provider access/refresh token or ID token is
logged or persisted by this implementation. Tokens exist only in request memory;
the function never returns them. Request/response sizes and network durations are
bounded, failures return fixed generic messages, and browser-origin calls are rejected.
Keep platform request-body tracing and verbose auth/debug logging disabled during
real validation. Infrastructure logging/retention still needs operator review.

The service role is the trust boundary: only the handler may finalize after verified
revocation. The database cannot independently call or attest Apple's response.
Never grant these RPCs or private helpers to client roles or reuse them in an endpoint
that trusts a client-reported revocation success.

## Failure and retention decisions

Revocation and database deletion cannot share one transaction. If Apple succeeds
but the DB or response fails, the client reports uncertainty, never success. A new
attempt obtains a fresh challenge/code; it does not replay a consumed authorization
code. The user may need to sign in to Apple again. A SQL failure rolls back all local
erasure. A successful deletion cascades its private challenge metadata.

Unsuccessful challenges retain only identity/request metadata, not provider tokens.
Rows older than 24 hours are opportunistically removed when a new challenge is created;
this is **not** a guaranteed 24-hour retention limit if there are no later requests.
Approve a cleanup schedule/retention policy before enabling for users. No scheduler
was created. The fresh-code approach cannot revoke an inaccessible Apple account
without user interaction; the manual support process remains necessary. Persistent
encrypted provider-token storage and unattended revocation are deliberately not
implemented or authorized by this preparation.

## Actions requiring explicit approval or user handoff

| Proposed action | Exact target/data | Consequence and current status |
| --- | --- | --- |
| Select an isolated Supabase project | New/existing nonproduction project ref, organization, region and free-tier eligibility; none selected | Needed before any provider setting, migration, function deployment or credential placement. No project was created or linked. |
| Enable native Apple provider | Selected isolated project's Auth provider; accepted native audience `com.dyadhealthcollective.galactoguide`; nonce verification on | Allows Apple identities in that isolated backend. Do not add a web Service ID, broaden redirects or change linking settings incidentally. Await approval for the named project. |
| Enable Apple capability | Apple team `WZPCR7N6GT` (Adam Loftus), existing App ID `com.dyadhealthcollective.galactoguide`; inspect grouping before change | Changes Apple's developer configuration and may require a new provisioning profile. No capability or profile was changed. Needs action-time approval. |
| Configure a Sign in with Apple key for server exchange/revocation | A key authorized for that App ID/team, key ID and `.p8` private key placed directly by the user into the approved isolated function's secret store | Grants ongoing ability to sign Apple client secrets. An App Store Connect upload key is not a substitute. Inspect/reuse an appropriate key only with approval; creating a key needs separate approval. **Do not paste/upload/send the private key through chat or agent tools. User handoff required.** |
| Deploy isolated function/migrations and enable deletion gates | Only the approved isolated project; schema + moderation + both deletion migrations; function with JWT verification enabled | Creates privileged deletion machinery and permits synthetic deletion. Needs named-target approval and retention decision. No deployment occurred. |
| Prepare a signed device build later | Existing EAS project/App ID, reviewed Apple capability/profile | Can modify signing assets and consume build quota. Outside this request; obtain separate approval. Never run EAS Build just to inspect local configuration. |

No highly sensitive credential should be delivered to an agent. The operator enters
server secrets directly. No credentials are needed for the committed fixture tests.

## Operator configuration after approval

Server-only values (never `EXPO_PUBLIC_*`, Expo `extra`, source control or client env):

- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`: operator-provided Apple key.
- `APPLE_ISOLATED_PROJECT_REF`: exact approved 20-character project reference.
- `APPLE_ACCOUNT_DELETION_ENABLED=1`: only after the deployment and synthetic validation
  plan is approved. Missing/invalid configuration returns a disabled response.
- Supabase's existing runtime `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY`: supplied by the approved isolated runtime, not copied
  from production or another environment. No new service key is generated by this code.

Keep gateway JWT verification enabled (`verify_jwt = true`, the default) for
`apple-account-deletion`. Do not deploy with `--no-verify-jwt`. If the chosen project's
JWT/signing mode is incompatible, stop and review that configuration; do not weaken
verification to make testing pass. The handler additionally verifies Auth itself.

Apply SQL in order: `schema.sql`, moderation, October 11 deletion, October 14 Apple
deletion. Both `enabled` and `apple_revocation_enabled` default false. An approved
operator must select `erase_owned_content_v1` before enabling those flags. Ordinary
password/Google deletion still requires fresh signed AMR within five minutes; the
Apple path instead requires the fresh server-challenged Apple proof.

For a later approved isolated native build, set `GALACTOGUIDE_NATIVE_BUILD=1`,
`GALACTOGUIDE_APPLE_SIGN_IN=1`, the isolated public Supabase URL and `sb_publishable_`
key in `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and repeat that
URL in `GALACTOGUIDE_APPLE_ISOLATED_BACKEND`. Production and missing/mismatched
settings are refused. Do not use synthetic `GALACTOGUIDE_ISOLATED_QA=1` for a device
acceptance build; that replaces the backend with the nonresolving test fixture.

## Verification and remaining limits

`apple-client-check.mjs` covers native gates, challenge/state/code binding,
cancellation, pinned bearer, transport failures and explicit success. Existing
auth/deletion lifecycle tests cover account switching and owner-safe cleanup.
`apple-server-check.mjs` uses actual RSA/ECDSA WebCrypto and PGlite SQL, with fake
Auth and Apple HTTP: defaults/grants, malformed requests, forged bearer, bad
signatures/claims, expiry/replay, wrong sessions/identities, rate limiting,
exchange/revoke failure, revoke-before-delete, SQL rollback/retry, cascades and
other-user preservation. The CI job runs these without secrets or deployment.

These checks do not establish that a real Apple key/provider, Deno deployment,
signed entitlement, first/repeat login, Hide My Email, revoked-access notification,
or iPhone sheet works. Real isolated provider/device acceptance remains required.
No new Apple-enabled binary exists. October 10 TestFlight build 9 is unchanged.
The stopped local Docker fixture was not restarted or migrated for this work.

Official documentation consulted October 14:
[Expo SDK 57 AppleAuthentication](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/),
[Supabase Apple auth](https://supabase.com/docs/guides/auth/social-login/auth-apple),
[Supabase function authorization](https://supabase.com/docs/guides/functions/auth),
[Apple token exchange](https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens),
[Apple token revocation](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens),
[Apple TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).
