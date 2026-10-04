# GalactoGuide

Cross-platform (iOS · Android · Web) evidence-based reference for galactogogues &
galactofuges, by Dr. Diana Pontell, MD, IBCLC — The Dyad Health Collective.

Built with **Expo SDK 57 (React Native) + TypeScript + Expo Router**. The current
release is a website-first replacement of the original single-file web app.
It includes optional Supabase accounts, saved entries, situation preferences,
community discussions, and responsive phone/desktop layouts.

Release preparation and remaining launch checks are in the
[migration checklist](docs/migration-release.md). Native store publication is a
separate release.

## Run it locally

```bash
npm ci
npm run web
```

Use Node.js 22.13 or newer and the committed lockfile. Public Supabase client
settings are in `app.json`; no private `.env` file is required to build the website.
See [authentication setup](docs/AUTH_SETUP.md) before configuring another backend.

## Responsive layouts

The same routes adapt to the available window. The native iOS/Android app uses a
right-side navigation rail when both window dimensions are at least 600 logical
pixels (unfolded phones and tablets), and bottom tabs in compact windows. This is
size-based, not foldable-model detection. Browsers never show the right rail:
they use bottom tabs below 1024px and a left sidebar above that breakpoint. At 1280px,
Home, A–Z, Guide, entry details, and Threads arrange supporting content beside the
main content. Informational pages and forms keep narrower reading widths.

Navigation policy lives in `src/lib/navigation-layout.ts`, with shared sizes in
`src/theme/index.ts`. `AppFrame` keeps the navigator mounted
during resizing, while `PageColumns` provides the shared stacked/two-column layout.

With the web development server running, verify both navigation and page layouts:

```powershell
$env:APP_URL='http://localhost:8214' # match your development server
node scripts/desktop-smoke.mjs
node scripts/desktop-pages-smoke.mjs
node --experimental-strip-types scripts/navigation-layout-check.mjs
```

The page checks use local forum fixtures (including empty/offline states) and never submit forms. Screenshots
are written to the ignored `scripts/ui-shots/desktop` folder.

Saved entries require an account. Signed-out Home shows the same account invitation
as Threads; the detail bookmark opens sign-in without changing favorites.

## Project structure

```
src/
  app/                      # Expo Router routes (file-based)
    _layout.tsx             # root: fonts, auth/data providers, hydration gate, Stack
    index.tsx               # welcome + portal picker (parent vs provider)
    notices.tsx             # disclaimers
    (tabs)/                 # Home, Guide, Threads, About; bottom tabs or desktop sidebar
    substance/[id].tsx      # substance detail (modal route)
  components/               # EvidenceDots, SubstanceCard, SafetyTags, Chip, TopBar, InfoBadge…
  context/PortalContext.tsx # portal + disclaimer state, persisted via AsyncStorage
  data/                     # ported clinical data (verbatim) + types + repository
    repository.ts           # ← the single data-access seam (swap for an API in Phase 3)
  lib/                      # format helpers + recommend logic (pure, testable)
  theme/                    # color tokens (dark-mode-ready), spacing, typography
```

### Key design seams (for future expansion)

- **`src/data/repository.ts`** — every screen reads substances through this module, never the
  raw arrays. Moving to a backend/API later is a change here only.
- **`src/theme/colors.ts`** — all colors are tokens (`ThemeColors`), with `lightColors` and
  `darkColors`. Components read the active set via `useTheme()` and build styles with
  `useThemedStyles(makeStyles)`; the System/Light/Dark toggle lives in the About tab.
- **`src/app/(tabs)`** — gated behind portal + disclaimer; an auth-gated member area can slot
  alongside.

## Native releases (separate from the website launch)

iOS is built and signed **in the cloud** via EAS — no Mac needed.

```bash
npm i -g eas-cli
eas login                      # your Expo account (free)
eas init                       # links the project (writes projectId)
eas update:configure           # set up the OTA update channel (Phase 2 use)

eas build -p android --profile preview   # internal APK to smoke-test
eas build -p ios --profile preview       # needs an Apple Developer account ($99/yr)

eas build -p android --profile production
eas build -p ios --profile production
eas submit -p android          # Google Play ($25 one-time)
eas submit -p ios              # App Store
```

Build profiles live in [`eas.json`](eas.json). Bundle IDs are set in
[`app.json`](app.json) (`com.dyadhealthcollective.galactoguide`).

### OTA content updates (EAS Update)

The app ships with the **prompt-to-reload** OTA flow already wired
([`UpdateBanner`](src/components/UpdateBanner.tsx) + [`useAppUpdates`](src/lib/useAppUpdates.ts)).
On launch it checks the EAS Update server in the background; when a newer JS/content bundle is
downloaded, a "A new version is ready — Reload" banner appears. This pushes content fixes (new
substances, corrections) to users **without a store re-review**.

One-time setup (fills in `updates.url` + `projectId` in [`app.json`](app.json)):

```bash
eas update:configure
```

Publish an update to a channel (matches the build's channel in [`eas.json`](eas.json)):

```bash
eas update --channel preview    --message "Fix Domperidone dosing note"
eas update --channel production --message "Add new galactogogue"
```

Notes:
- `runtimeVersion` uses the **`appVersion`** policy — an OTA update only reaches builds with the
  same `version` in `app.json`. **Bump `version` and make a new native build** whenever you change
  native code or add a native module (otherwise the new JS can target an incompatible binary).
- OTA can't ship native changes — only JS, assets, and the bundled clinical data.
- Updates are a no-op in Expo Go / on web / before `eas update:configure` runs (guarded by
  `Updates.isEnabled`), so local dev is unaffected.

### Push notifications

The **client** is wired ([`notifications.ts`](src/lib/notifications.ts) +
[`NotificationsContext`](src/context/NotificationsContext.tsx)): a foreground handler, the Android
channel, an opt-in toggle in the About tab ("Content update alerts"), Expo push-token retrieval,
and tap-routing (a notification carrying `{ substanceId, kind }` opens that substance's detail).

What's left is **credentials + a sender**, which need your accounts and a real device (push does
nothing on web/simulator):

```bash
eas credentials                # set up FCM (Android) + APNs (iOS) creds via EAS
```

To test end-to-end: build to a physical device, flip the About toggle to grant permission, then
paste the device's Expo push token into the **Expo push tool** (expo.dev/notifications) — or send
via the Expo Push API. The token is fetched on opt-in; a Phase 3 backend would store and target it.

> Follow-up: a dedicated monochrome **notification icon** (96×96, white on transparent) for the
> `expo-notifications` plugin in [`app.json`](app.json) — currently only the accent `color` is set,
> so Android falls back to the app icon. Same bucket as the square-app-icon follow-up.

### Web deploy

The production website targets Vercel at `https://galactoguide.vercel.app`.
See [website launch configuration](docs/website-launch.md) for build settings,
Supabase callback URLs, legal pages, preview checks, and release boundaries.

```bash
npm run build:web             # outputs to dist/ at the website root
# Vercel reads vercel.json; publishing is a separate approved step.
```

## Status & roadmap

The prepared website includes evidence/source browsing, Guide, Trusted Essentials,
saved entries, account preference sync, discussions/replies/helpful votes, comment
reporting, password recovery, and privacy/terms pages. Example forum content has
been removed from both the prepared client and the live database.

Saved entries and preferences use separate local caches for each account. Guest
situation choices stay separate. Old favorites/situation caches without an owner
are not imported into an account; existing account data reloads from Supabase.

Local checks cover the documented release changes. Publication still requires
hosting access, verified email delivery, preview review, and approval. See the
[launch configuration](docs/website-launch.md) and
[migration plan](plans/production-migration.md) for current status.

## Notes / follow-ups

### Release notes

Customer-facing release notes live in `src/data/release-notes.ts`, newest first.
About shows only the first entry; `/release-notes` shows the full history.
When shipping a release, add a short summary of useful changes. Mention wording
improvements briefly and group layout polish or maintenance as “Small updates and
bug fixes.” Add only shipped changes, and keep older entries for the history.

- App icon currently uses the Expo placeholder. Provide a square (1024×1024) icon to replace
  `assets/images/icon.png` and the iOS `assets/expo.icon`.
- A **privacy policy** URL is required by both stores (health app) before submission.
- Feedback posts to the existing Formspree endpoint (`formspree.io/f/xlgokjgl`).
- Comment reports use that same inbox, with the comment, author, thread IDs/title,
  and optional reason. Users confirm before sending; failures keep the reason for
  retry. Reporting does not remove the comment. Formspree's existing recipient
  remains in effect (the doctor's feedback inbox); `adam@dyadhealthcollective.com`
  is shown as a fallback contact if submission fails. To route reports separately,
  set `EXPO_PUBLIC_FORUM_REPORT_ENDPOINT` to a Formspree form with the desired
  verified recipient and rebuild. Check reports locally with
  `node scripts/forum-report-check.mjs`
  (requires `react-test-renderer@19.2.3` at that path). These checks mock delivery;
  they do not send email.
- Content/data lives in `src/data/galactogogues.ts` and `galactofuges.ts` — edit there to
  update substances (and `sources.ts` for references).
