const nextConfig = require('eslint-config-next');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['.agents/**', 'public/sw.js', 'coverage/**'],
  },
  ...nextConfig,
  prettierConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'error',
    },
  },
];
