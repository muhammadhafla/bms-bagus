const nextConfig = require('eslint-config-next');

module.exports = [
  {
    ignores: ['test_kas.js', '.agents/**'],
  },
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];