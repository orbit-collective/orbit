import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useStoredChoice } from './useStoredChoice';

const allowed = ['grid', 'list'] as const;

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('useStoredChoice', () => {
    test('starts from the initial choice when nothing is stored', () => {
        const { result } = renderHook(() =>
            useStoredChoice('k', 'grid', allowed),
        );

        expect(result.current[0]).toBe('grid');
    });

    test('remembers a choice and restores it', () => {
        const first = renderHook(() => useStoredChoice('k', 'grid', allowed));

        act(() => first.result.current[1]('list'));

        expect(first.result.current[0]).toBe('list');
        expect(localStorage.getItem('k')).toBe('list');

        const second = renderHook(() => useStoredChoice('k', 'grid', allowed));

        expect(second.result.current[0]).toBe('list');
    });

    test('ignores a stored value that is not allowed', () => {
        localStorage.setItem('k', 'table');

        const { result } = renderHook(() =>
            useStoredChoice('k', 'grid', allowed),
        );

        expect(result.current[0]).toBe('grid');
    });

    test('still works when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { result } = renderHook(() =>
            useStoredChoice('k', 'grid', allowed),
        );

        expect(result.current[0]).toBe('grid');

        act(() => result.current[1]('list'));

        expect(result.current[0]).toBe('list');
    });
});
