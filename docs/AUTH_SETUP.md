# Auth & sync setup (Supabase)

GalactoGuide supports **optional** accounts: email/password + "Continue with Google".
Reference content is available without an account. Saved entries and community
participation require sign-in. Portal and situation choices also work locally
while signed out.

For the existing production project, follow [website launch configuration](website-launch.md).
The repository migration keeps that database and its users. The setup steps below
are for a separate environment; do not recreate the production database.

## 1. Create the Supabase project

1. Create a project at https://supabase.com.
2. Project Settings → **API**: copy the **Project URL** and the **anon / publishable** key.
3. Put them in `app.json` under `expo.extra`:
   ```json
   "extra": {
     "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
     "supabaseAnonKey": "YOUR_ANON_PUBLISHABLE_KEY"
   }
   ```
   For local dev you can instead set `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (these override `extra`). The anon key is
   client-safe — Row-Level Security enforces access. Never use administrative or
   service-role credentials in the client build.

## 2. Run the database schema

For a **fresh database**, run [`supabase/schema.sql`](../supabase/schema.sql).
It includes account tables, forum tables, and row-level security. For an existing
database, review [migration instructions](../supabase/README.md) instead.

## 3. Enable auth providers

Dashboard → **Authentication → Providers**:
- **Email**: enable and keep email confirmation enabled. Configure a production
  SMTP sender before testing public signup or recovery.
- **Google**: enable, then paste your Google **Web Client ID** + secret (from step 4).

Dashboard → **Authentication → URL Configuration**:
- **Site URL**: the verified production host; the prepared default is
  `https://galactoguide.vercel.app`. Switch the live setting with the coordinated cutover.
- **Redirect URLs**:
  - `https://galactoguide.vercel.app/auth`
  - `https://galactoguide.vercel.app/reset-password`
  - Both exact callback paths on every verified custom host and review preview.
    Browser authentication returns to the origin that started the request.
  - Local development: both paths on the actual server origin, for example
    `http://localhost:8081/auth` and `http://localhost:8081/reset-password`.
  - `galactoguide://**` — native (iOS/Android)
  - Retain existing Pages/native URLs while those clients remain in use.
- The Confirm sign up template must include `{{ .Token }}` for the in-place
  signup code flow. The current Supabase Email OTP length is eight digits; the
  app accepts the full code without truncating it. Keep `{{ .ConfirmationURL }}`
  as a fallback while older clients remain in use. Recovery must preserve its
  `{{ .ConfirmationURL }}` link;
  it uses PKCE, so open that link in the same browser/profile.

## 4. Google Cloud Console

Create an **OAuth 2.0 Client ID** of type **Web application**
(APIs & Services → Credentials):
- **Authorized JavaScript origins**, if used: the verified website/local origins.
- **Authorized redirect URIs**: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
  - Google always redirects to Supabase's callback; Supabase then redirects back to the
    app (the app subpath belongs in Supabase's allow list from step 3, **not** here).

Paste the resulting Client ID + secret into Supabase's Google provider (step 3).

## Platform notes / gotchas

- **GitHub Pages subpath**: Pages builds explicitly set
  `GALACTOGUIDE_WEB_BASE_PATH=/galactoguide`; their callbacks include that subpath.
  Vercel builds use root paths.
- **Native Google sign-in** uses the `galactoguide://` deep link and needs a **dev/native
  build** (EAS) — it does not work in Expo Go.
- **Web** uses a full-page redirect and the Supabase SDK handles PKCE callback
  exchange. Verify the actual hosted preview before changing production settings.
- **Session storage**: native uses AsyncStorage; web uses `localStorage`. No `expo-secure-store`
  (it has no web support).

## What syncs

| Data | Logged out | Logged in | Reconcile on login |
|------|-----------|-----------|--------------------|
| Favorites (`favorites`) | sign-in required | account-specific local cache + synced | union with the same account's cache |
| Portal + disclaimer + situations (`user_prefs`) | separate guest preferences | account-specific local cache + synced | last-write-wins after local account hydration |

Switching accounts cancels pending preference uploads and ignores late reads.
Old unowned favorites and situation caches are left untouched but are not read or
uploaded. Existing server data remains; older guest situation choices need to be
selected again once. Only the old guest portal/disclaimer choice is retained.

Local regression check (fixture accounts; no live writes):

```powershell
# Temporary test dependencies: see supabase/README.md.
$env:FORUM_TEST_RUNTIME = '.tmp/forum-test-runtime'
node scripts/account-isolation-check.mjs
```
