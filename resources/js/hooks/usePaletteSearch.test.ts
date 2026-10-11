import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SEARCH_DEBOUNCE_MS, usePaletteSearch } from './usePaletteSearch';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string) =>
            `/${name.replace('command-palette.search', 'command-palette/search')}`,
    ),
);

const mockFetch = vi.fn();

const respond = (body: unknown, ok = true) =>
    Promise.resolve({
        ok,
        status: ok ? 200 : 500,
        json: () => Promise.resolve(body),
    });

const settle = async () => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });
};

beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('usePaletteSearch', () => {
    test('is idle and sends nothing without a query', () => {
        const { result } = renderHook(() => usePaletteSearch(null));

        expect(result.current).toEqual({
            status: 'idle',
            issues: [],
            projects: [],
            people: [],
        });
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test('waits for the debounce, then fetches and exposes the results', async () => {
        mockFetch.mockReturnValue(
            respond({ issues: [{ id: 1 }], projects: [{ id: 2 }] }),
        );
        const { result } = renderHook(() => usePaletteSearch('login'));

        expect(result.current.status).toBe('loading');
        await act(async () => {
            await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
        });
        expect(mockFetch).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.current).toEqual({
            status: 'success',
            issues: [{ id: 1 }],
            projects: [{ id: 2 }],
            people: [],
        });
    });

    test('requests the JSON endpoint with an encoded query and JSON headers', async () => {
        mockFetch.mockReturnValue(respond({ issues: [], projects: [] }));
        renderHook(() => usePaletteSearch('#42 & more'));

        await settle();

        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe('/command-palette/search?q=%2342%20%26%20more');
        expect(init.headers).toMatchObject({
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        });
        expect(init.credentials).toBe('same-origin');
    });

    test('typing fast cancels the earlier request before it is even sent', async () => {
        mockFetch.mockReturnValue(respond({ issues: [], projects: [] }));
        const { rerender } = renderHook(({ q }) => usePaletteSearch(q), {
            initialProps: { q: 'lo' as string | null },
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        rerender({ q: 'log' });
        await settle();

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toContain('q=log');
    });

    test('a stale response never overwrites a newer one', async () => {
        let resolveFirst: (value: unknown) => void = () => {};
        mockFetch
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveFirst = resolve;
                    }),
            )
            .mockReturnValueOnce(
                respond({ issues: [{ id: 2 }], projects: [] }),
            );
        const { result, rerender } = renderHook(
            ({ q }) => usePaletteSearch(q),
            {
                initialProps: { q: 'first' as string | null },
            },
        );

        await settle();
        rerender({ q: 'second' });
        await settle();
        expect(result.current.issues).toEqual([{ id: 2 }]);

        await act(async () => {
            resolveFirst({
                ok: true,
                status: 200,
                json: () =>
                    Promise.resolve({ issues: [{ id: 1 }], projects: [] }),
            });
        });

        expect(result.current.issues).toEqual([{ id: 2 }]);
    });

    test('aborts the in-flight request when the query changes or the hook unmounts', async () => {
        const signals: AbortSignal[] = [];
        mockFetch.mockImplementation((_url: string, init: RequestInit) => {
            signals.push(init.signal as AbortSignal);
            return new Promise(() => {});
        });
        const { rerender, unmount } = renderHook(
            ({ q }) => usePaletteSearch(q),
            {
                initialProps: { q: 'first' as string | null },
            },
        );

        await settle();
        rerender({ q: 'second' });
        expect(signals[0].aborted).toBe(true);

        await settle();
        unmount();
        expect(signals[1].aborted).toBe(true);
    });

    test('clears results when the query goes back to null', async () => {
        mockFetch.mockReturnValue(
            respond({ issues: [{ id: 1 }], projects: [] }),
        );
        const { result, rerender } = renderHook(
            ({ q }) => usePaletteSearch(q),
            {
                initialProps: { q: 'login' as string | null },
            },
        );
        await settle();
        expect(result.current.issues).toHaveLength(1);

        rerender({ q: null });

        expect(result.current).toEqual({
            status: 'idle',
            issues: [],
            projects: [],
            people: [],
        });
    });

    test('reports an error for a non-OK response', async () => {
        mockFetch.mockReturnValue(respond({}, false));
        const { result } = renderHook(() => usePaletteSearch('login'));

        await settle();

        expect(result.current).toEqual({
            status: 'error',
            issues: [],
            projects: [],
            people: [],
        });
    });

    test('reports an error when the request rejects', async () => {
        mockFetch.mockRejectedValue(new Error('offline'));
        const { result } = renderHook(() => usePaletteSearch('login'));

        await settle();

        expect(result.current.status).toBe('error');
    });

    test('tolerates a response without issues or projects', async () => {
        mockFetch.mockReturnValue(respond({}));
        const { result } = renderHook(() => usePaletteSearch('login'));

        await settle();

        expect(result.current).toEqual({
            status: 'success',
            issues: [],
            projects: [],
            people: [],
        });
    });

    test('exposes people from an "@" search', async () => {
        mockFetch.mockReturnValue(
            respond({ issues: [], projects: [], people: [{ id: 9 }] }),
        );
        const { result } = renderHook(() => usePaletteSearch('@ann'));

        await settle();

        expect(result.current.people).toEqual([{ id: 9 }]);
    });
});
