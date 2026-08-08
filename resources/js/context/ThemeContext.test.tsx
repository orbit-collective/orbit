import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
);

const mockMatchMedia = (matchesLight: boolean) => {
    const listeners = new Set<() => void>();
    let matches = matchesLight;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        get matches() {
            return query === '(prefers-color-scheme: light)' && matches;
        },
        media: query,
        addEventListener: (_: string, listener: () => void) =>
            listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
            listeners.delete(listener),
    }));

    return {
        setMatches: (next: boolean) => {
            matches = next;
        },
        trigger: () => listeners.forEach((listener) => listener()),
    };
};

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        mockMatchMedia(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('throws when used outside of a ThemeProvider', () => {
        expect(() => renderHook(() => useTheme())).toThrow(
            'useTheme must be used within a ThemeProvider',
        );
    });

    test('defaults to dark when nothing is stored', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe(
            'dark',
        );
    });

    test('reads a valid stored theme', () => {
        localStorage.setItem('theme', 'light');
        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.theme).toBe('light');
        expect(result.current.resolvedTheme).toBe('light');
    });

    test('falls back to dark when the stored value is invalid', () => {
        localStorage.setItem('theme', 'neon');
        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.theme).toBe('dark');
    });

    test('setTheme updates state, persists to localStorage, and updates the data-theme attribute', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });

        act(() => {
            result.current.setTheme('light');
        });

        expect(result.current.theme).toBe('light');
        expect(result.current.resolvedTheme).toBe('light');
        expect(localStorage.getItem('theme')).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe(
            'light',
        );
    });

    test('resolves "system" using the OS color-scheme preference', () => {
        mockMatchMedia(true);
        localStorage.setItem('theme', 'system');
        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.theme).toBe('system');
        expect(result.current.resolvedTheme).toBe('light');
    });

    test('reacts live to an OS color-scheme change while on "system"', () => {
        const { setMatches, trigger } = mockMatchMedia(false);
        localStorage.setItem('theme', 'system');
        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.resolvedTheme).toBe('dark');

        setMatches(true);
        act(() => trigger());

        expect(result.current.resolvedTheme).toBe('light');
    });
});
