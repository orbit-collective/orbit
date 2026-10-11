import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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
