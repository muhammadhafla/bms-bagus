const nextConfig = require('eslint-config-next');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['test_kas.js', '.agents/**'],
  },
  ...nextConfig,
  prettierConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
