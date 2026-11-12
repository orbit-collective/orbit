import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// The loader keeps its state at module level, so every test gets a fresh copy.
async function freshLoader() {
    vi.resetModules();

    return import('./echoLoader');
}

describe('echoLoader when the download fails', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.doMock('pusher-js', () => ({ default: class Pusher {} }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.doUnmock('laravel-echo');
        vi.doUnmock('pusher-js');
    });

    test('reports the failure instead of staying in a silent loading state', async () => {
        vi.doMock('laravel-echo', () => {
            throw new Error('network down');
        });
        const loader = await freshLoader();

        await loader.loadEchoLibraries();

        expect(loader.echoState()).toBe('failed');
    });

    test('tries again after a pause and recovers when the network is back', async () => {
        vi.doMock('laravel-echo', () => {
            throw new Error('network down');
        });
        const loader = await freshLoader();
        await loader.loadEchoLibraries();
        expect(loader.echoState()).toBe('failed');

        vi.doMock('laravel-echo', () => ({ default: class Echo {} }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });

        expect(loader.echoState()).toBe('ready');
        expect(loader.echoLibraries().Echo).toBeDefined();
    });

    test('tries again as soon as the browser comes back online', async () => {
        vi.doMock('laravel-echo', () => {
            throw new Error('network down');
        });
        const loader = await freshLoader();
        await loader.loadEchoLibraries();

        vi.doMock('laravel-echo', () => ({ default: class Echo {} }));
        await act(async () => {
            window.dispatchEvent(new Event('online'));
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(loader.echoState()).toBe('ready');
    });

    test('keeps retrying with a longer pause while it keeps failing', async () => {
        const factory = vi.fn(() => {
            throw new Error('network down');
        });
        vi.doMock('laravel-echo', factory);
        const loader = await freshLoader();
        await loader.loadEchoLibraries();
        expect(factory).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(factory).toHaveBeenCalledTimes(2);

        // The second pause is longer than the first.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(factory).toHaveBeenCalledTimes(2);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(factory).toHaveBeenCalledTimes(3);
        expect(loader.echoState()).toBe('failed');
    });

    test('callers share one download while it is in flight', async () => {
        const factory = vi.fn(() => ({ default: class Echo {} }));
        vi.doMock('laravel-echo', factory);
        const loader = await freshLoader();

        const first = loader.loadEchoLibraries();
        const second = loader.loadEchoLibraries();

        expect(second).toBe(first);
        await first;
        expect(factory).toHaveBeenCalledTimes(1);
    });
});
