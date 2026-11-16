import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { buildCi } from '@/tests/development';
import { useCiSummaries } from './useCiSummaries';

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

    test('does nothing when disabled or without shas, and reload asks again', async () => {
        renderHook(() => useCiSummaries('/ci', 1, ['a'], false));
        renderHook(() => useCiSummaries('/ci', 1, []));
        expect(axios.get).not.toHaveBeenCalled();

        const { result } = renderHook(() => useCiSummaries('/ci', 1, ['a']));
        await waitFor(() => expect(result.current.summaries.a).toBeDefined());

        act(() => result.current.reload());

        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    });
});
