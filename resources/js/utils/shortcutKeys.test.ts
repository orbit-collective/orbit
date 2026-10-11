import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    bindingsId,
    formatBindingParts,
    normalizeBinding,
    resolveEventKey,
} from './shortcutKeys';

const mockPlatform = (platform: string) =>
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);

afterEach(() => vi.restoreAllMocks());

describe('shortcutKeys', () => {
    test('normalizeBinding resolves mod per platform', () => {
        mockPlatform('MacIntel');
        expect(normalizeBinding('mod+k')).toBe('meta+k');
        mockPlatform('Win32');
        expect(normalizeBinding('mod+k')).toBe('ctrl+k');
    });

    test('normalizeBinding sorts modifiers and keeps plain keys and "+"', () => {
        expect(normalizeBinding('Shift+Alt+Ctrl+P')).toBe('ctrl+alt+shift+p');
        expect(normalizeBinding('G  P')).toBe('g p');
        expect(normalizeBinding('+')).toBe('+');
    });

    test('bindingsId is identical for equivalent bindings', () => {
        expect(bindingsId(['?', '/'])).toBe(bindingsId(['?', '/']));
        expect(bindingsId('alt+shift+x')).toBe(bindingsId('shift+alt+x'));
    });

    test('resolveEventKey uses event.code only for alt combos', () => {
        const alt = new KeyboardEvent('keydown', {
            key: 'π',
            code: 'KeyP',
            altKey: true,
        });
        expect(resolveEventKey(alt)).toBe('p');

        const plain = new KeyboardEvent('keydown', { key: 'P', code: 'KeyP' });
        expect(resolveEventKey(plain)).toBe('p');

        const altOther = new KeyboardEvent('keydown', {
            key: '/',
            code: 'Slash',
            altKey: true,
        });
        expect(resolveEventKey(altOther)).toBe('/');
    });

    test('formatBindingParts renders platform-aware chips', () => {
        mockPlatform('MacIntel');
        expect(formatBindingParts('mod+k')).toEqual(['⌘', 'K']);
        expect(formatBindingParts('alt+p')).toEqual(['⌥', 'P']);
        mockPlatform('Linux x86_64');
        expect(formatBindingParts('mod+k')).toEqual(['CTRL', 'K']);
        expect(formatBindingParts('alt+p')).toEqual(['ALT', 'P']);
        expect(formatBindingParts('?')).toEqual(['?']);
    });
});
