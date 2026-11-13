import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useLanguage } from './useLanguage';

const i18n = vi.hoisted(() => ({
    locale: 'en',
    setLocale: vi.fn(),
}));

vi.mock('laravel-react-i18n', () => ({
    useLaravelReactI18n: () => ({
        currentLocale: () => i18n.locale,
        setLocale: i18n.setLocale,
    }),
}));

describe('useLanguage', () => {
    beforeEach(() => {
        i18n.locale = 'en';
    });

    test('returns the active locale and the choices with their own names', () => {
        i18n.locale = 'pl';
        const { result } = renderHook(() => useLanguage());

        expect(result.current.locale).toBe('pl');
        expect(result.current.locales).toEqual([
            { code: 'en', name: 'English' },
            { code: 'pl', name: 'Polski' },
        ]);
    });

    test('falls back to English for a locale it does not know', () => {
        i18n.locale = 'de';
        const { result } = renderHook(() => useLanguage());

        expect(result.current.locale).toBe('en');
    });

    test('setLanguage applies the language and remembers it in the browser', () => {
        const { result } = renderHook(() => useLanguage());

        act(() => result.current.setLanguage('pl'));

        expect(i18n.setLocale).toHaveBeenCalledWith('pl');
        expect(localStorage.getItem('locale')).toBe('pl');
    });
});
