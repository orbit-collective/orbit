import { beforeEach, describe, expect, test } from 'vitest';
import {
    DEFAULT_LOCALE,
    getStoredLocale,
    isSupportedLocale,
    storeLocale,
} from './locale';

describe('locale', () => {
    beforeEach(() => {
        localStorage.clear();
        document.cookie = 'locale=; max-age=0; path=/';
    });

    test('defaults to English and ignores an unsupported stored value', () => {
        expect(getStoredLocale()).toBe(DEFAULT_LOCALE);

        localStorage.setItem('locale', 'xx');
        expect(getStoredLocale()).toBe(DEFAULT_LOCALE);
    });

    test('remembers the choice and tells the server through a cookie', () => {
        storeLocale('pl');

        expect(getStoredLocale()).toBe('pl');
        expect(document.cookie).toContain('locale=pl');
    });

    test('recognises supported languages only', () => {
        expect(isSupportedLocale('pl')).toBe(true);
        expect(isSupportedLocale('de')).toBe(false);
    });
});
