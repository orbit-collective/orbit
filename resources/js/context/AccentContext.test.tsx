import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { AccentProvider, useAccent } from './AccentContext';
import { ThemeProvider } from './ThemeContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
        <AccentProvider>{children}</AccentProvider>
    </ThemeProvider>
);

describe('AccentContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('style');
    });

    test('throws when used outside of an AccentProvider', () => {
        expect(() => renderHook(() => useAccent())).toThrow(
            'useAccent must be used within an AccentProvider',
        );
    });

    test('defaults to "default" and leaves the accent CSS variables untouched', () => {
        const { result } = renderHook(() => useAccent(), { wrapper });

        expect(result.current.accentColor).toBe('default');
        expect(
            document.documentElement.style.getPropertyValue('--accent-color'),
        ).toBe('');
    });

    test('reads a valid stored accent color', () => {
        localStorage.setItem('accentColor', 'blue');
        const { result } = renderHook(() => useAccent(), { wrapper });

        expect(result.current.accentColor).toBe('blue');
        expect(
            document.documentElement.style.getPropertyValue('--accent-color'),
        ).toBe('#3b82f6');
    });

    test('falls back to "default" when the stored value is invalid', () => {
        localStorage.setItem('accentColor', 'mauve');
        const { result } = renderHook(() => useAccent(), { wrapper });

        expect(result.current.accentColor).toBe('default');
    });

    test('setAccentColor updates state, persists to localStorage, and sets the CSS variables', () => {
        const { result } = renderHook(() => useAccent(), { wrapper });

        act(() => {
            result.current.setAccentColor('pink');
        });

        expect(result.current.accentColor).toBe('pink');
        expect(localStorage.getItem('accentColor')).toBe('pink');
        expect(
            document.documentElement.style.getPropertyValue('--accent-color'),
        ).toBe('#ec4899');
        expect(
            document.documentElement.style.getPropertyValue(
                '--accent-light-color',
            ),
        ).toBe('#f472b6');
        expect(
            document.documentElement.style.getPropertyValue(
                '--accent-color-opacity',
            ),
        ).toContain('rgba(236, 72, 153,');
    });

    test('switching back to "default" removes the CSS variable overrides', () => {
        const { result } = renderHook(() => useAccent(), { wrapper });

        act(() => {
            result.current.setAccentColor('green');
        });
        expect(
            document.documentElement.style.getPropertyValue('--accent-color'),
        ).toBe('#22c55e');

        act(() => {
            result.current.setAccentColor('default');
        });
        expect(
            document.documentElement.style.getPropertyValue('--accent-color'),
        ).toBe('');
    });
});
