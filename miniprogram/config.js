function envVersion() {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion || 'develop';
  } catch (error) {
    return 'develop';
  }
}

const domains = {
  develop: 'http://127.0.0.1:8080',
  trial: 'https://your-domain.example.com',
  release: 'https://your-domain.example.com'
};

const currentEnv = envVersion();

module.exports = {
  envVersion: currentEnv,
  baseUrl: domains[currentEnv] || domains.develop,
  requestTimeout: 15000
};
