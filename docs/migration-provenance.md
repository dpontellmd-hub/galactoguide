# Website replacement provenance

The replacement uses branch `codex/website-replacement` in an
isolated clone of `dpontellmd-hub/galactoguide`. Its parent remains the destination's
existing main commit, preserving the old repository history.

## Legacy version

- Repository: https://github.com/dpontellmd-hub/galactoguide
- Verified main commit: `00c6c3ce16d5d12dec2a7ad5947a55a721649264`
- Published archive tag: [`legacy-website-2026-09-19`](https://github.com/dpontellmd-hub/galactoguide/tree/legacy-website-2026-09-19)
- Published archive branch: `codex/legacy-website-2026-09-19`
  Both remote refs were verified against the legacy SHA before publishing the replacement.
- Local backups: `.tmp/production-migration/legacy-website-2026-09-19.zip`
  and `.tmp/production-migration/legacy-website-2026-09-19.bundle` in the source
  checkout. The bundle includes the complete fetched destination history and refs;
  `git bundle verify` passed. The ZIP contains the exact legacy main source tree.
- Existing production deployment reported by GitHub:
  https://vercel.com/dpontellmd-hubs-projects/galactoguide/DGeBmDm2v6k7gUu1UAzUhkGzM4e7
  (Vercel access and rollback availability still require verification.)

## Replacement source

- Source repository: https://github.com/admolofto/galactoguide
- Source checkout: `C:/Users/adamj/_dev/galactoguide`
- Source base commit: `a27204cd85c7c214236a33515edf613411da6867`
- Includes the reviewed, uncommitted website launch fixes and example-content
  cleanup prepared in that checkout, plus owner-specific account caches and
  preference-sync guards found during the final migration review. The exact copied paths and SHA-256 hashes
  are recorded in ignored local `.tmp/production-migration/source-manifest.json`.
- Machine-specific `.claude/`, `.vscode/`, and local `.env` files are excluded.
  Public Supabase client configuration remains in `app.json`, with documented
  deployment environment overrides. No administrative credentials are included.
- The pre-existing untracked `specs/breastfeeding-log.md` stays in the original
  checkout and is outside this migration. Dependencies, build outputs, database
  backups, and temporary files are also excluded.

## Publication status

The user authorized publishing the replacement to GitHub while arranging Vercel
access. Publication is limited to the replacement branch and a draft PR into
`main`; production cutover is a separate approval. The legacy archive refs are
already on GitHub, and `main` was verified unchanged at the legacy SHA.
Hosting access, preview verification, and email configuration remain launch gates.

The independent review on 2026-09-19 reconfirmed the legacy main SHA with a fresh
fetch and `git ls-remote`. Clean `npm ci` succeeded in the isolated clone using
Node 24.15.0/npm 11.12.1, followed by a production export of 27 routes. The updated
export passed the local recovery/routing suite and both responsive browser suites.
These checks use mocked remote services; hosted-preview verification remains.
The release and rollback sequence is in `docs/migration-release.md`.

The original source checkout remains on its existing branch with all changes
intact. The isolated replacement checkout is
`C:/Users/adamj/_dev/galactoguide/.tmp/production-migration/destination`.
