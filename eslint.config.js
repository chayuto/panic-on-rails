import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
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
    {
        // Node-side files: e2e tests/helpers and root config files.
        // e2e also keeps browser globals for page.evaluate() callbacks.
        files: ['e2e/**/*.ts', '*.config.ts'],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser },
        },
        rules: {
            // React rules don't apply outside the app (Playwright's fixture
            // `use()` callback is not a React hook).
            'react-refresh/only-export-components': 'off',
            'react-hooks/rules-of-hooks': 'off',
            // Specs read JSON-cloned store snapshots across the browser
            // boundary; `any` is tolerated in tests, still banned in src/.
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
)
