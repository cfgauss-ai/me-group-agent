import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['dist', 'data', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // tests and injected fakes use `any`; `_`-prefixed args are intentional throwaways
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
