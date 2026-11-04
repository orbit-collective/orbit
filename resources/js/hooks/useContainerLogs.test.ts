import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    LOG_FOLLOW_SECONDS,
    LOG_TAIL,
    useContainerLogs,
} from './useContainerLogs';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

const get = vi.mocked(axios.get);
const reply = (lines: unknown[], error: string | null = null) =>
    get.mockResolvedValue({ data: { found: true, error, lines } });

beforeEach(() => {
    get.mockReset();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useContainerLogs', () => {
    test('fetches nothing while disabled', () => {
        renderHook(() =>
            useContainerLogs('abc', { enabled: false, follow: true }),
        );

        expect(get).not.toHaveBeenCalled();
    });

    test('loads the tail once enabled', async () => {
        reply([{ time: null, stream: 'stdout', text: 'hello' }]);

        const { result } = renderHook(() =>
            useContainerLogs('abc123', { enabled: true, follow: false }),
        );

        await waitFor(() => expect(result.current.loaded).toBe(true));
        expect(get).toHaveBeenCalledWith(
            '/settings/dev-portal/containers/abc123/logs',
            { params: { tail: LOG_TAIL } },
        );
        expect(result.current.lines).toHaveLength(1);
        expect(result.current.error).toBeNull();
    });

    test('surfaces an error from the server', async () => {
        reply([], 'Could not read the logs: boom');

        const { result } = renderHook(() =>
            useContainerLogs('abc', { enabled: true, follow: false }),
        );

        await waitFor(() => expect(result.current.loaded).toBe(true));
        expect(result.current.error).toBe('Could not read the logs: boom');
    });

    test('reports a failed request', async () => {
        get.mockRejectedValue(new Error('network'));

        const { result } = renderHook(() =>
            useContainerLogs('abc', { enabled: true, follow: false }),
        );

        await waitFor(() => expect(result.current.loaded).toBe(true));
        expect(result.current.error).toBe('Could not load the logs.');
    });

    test('refresh re-reads on demand', async () => {
        reply([]);
        const { result } = renderHook(() =>
            useContainerLogs('abc', { enabled: true, follow: false }),
        );
        await waitFor(() => expect(result.current.loaded).toBe(true));

        await act(async () => {
            await result.current.refresh();
        });

        expect(get).toHaveBeenCalledTimes(2);
    });

    test('follows on a timer, only while following', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        reply([]);

        const { rerender, result } = renderHook(
            ({ follow }) => useContainerLogs('abc', { enabled: true, follow }),
            { initialProps: { follow: true } },
        );
        await waitFor(() => expect(result.current.loaded).toBe(true));
        expect(get).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(LOG_FOLLOW_SECONDS * 1000);
        });
        expect(get).toHaveBeenCalledTimes(2);

        rerender({ follow: false });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(LOG_FOLLOW_SECONDS * 3000);
        });
        expect(get).toHaveBeenCalledTimes(2);
    });

    test('does not poll while the tab is hidden', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        reply([]);
        const hidden = vi
            .spyOn(document, 'hidden', 'get')
            .mockReturnValue(true);

        const { result } = renderHook(() =>
            useContainerLogs('abc', { enabled: true, follow: true }),
        );
        await waitFor(() => expect(result.current.loaded).toBe(true));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(LOG_FOLLOW_SECONDS * 2000);
        });

        expect(get).toHaveBeenCalledTimes(1);
        hidden.mockRestore();
    });

    test('does not start a second request while one is running', async () => {
        let resolve!: (value: unknown) => void;
        get.mockReturnValue(new Promise((r) => (resolve = r)) as never);

        const { result } = renderHook(() =>
            useContainerLogs('abc', { enabled: true, follow: false }),
        );
        await act(async () => {
            await result.current.refresh();
        });
        expect(get).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolve({ data: { found: true, error: null, lines: [] } });
        });
    });
});
