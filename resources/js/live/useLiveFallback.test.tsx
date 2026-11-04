import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LiveStatus } from '@/types/Live';

const mocks = vi.hoisted(() => ({
    pollInterval: 30,
    status: 'off' as LiveStatus,
    requestLiveReload: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: { live: { enabled: false, pollInterval: mocks.pollInterval } },
    }),
}));
vi.mock('./useLiveStatus', () => ({ useLiveStatus: () => mocks.status }));
vi.mock('./reloadQueue', () => ({
    requestLiveReload: mocks.requestLiveReload,
}));

import { POLL_JITTER, useLiveFallback } from './useLiveFallback';

const reloads = () => [{ only: ['issues'] }];
const MAX_WAIT = (seconds: number) => seconds * 1000 * (1 + POLL_JITTER);

describe('useLiveFallback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.pollInterval = 30;
        mocks.status = 'off';
        mocks.requestLiveReload.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('polls on the server interval, with jitter, while there is no socket', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const { unmount } = renderHook(() => useLiveFallback(reloads));

        vi.advanceTimersByTime(29_999);
        expect(mocks.requestLiveReload).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['issues'],
        });
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(30_000);
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(2);

        unmount();
        vi.advanceTimersByTime(MAX_WAIT(300));
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(2);
        vi.restoreAllMocks();
    });

    test('scales the interval for slower-changing data', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        renderHook(() => useLiveFallback(reloads, 2));

        vi.advanceTimersByTime(59_999);
        expect(mocks.requestLiveReload).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(1);
        vi.restoreAllMocks();
    });

    test('does not poll when the server switched polling off', () => {
        mocks.pollInterval = 0;
        renderHook(() => useLiveFallback(reloads));

        vi.advanceTimersByTime(MAX_WAIT(300));

        expect(mocks.requestLiveReload).not.toHaveBeenCalled();
    });

    test('does not poll with a healthy socket or while it connects', () => {
        for (const status of ['live', 'connecting'] as const) {
            mocks.status = status;
            const { unmount } = renderHook(() => useLiveFallback(reloads));

            vi.advanceTimersByTime(MAX_WAIT(300));
            expect(mocks.requestLiveReload).not.toHaveBeenCalled();
            unmount();
        }
    });

    test('polls while the socket is down and stops when it is back', () => {
        mocks.status = 'offline';
        const { rerender } = renderHook(() => useLiveFallback(reloads));

        vi.advanceTimersByTime(MAX_WAIT(30));
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(1);

        mocks.status = 'live';
        rerender();

        // The catch-up reload for what the socket missed, then silence.
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(2);
        vi.advanceTimersByTime(MAX_WAIT(300));
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(2);
    });

    test('a first connection needs no catch-up', () => {
        mocks.status = 'connecting';
        const { rerender } = renderHook(() => useLiveFallback(reloads));

        mocks.status = 'live';
        rerender();

        expect(mocks.requestLiveReload).not.toHaveBeenCalled();
    });

    test('asks the latest builder what to re-read', () => {
        const { rerender } = renderHook(({ build }) => useLiveFallback(build), {
            initialProps: { build: () => [{ only: ['a'] }] },
        });
        rerender({ build: () => [{ only: ['b'] }] });

        vi.advanceTimersByTime(MAX_WAIT(30));

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({ only: ['b'] });
    });
});
