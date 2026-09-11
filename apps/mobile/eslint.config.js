// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'expo-env.d.ts'],
  },
  {
    // Scoped to TypeScript: `eslint-config-expo` only registers the
    // `@typescript-eslint` plugin for .ts/.tsx, so an unscoped rules block
    // makes ESLint fail outright on any .js file in the project — a
    // metro.config.js or app.config.js would take the lint step down with
    // an error about a missing plugin rather than about the real cause.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // An error, not the preset's warning. The battery treats a warning
      // as a pass, so dead imports, styles and strings left behind by a
      // refactor reached review twice before anything complained. An
      // argument deliberately unused is named with a leading underscore.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]);
