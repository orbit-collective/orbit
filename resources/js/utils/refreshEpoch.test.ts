import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { bumpRefreshEpoch, useRefreshEpoch } from './refreshEpoch';

describe('refreshEpoch', () => {
    test('every subscriber sees the count go up on a refresh', () => {
        const a = renderHook(() => useRefreshEpoch());
        const b = renderHook(() => useRefreshEpoch());
        const start = a.result.current;

        act(() => bumpRefreshEpoch());

        expect(a.result.current).toBe(start + 1);
        expect(b.result.current).toBe(start + 1);

        act(() => bumpRefreshEpoch());
        expect(a.result.current).toBe(start + 2);
    });

    test('an unmounted subscriber stops listening', () => {
        const hook = renderHook(() => useRefreshEpoch());
        const before = hook.result.current;
        hook.unmount();

        act(() => bumpRefreshEpoch());

        expect(hook.result.current).toBe(before);
    });
});
