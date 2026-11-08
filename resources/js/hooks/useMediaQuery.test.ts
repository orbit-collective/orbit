import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

const stubMedia = (initial: boolean) => {
    let listener: (() => void) | undefined;
    const list = {
        matches: initial,
        addEventListener: vi.fn((_event: string, fn: () => void) => {
            listener = fn;
        }),
        removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(list));

    return {
        list,
        change: (matches: boolean) => {
            list.matches = matches;
            listener?.();
        },
    };
};

describe('useMediaQuery', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('starts with whether the query matches', () => {
        stubMedia(false);

        const { result } = renderHook(() =>
            useMediaQuery('(min-width: 1024px)'),
        );

        expect(result.current).toBe(false);
    });

    test('follows the window as it changes', () => {
        const media = stubMedia(false);
        const { result } = renderHook(() =>
            useMediaQuery('(min-width: 1024px)'),
        );

        act(() => media.change(true));

        expect(result.current).toBe(true);
    });

    test('stops listening when it is unmounted', () => {
        const media = stubMedia(true);
        const { unmount } = renderHook(() =>
            useMediaQuery('(min-width: 1024px)'),
        );

        unmount();

        expect(media.list.removeEventListener).toHaveBeenCalled();
    });

    test('assumes a wide screen when the browser cannot be asked', () => {
        vi.stubGlobal('matchMedia', undefined);

        const { result } = renderHook(() =>
            useMediaQuery('(min-width: 1024px)'),
        );

        expect(result.current).toBe(true);
    });
});
