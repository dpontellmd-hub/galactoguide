module.exports = ({ config }) => {
  const appleEnabled = process.env.GALACTOGUIDE_APPLE_SIGN_IN === '1';
  const experiments = { ...config.experiments };
  const extra = {
    ...config.extra,
    appleSignInEnabled: appleEnabled,
  };
  // Local release QA must never inherit the production backend from app.json.
  // The reserved .invalid domain is intercepted by the browser fixture tests.
  if (process.env.GALACTOGUIDE_ISOLATED_QA === '1') {
    if (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Isolated QA requires EXPO_PUBLIC_SUPABASE_* overrides to be unset.');
    }
    extra.supabaseUrl = 'https://release-fixture.invalid';
    extra.supabaseAnonKey = 'public-isolated-fixture';
  }

  // Preparing these entitlements does not authorize EAS capability/profile sync.
  // Only an explicitly isolated native build may opt in; production stays off.
  if (appleEnabled) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl;
    if (process.env.GALACTOGUIDE_NATIVE_BUILD !== '1' ||
        (process.env.GALACTOGUIDE_ISOLATED_QA !== '1' &&
         (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_') ||
          !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url ?? '') ||
          url !== process.env.GALACTOGUIDE_APPLE_ISOLATED_BACKEND ||
          url === 'https://axxuefnkoxfifftjnuxo.supabase.co'))) {
      throw new Error('Apple sign-in requires an explicitly selected isolated native backend.');
    }
    if (process.env.GALACTOGUIDE_ISOLATED_QA !== '1') {
      extra.supabaseUrl = url;
      extra.supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }
  }

  // Production/Vercel and native builds use root paths. The existing Pages
  // workflow explicitly opts into its repository subfolder.
  delete experiments.baseUrl;
  const webBasePath = process.env.GALACTOGUIDE_WEB_BASE_PATH?.replace(/\/+$/, '');
  if (process.env.GALACTOGUIDE_NATIVE_BUILD !== '1' && webBasePath) {
    if (!/^\/[a-zA-Z0-9/_-]+$/.test(webBasePath)) {
      throw new Error('GALACTOGUIDE_WEB_BASE_PATH must be an absolute URL path.');
    }
    experiments.baseUrl = webBasePath;
  }

  return {
    ...config,
    experiments,
    extra,
    ...(appleEnabled ? {
      ios: { ...config.ios, usesAppleSignIn: true },
      plugins: [...(config.plugins ?? []).filter(p => (Array.isArray(p) ? p[0] : p) !== 'expo-apple-authentication'), 'expo-apple-authentication'],
    } : {}),
  };
};
