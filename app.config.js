module.exports = ({ config }) => {
  const experiments = { ...config.experiments };
  const extra = {
    ...config.extra,
    appleSignInEnabled: process.env.GALACTOGUIDE_APPLE_SIGN_IN === '1',
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
  };
};
