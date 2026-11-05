import { act, renderHook } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterEach, describe, expect, test } from 'vitest';
import {
    isReducedMotion,
    setReducedMotion,
    useReducedMotionPreference,
} from './motionPreference';
import { bumpRefreshEpoch, useRefreshEpoch } from './refreshEpoch';

describe('motionPreference', () => {
    afterEach(() => {
        act(() => setReducedMotion(false));
        localStorage.clear();
    });

    test('is off by default', () => {
        expect(isReducedMotion()).toBe(false);
    });

    test('turning it on is remembered and skips every animation', () => {
        const hook = renderHook(() => useReducedMotionPreference());

        act(() => setReducedMotion(true));

        expect(hook.result.current).toBe(true);
        expect(localStorage.getItem('reducedMotion')).toBe('true');
        expect(MotionGlobalConfig.skipAnimations).toBe(true);
    });

    test('turning it off is remembered too', () => {
        act(() => setReducedMotion(true));
        act(() => setReducedMotion(false));

        expect(isReducedMotion()).toBe(false);
        expect(localStorage.getItem('reducedMotion')).toBe('false');
    });

    test('a refresh has nothing to replay while it is on', () => {
        const epoch = renderHook(() => useRefreshEpoch());
        const before = epoch.result.current;

        act(() => setReducedMotion(true));
        act(() => bumpRefreshEpoch());

        expect(epoch.result.current).toBe(before);
    });
});
