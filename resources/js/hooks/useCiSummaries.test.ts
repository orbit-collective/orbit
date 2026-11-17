import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildCi } from '@/tests/development';
import { CI_POLL_MS, useCiSummaries } from './useCiSummaries';

vi.mock('axios');

const answer = (shas: string[]) => ({
    data: { checks: Object.fromEntries(shas.map((sha) => [sha, buildCi()])) },
});

beforeEach(() => {
    vi.mocked(axios.get)
        .mockReset()
        .mockImplementation((async (
            _url: string,
            config: { params: { refs: string[] } },
        ) => answer(config.params.refs)) as never);
});

describe('useCiSummaries', () => {
    test('asks for the shas in one call and marks them pending until they arrive', async () => {
        const { result } = renderHook(() =>
            useCiSummaries('/ci', 1, ['b', 'a']),
        );

        expect(result.current.pending.size).toBe(2);
        await waitFor(() => expect(result.current.pending.size).toBe(0));

        expect(Object.keys(result.current.summaries).sort()).toEqual([
            'a',
            'b',
        ]);
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
            '/ci',
            expect.objectContaining({
                params: { repository_id: 1, refs: ['a', 'b'] },
            }),
        );
    });

    test('splits more than twenty into batches', async () => {
        const shas = Array.from(
            { length: 45 },
            (_, i) => `sha${String(i).padStart(2, '0')}`,
        );
        const { result } = renderHook(() => useCiSummaries('/ci', 1, shas));

        await waitFor(() =>
            expect(Object.keys(result.current.summaries)).toHaveLength(45),
        );
        expect(axios.get).toHaveBeenCalledTimes(3);
    });

    test('asks only for what it does not know yet', async () => {
        const { result, rerender } = renderHook(
            ({ shas }: { shas: string[] }) => useCiSummaries('/ci', 1, shas),
            {
                initialProps: { shas: ['a'] },
            },
        );
        await waitFor(() => expect(result.current.pending.size).toBe(0));

        rerender({ shas: ['a', 'b'] });

        await waitFor(() => expect(result.current.summaries.b).toBeDefined());
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(vi.mocked(axios.get).mock.calls[1][1]).toEqual(
            expect.objectContaining({
                params: { repository_id: 1, refs: ['b'] },
            }),
        );
    });

    test('starts from nothing for another repository', async () => {
        const { result, rerender } = renderHook(
            ({ id }: { id: number }) => useCiSummaries('/ci', id, ['a']),
            {
                initialProps: { id: 1 },
            },
        );
        await waitFor(() => expect(result.current.summaries.a).toBeDefined());

        rerender({ id: 2 });

        expect(result.current.summaries).toEqual({});
        await waitFor(() => expect(result.current.summaries.a).toBeDefined());
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('a failed batch makes its shas unknown (null), not pending forever', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('x'));
        const { result } = renderHook(() => useCiSummaries('/ci', 1, ['a']));

        await waitFor(() => expect(result.current.summaries.a).toBeNull());
        expect(result.current.pending.size).toBe(0);
    });

    test('does nothing when disabled or without shas', () => {
        renderHook(() => useCiSummaries('/ci', 1, ['a'], false));
        renderHook(() => useCiSummaries('/ci', 1, []));

        expect(axios.get).not.toHaveBeenCalled();
    });

    test('refresh asks again for what is in view and keeps showing it meanwhile', async () => {
        let call = 0;
        vi.mocked(axios.get).mockImplementation((async () => {
            call += 1;
            if (call === 1) return answer(['a']);
            await new Promise((resolve) => setTimeout(resolve, 20));

            return { data: { checks: { a: buildCi({ state: 'failed' }) } } };
        }) as never);
        const { result } = renderHook(() => useCiSummaries('/ci', 1, ['a']));
        await waitFor(() =>
            expect(result.current.summaries.a?.state).toBe('passed'),
        );

        act(() => result.current.refresh());

        // Still the old answer, not a placeholder, until the new one lands.
        expect(result.current.summaries.a?.state).toBe('passed');
        expect(result.current.pending.size).toBe(0);
        await waitFor(() =>
            expect(result.current.summaries.a?.state).toBe('failed'),
        );
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('a failed refresh keeps the older answer instead of turning it unknown', async () => {
        const { result } = renderHook(() => useCiSummaries('/ci', 1, ['a']));
        await waitFor(() =>
            expect(result.current.summaries.a?.state).toBe('passed'),
        );
        vi.mocked(axios.get).mockRejectedValue(new Error('x'));

        act(() => result.current.refresh());
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(result.current.summaries.a?.state).toBe('passed');
    });

    test('set records a result that arrived another way, like a detail read fresh', async () => {
        const { result } = renderHook(() => useCiSummaries('/ci', 1, ['a']));
        await waitFor(() => expect(result.current.summaries.a).toBeDefined());

        act(() => result.current.set('a', buildCi({ state: 'failed' })));

        expect(result.current.summaries.a?.state).toBe('failed');
    });
});

describe('useCiSummaries, running checks', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.mocked(axios.get).mockReset();
        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('a commit whose checks are running is asked about again until it finishes, and only that one', async () => {
        vi.mocked(axios.get)
            .mockResolvedValueOnce({
                data: {
                    checks: { a: buildCi({ state: 'pending' }), b: buildCi() },
                },
            } as never)
            .mockResolvedValueOnce({
                data: { checks: { a: buildCi({ state: 'passed' }) } },
            } as never);
        const { result } = renderHook(() =>
            useCiSummaries('/ci', 1, ['a', 'b']),
        );
        await vi.waitFor(() =>
            expect(result.current.summaries.a?.state).toBe('pending'),
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(CI_POLL_MS + 10);
        });

        await vi.waitFor(() =>
            expect(result.current.summaries.a?.state).toBe('passed'),
        );
        expect(vi.mocked(axios.get).mock.calls[1][1]).toEqual(
            expect.objectContaining({
                params: { repository_id: 1, refs: ['a'] },
            }),
        );

        // Finished: nothing more is asked.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(CI_POLL_MS * 3);
        });
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('a hidden tab does not ask', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: { checks: { a: buildCi({ state: 'pending' }) } },
        } as never);
        const { result } = renderHook(() => useCiSummaries('/ci', 1, ['a']));
        await vi.waitFor(() =>
            expect(result.current.summaries.a?.state).toBe('pending'),
        );
        Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            configurable: true,
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(CI_POLL_MS * 3);
        });

        expect(axios.get).toHaveBeenCalledTimes(1);
    });
});
