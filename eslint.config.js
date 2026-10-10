import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
    {
        ignores: [
            'node_modules/**',
            'vendor/**',
            'public/build/**',
            'coverage/**',
        ],
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ...js.configs.recommended,
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ...react.configs.flat.recommended,
    },
    {
        // eslint-plugin-react-hooks v7's presets ('recommended' and
        // 'recommended-latest') both bundle ~13 new React Compiler-style
        // diagnostic rules. Only enable the two rules that existed in v4's
        // 'recommended' config to keep prior behavior.
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: tseslint.configs.recommended.rules,
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        settings: {
            react: {
                // Pinned explicitly: 'detect' calls an eslint-plugin-react code
                // path that relies on context.getFilename(), removed in ESLint 10.
                version: '19.2.8',
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'react-hooks/exhaustive-deps': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            // TypeScript itself already catches undefined references; no-undef
            // false-positives on ambient globals (declare global) and type-only
            // identifiers (e.g. KeyboardEventInit).
            'no-undef': 'off',
        },
    },
];
