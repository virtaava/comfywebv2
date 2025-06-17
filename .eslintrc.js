module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'unused-imports'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-expressions': 'warn'
  },
  ignorePatterns: ['dist/', 'node_modules/', 'backups/'],
  overrides: [
    {
      files: ['scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};
