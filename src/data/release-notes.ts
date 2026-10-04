export type ReleaseNote = {
  version: string;
  summary: string;
};

// Newest first. Add one short, customer-facing summary when shipping a release.
// Mention useful features or clearer wording; group visual polish and maintenance
// as small updates and bug fixes. Keep unreleased work out of this list.
// Version history: acb6ce5 introduced 1.1.0; e6f2168 finalized 1.0.0.
export const releaseNotes: readonly [ReleaseNote, ...ReleaseNote[]] = [
  {
    version: '1.1.1',
    summary: 'Report community comments to the GalactoGuide team, with an optional note about your concern.',
  },
  {
    version: '1.1.0',
    summary: 'Added Trusted Essentials to help you explore feeding and pumping supplies. Small updates and bug fixes throughout the app.',
  },
  {
    version: '1.0.0',
    summary: 'Explore milk production information, save entries for later, and find resources and community discussions in one place.',
  },
];
