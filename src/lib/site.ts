/** Public links always point at production, including links shared from previews. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://galactoguide.vercel.app').replace(/\/+$/, '');

/** Expo injects the configured web base path; production is hosted at the root. */
export function webPath(path: string): string {
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}

export function publicUrl(path: string): string {
  return `${SITE_URL}/${path.replace(/^\/+/, '')}`;
}
