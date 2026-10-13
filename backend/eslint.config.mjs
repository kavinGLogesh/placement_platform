import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-useless-escape': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
