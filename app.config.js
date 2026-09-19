module.exports = ({ config }) => {
  const experiments = { ...config.experiments };

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
  };
};
