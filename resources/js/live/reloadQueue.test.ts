import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reload: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { reload: mocks.reload } }));

import {
    pauseLiveReloads,
    RELOAD_DEBOUNCE_MS,
    RELOAD_MAX_WAIT_MS,
    requestLiveReload,
    resetLiveReloads,
} from './reloadQueue';

describe('reloadQueue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.reload.mockReset();
    });

    afterEach(() => {
        resetLiveReloads();
        vi.useRealTimers();
        Object.defineProperty(document, 'hidden', {
            value: false,
            configurable: true,
        });
    });

    test('runs a reload after the debounce, as a non-blocking visit', () => {
        requestLiveReload({ only: ['issues'] });

        expect(mocks.reload).not.toHaveBeenCalled();
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);

        expect(mocks.reload).toHaveBeenCalledTimes(1);
        expect(mocks.reload).toHaveBeenCalledWith({
            only: ['issues'],
            data: undefined,
            async: true,
        });
    });

    test('a burst of identical requests is one reload', () => {
        for (let i = 0; i < 10; i++) {
            requestLiveReload({ only: ['issues'] });
            vi.advanceTimersByTime(50);
        }
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);

        expect(mocks.reload).toHaveBeenCalledTimes(1);
    });

    test('the order of the props does not make a request different', () => {
        requestLiveReload({ only: ['a', 'b'] });
        requestLiveReload({ only: ['b', 'a'] });
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);

        expect(mocks.reload).toHaveBeenCalledTimes(1);
    });

    test('different requests all run, in one go', () => {
        requestLiveReload({ only: ['issues'] });
        requestLiveReload({ only: ['activityLogs'] });
        requestLiveReload({ only: ['issues'], data: { calendar_from: 'x' } });
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);

        expect(mocks.reload).toHaveBeenCalledTimes(3);
    });

    test('never waits longer than the max wait while changes keep coming', () => {
        const start = Date.now();
        while (Date.now() - start < RELOAD_MAX_WAIT_MS + 500) {
            requestLiveReload({ only: ['issues'] });
            vi.advanceTimersByTime(100);
        }

        expect(mocks.reload).toHaveBeenCalled();
    });

    test('holds reloads back while paused and runs them on release', () => {
        const release = pauseLiveReloads();
        requestLiveReload({ only: ['issues'] });
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS * 4);

        expect(mocks.reload).not.toHaveBeenCalled();

        release();
        release();
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);

        expect(mocks.reload).toHaveBeenCalledTimes(1);
    });

    test('stays paused until every pause is released', () => {
        const first = pauseLiveReloads();
        const second = pauseLiveReloads();
        requestLiveReload({ only: ['issues'] });

        first();
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);
        expect(mocks.reload).not.toHaveBeenCalled();

        second();
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);
        expect(mocks.reload).toHaveBeenCalledTimes(1);
    });

    test('waits while the tab is hidden and reloads when it is shown again', () => {
        Object.defineProperty(document, 'hidden', {
            value: true,
            configurable: true,
        });
        requestLiveReload({ only: ['issues'] });
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS * 4);

        expect(mocks.reload).not.toHaveBeenCalled();

        Object.defineProperty(document, 'hidden', {
            value: false,
            configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(RELOAD_DEBOUNCE_MS);

        expect(mocks.reload).toHaveBeenCalledTimes(1);
    });
});
