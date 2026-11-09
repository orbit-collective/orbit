import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useNow } from './useNow';

describe('useNow', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 10, 10, 9, 59, 30));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('starts with the current time', () => {
        const { result } = renderHook(() => useNow());

        expect(result.current.getHours()).toBe(9);
    });

    test('moves on every interval, a minute by default', () => {
        const { result } = renderHook(() => useNow());

        act(() => {
            vi.advanceTimersByTime(60_000);
        });

        expect(result.current.getHours()).toBe(10);
    });

    test('takes the interval it is given', () => {
        const { result } = renderHook(() => useNow(1000));

        act(() => {
            vi.advanceTimersByTime(30_000);
        });

        expect(result.current.getHours()).toBe(10);
        expect(result.current.getMinutes()).toBe(0);
    });

    test('stops when it is unmounted', () => {
        const clear = vi.spyOn(globalThis, 'clearInterval');
        const { unmount } = renderHook(() => useNow());

        unmount();

        expect(clear).toHaveBeenCalled();
    });
});
