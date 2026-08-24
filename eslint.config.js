const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['dist/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
