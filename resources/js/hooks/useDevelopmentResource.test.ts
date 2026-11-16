import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    requestErrorMessage,
    useDevelopmentResource,
} from './useDevelopmentResource';

vi.mock('axios');

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((ok, fail) => {
        resolve = ok;
        reject = fail;
    });

    return { promise, resolve, reject };
};

beforeEach(() => {
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.isCancel).mockReturnValue(false);
});

describe('requestErrorMessage', () => {
    test('prefers the first validation message, then the message, then the fallback', () => {
        expect(
            requestErrorMessage(
                {
                    response: {
                        data: {
                            errors: { development: ['GitHub is down'] },
                            message: 'x',
                        },
                    },
                },
                'fallback',
            ),
        ).toBe('GitHub is down');
        expect(
            requestErrorMessage(
                { response: { data: { message: 'Nope' } } },
                'fallback',
            ),
        ).toBe('Nope');
        expect(requestErrorMessage(new Error('boom'), 'fallback')).toBe(
            'fallback',
        );
        expect(requestErrorMessage(undefined, 'fallback')).toBe('fallback');
    });
});

describe('useDevelopmentResource', () => {
    test('loads the resource with its params', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: { branches: [] } });

        const { result } = renderHook(() =>
            useDevelopmentResource<{ branches: string[] }>(
                '/url',
                { repository_id: 1 },
                'failed',
            ),
        );

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data).toEqual({ branches: [] });
        expect(result.current.error).toBeNull();
        expect(axios.get).toHaveBeenCalledWith(
            '/url',
            expect.objectContaining({ params: { repository_id: 1 } }),
        );
    });

    test('does nothing while the params are null and drops what it had', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: 'x' });

        const { result, rerender } = renderHook(
            ({ params }: { params: Record<string, number> | null }) =>
                useDevelopmentResource<string>('/url', params, 'failed'),
            {
                initialProps: {
                    params: { repository_id: 1 } as Record<
                        string,
                        number
                    > | null,
                },
            },
        );
        await waitFor(() => expect(result.current.data).toBe('x'));

        rerender({ params: null });

        await waitFor(() => expect(result.current.data).toBeNull());
        expect(result.current.loading).toBe(false);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('reports a failure with the server message, and reloads on demand', async () => {
        vi.mocked(axios.get)
            .mockRejectedValueOnce({
                response: {
                    data: { errors: { development: ['GitHub is down'] } },
                },
            })
            .mockResolvedValueOnce({ data: 'ok' });

        const { result } = renderHook(() =>
            useDevelopmentResource<string>('/url', { a: 1 }, 'failed'),
        );

        await waitFor(() =>
            expect(result.current.error).toBe('GitHub is down'),
        );
        expect(result.current.data).toBeNull();

        act(() => result.current.reload());

        await waitFor(() => expect(result.current.data).toBe('ok'));
        expect(result.current.error).toBeNull();
    });

    test('uses the fallback when the failure says nothing', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('network'));

        const { result } = renderHook(() =>
            useDevelopmentResource<string>('/url', { a: 1 }, 'Could not load'),
        );

        await waitFor(() =>
            expect(result.current.error).toBe('Could not load'),
        );
    });

    test('keeps showing the data while the same request is reloaded', async () => {
        const again = deferred<{ data: string }>();
        vi.mocked(axios.get)
            .mockResolvedValueOnce({ data: 'first' })
            .mockReturnValueOnce(again.promise as never);

        const { result } = renderHook(() =>
            useDevelopmentResource<string>('/url', { id: 1 }, 'failed'),
        );
        await waitFor(() => expect(result.current.data).toBe('first'));

        act(() => result.current.reload());

        expect(result.current.data).toBe('first');
        expect(result.current.loading).toBe(true);
        await act(async () => {
            again.resolve({ data: 'second' });
            await again.promise;
        });
        await waitFor(() => expect(result.current.data).toBe('second'));
    });

    test('never shows the answer of another request, and ignores a late answer of an aborted one', async () => {
        const first = deferred<{ data: string }>();
        const second = deferred<{ data: string }>();
        vi.mocked(axios.get)
            .mockResolvedValueOnce({ data: 'first' })
            .mockReturnValueOnce(first.promise as never)
            .mockReturnValueOnce(second.promise as never);

        const { result, rerender } = renderHook(
            ({ id }: { id: number }) =>
                useDevelopmentResource<string>('/url', { id }, 'failed'),
            { initialProps: { id: 1 } },
        );
        await waitFor(() => expect(result.current.data).toBe('first'));

        rerender({ id: 2 });
        expect(result.current.data).toBeNull();
        expect(result.current.loading).toBe(true);

        rerender({ id: 3 });
        await act(async () => {
            second.resolve({ data: 'third' });
            await second.promise;
        });
        await waitFor(() => expect(result.current.data).toBe('third'));

        await act(async () => {
            first.resolve({ data: 'stale' });
            await first.promise;
        });
        expect(result.current.data).toBe('third');
    });

    test('a failed reload keeps what was shown next to the error', async () => {
        vi.mocked(axios.get)
            .mockResolvedValueOnce({ data: 'first' })
            .mockRejectedValueOnce({ response: { data: { message: 'Down' } } });

        const { result } = renderHook(() =>
            useDevelopmentResource<string>('/url', { id: 1 }, 'failed'),
        );
        await waitFor(() => expect(result.current.data).toBe('first'));

        act(() => result.current.reload());

        await waitFor(() => expect(result.current.error).toBe('Down'));
        expect(result.current.data).toBe('first');
    });

    test('a cancelled request is not an error', async () => {
        vi.mocked(axios.isCancel).mockReturnValue(true);
        vi.mocked(axios.get).mockRejectedValue(new Error('canceled'));

        const { result } = renderHook(() =>
            useDevelopmentResource<string>('/url', { a: 1 }, 'failed'),
        );

        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(result.current.error).toBeNull();
    });
});
