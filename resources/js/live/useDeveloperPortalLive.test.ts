import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    useLiveFallback: vi.fn(),
    useLiveChannel: vi.fn(),
    requestLiveReload: vi.fn(),
}));

vi.mock('./useLiveFallback', () => ({
    useLiveFallback: mocks.useLiveFallback,
}));
vi.mock('./useLiveChannel', () => ({ useLiveChannel: mocks.useLiveChannel }));
vi.mock('./reloadQueue', () => ({
    requestLiveReload: mocks.requestLiveReload,
}));

import {
    CONTAINERS_REFRESH_SECONDS,
    ERROR_LOG_REFRESH_SECONDS,
    portalFallbackReloads,
    portalReloads,
    useDeveloperPortalLive,
} from './useDeveloperPortalLive';

beforeEach(() => {
    vi.useFakeTimers();
    Object.values(mocks).forEach((mock) => mock.mockReset());
});

afterEach(() => {
    vi.useRealTimers();
});

describe('portalReloads', () => {
    test('maps each kind to the props it makes stale', () => {
        expect(portalReloads(['users'])).toEqual([
            { only: ['totals', 'portalUsers', 'portalProjects'] },
        ]);
        expect(portalReloads(['errors'])).toEqual([{ only: ['errorLog'] }]);
    });

    test('merges several kinds into one reload without duplicates', () => {
        expect(portalReloads(['projects', 'issues', 'errors'])).toEqual([
            { only: ['totals', 'portalProjects', 'portalUsers', 'errorLog'] },
        ]);
    });

    test('people and projects refresh each other: both carry counts of the other', () => {
        for (const kind of ['users', 'projects'] as const) {
            const only = portalReloads([kind])[0].only!;
            expect(only).toEqual(
                expect.arrayContaining([
                    'portalUsers',
                    'portalProjects',
                    'totals',
                ]),
            );
        }
        expect(portalReloads(['issues'])[0].only).not.toContain('portalUsers');
    });

    test('ignores unknown or empty kinds', () => {
        expect(portalReloads([])).toEqual([]);
        expect(portalReloads(['nope' as never])).toEqual([]);
    });
});

describe('useDeveloperPortalLive', () => {
    test('listens on the developer-portal channel and reloads what changed', () => {
        renderHook(() => useDeveloperPortalLive());

        const [channel, handlers] = mocks.useLiveChannel.mock.calls[0];
        expect(channel).toBe('developer-portal');

        handlers['developer-portal.changed']({ kinds: ['users'] });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['totals', 'portalUsers', 'portalProjects'],
        });
    });

    test('re-reads everything on the fallback timer', () => {
        renderHook(() => useDeveloperPortalLive());

        expect(mocks.useLiveFallback).toHaveBeenCalledWith(
            portalFallbackReloads,
        );
        expect(portalFallbackReloads()[0].only).toEqual(
            expect.arrayContaining(['containers', 'errorLog', 'totals']),
        );
    });

    test('refreshes containers on an interval and stops when unmounted', () => {
        const { unmount } = renderHook(() => useDeveloperPortalLive());

        vi.advanceTimersByTime(CONTAINERS_REFRESH_SECONDS * 1000);
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(1);
        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['containers'],
        });

        unmount();
        vi.advanceTimersByTime(CONTAINERS_REFRESH_SECONDS * 3000);
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(1);
    });

    test('re-reads the log on its own timer even with a healthy socket, so the day chart moves on at midnight', () => {
        const { unmount } = renderHook(() => useDeveloperPortalLive());

        vi.advanceTimersByTime(ERROR_LOG_REFRESH_SECONDS * 1000);

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['errorLog'],
        });
        const calls = mocks.requestLiveReload.mock.calls.length;

        unmount();
        vi.advanceTimersByTime(ERROR_LOG_REFRESH_SECONDS * 3000);
        expect(mocks.requestLiveReload).toHaveBeenCalledTimes(calls);
    });
});
