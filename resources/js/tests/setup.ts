import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterEach, vi } from 'vitest';
import { loadTranslations } from './langFiles';

// Animations jump straight to their end state under test, so assertions never
// race a transition (components that must be tested mid-flight can opt back in).
MotionGlobalConfig.skipAnimations = true;

// jsdom's `window.performance` has no `getEntriesByType` inside the VM
// context that `pool: 'vmThreads'` uses, and some dependencies call it while
// loading. Define the missing piece (never override a real one).
if (typeof window.performance.getEntriesByType !== 'function') {
    Object.defineProperty(window.performance, 'getEntriesByType', {
        value: () => [],
        configurable: true,
    });
}

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});

// Components read their texts through `useLaravelReactI18n()`; the real
// provider loads language files lazily, so tests get a synchronous English
// stand-in fed by the same files (`lang/en/*.php`, read by `langFiles.ts`).
const englishTexts = loadTranslations('en');

const translate = (
    key: string,
    replacements: Record<string, string | number> = {},
): string =>
    Object.entries(replacements).reduce(
        (text, [name, value]) => text.replaceAll(`:${name}`, String(value)),
        englishTexts[key] ?? key,
    );

vi.mock('laravel-react-i18n', () => ({
    LaravelReactI18nProvider: ({ children }: { children: unknown }) => children,
    useLaravelReactI18n: () => ({
        t: translate,
        tChoice: (
            key: string,
            count: number,
            replacements: Record<string, string | number> = {},
        ) => {
            const forms = (englishTexts[key] ?? key).split('|');
            const form = (count === 1 ? forms[0] : forms[forms.length - 1])
                .replace(/^[{[][^}\]]*[}\]]\s*/, '')
                .trim();

            return Object.entries({ ...replacements, count }).reduce(
                (text, [name, value]) =>
                    text.replaceAll(`:${name}`, String(value)),
                form,
            );
        },
        currentLocale: () => 'en',
        getLocales: () => ['en', 'pl'],
        isLocale: () => true,
        setLocale: () => {},
        loading: false,
    }),
}));
