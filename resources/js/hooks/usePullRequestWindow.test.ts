import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { buildPullRequest } from '@/tests/development';
import { usePullRequestWindow } from './usePullRequestWindow';

vi.mock('axios');

const page = (numbers: number[], hasMore: boolean) => ({
    data: {
        pullRequests: numbers.map((number) =>
            buildPullRequest({ number, id: number }),
        ),
        hasMore,
    },
});

const params = (
    overrides: Partial<{
        since: string;
        limit: number;
        repository_id: number;
    }> = {},
) => ({
    repository_id: 1,
    state: 'all',
    limit: 250,
    ...overrides,
});

beforeEach(() => {
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.isCancel).mockReturnValue(false);
});

describe('usePullRequestWindow', () => {
    test('shows the first page at once and reads the rest behind it until the range is exhausted', async () => {
        let release!: () => void;
        vi.mocked(axios.get)
            .mockResolvedValueOnce(page([1, 2], true) as never)
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    release = () => resolve(page([3], false));
                }) as never,
            );

        const { result } = renderHook(() =>
            usePullRequestWindow(
                '/url',
                params({ since: '2026-08-01' }),
                'failed',
            ),
        );

        expect(result.current.loading).toBe(true);
        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(2),
        );
        expect(result.current.loading).toBe(false);
        expect(result.current.loadingMore).toBe(true);

        await act(async () => release());
        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(3),
        );
        await waitFor(() => expect(result.current.loadingMore).toBe(false));

        expect(result.current.capped).toBe(false);
        expect(axios.get).toHaveBeenNthCalledWith(
            1,
            '/url',
            expect.objectContaining({
                params: {
                    repository_id: 1,
                    state: 'all',
                    since: '2026-08-01',
                    page: 1,
                    per_page: 100,
                },
            }),
        );
        expect(axios.get).toHaveBeenNthCalledWith(
            2,
            '/url',
            expect.objectContaining({
                params: expect.objectContaining({ page: 2 }),
            }),
        );
    });

    test('stops at the limit and says the range holds more', async () => {
        const full = Array.from({ length: 100 }, (_, i) => i + 1);
        vi.mocked(axios.get).mockResolvedValue(page(full, true) as never);

        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params({ limit: 100 }), 'failed'),
        );

        await waitFor(() => expect(result.current.capped).toBe(true));
        expect(result.current.pullRequests).toHaveLength(100);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('cuts the last page to the limit', async () => {
        const full = Array.from({ length: 100 }, (_, i) => i + 1);
        vi.mocked(axios.get)
            .mockResolvedValueOnce(page(full, true) as never)
            .mockResolvedValueOnce(
                page(
                    full.map((n) => n + 100),
                    true,
                ) as never,
            );

        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params({ limit: 150 }), 'failed'),
        );

        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(150),
        );
        expect(result.current.capped).toBe(true);
    });

    test("never shows another request's pull requests and starts again for a new range", async () => {
        let release!: () => void;
        vi.mocked(axios.get)
            .mockResolvedValueOnce(page([1], false) as never)
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    release = () => resolve(page([9], false));
                }) as never,
            );

        const { result, rerender } = renderHook(
            ({ since }: { since: string }) =>
                usePullRequestWindow('/url', params({ since }), 'failed'),
            { initialProps: { since: '2026-08-01' } },
        );
        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(1),
        );

        rerender({ since: '2026-01-01' });

        expect(result.current.pullRequests).toBeNull();
        expect(result.current.loading).toBe(true);
        await act(async () => release());
        await waitFor(() =>
            expect(result.current.pullRequests?.[0].number).toBe(9),
        );
    });

    test('keeps what was read when a later page fails, and reports it', async () => {
        vi.mocked(axios.get)
            .mockResolvedValueOnce(page([1, 2], true) as never)
            .mockRejectedValueOnce({
                response: {
                    data: { errors: { development: ['GitHub is down'] } },
                },
            });

        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params(), 'failed'),
        );

        await waitFor(() =>
            expect(result.current.error).toBe('GitHub is down'),
        );
        expect(result.current.pullRequests).toHaveLength(2);
    });

    test('a failed first page is an error with nothing to show', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('x'));

        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params(), 'Could not load'),
        );

        await waitFor(() =>
            expect(result.current.error).toBe('Could not load'),
        );
        expect(result.current.pullRequests).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    test('reads nothing without params, and reload reads again keeping the list meanwhile', async () => {
        const { result: idle } = renderHook(() =>
            usePullRequestWindow('/url', null, 'failed'),
        );
        expect(idle.current.pullRequests).toBeNull();
        expect(axios.get).not.toHaveBeenCalled();

        vi.mocked(axios.get).mockResolvedValue(page([1], false) as never);
        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params(), 'failed'),
        );
        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(1),
        );

        act(() => result.current.reload());

        expect(result.current.pullRequests).toHaveLength(1);
        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    });

    test('patch changes one pull request in what is shown right away', async () => {
        vi.mocked(axios.get).mockResolvedValue(page([1, 2], false) as never);
        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params(), 'failed'),
        );
        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(2),
        );

        act(() => result.current.patch(2, { state: 'merged' }));

        expect(result.current.pullRequests?.map((pr) => pr.state)).toEqual([
            'open',
            'merged',
        ]);
        act(() => result.current.patch(999, { state: 'closed' }));
        expect(result.current.pullRequests).toHaveLength(2);
    });

    test('refreshFirstPage reads one page and folds it in: changed ones replaced, new ones first, the rest kept', async () => {
        vi.mocked(axios.get).mockResolvedValueOnce(
            page([1, 2, 3], false) as never,
        );
        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params(), 'failed'),
        );
        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(3),
        );

        vi.mocked(axios.get).mockResolvedValueOnce({
            data: {
                pullRequests: [
                    buildPullRequest({ number: 9, id: 9 }),
                    buildPullRequest({ number: 2, id: 2, title: 'Renamed' }),
                ],
                hasMore: true,
            },
        } as never);
        act(() => result.current.refreshFirstPage());

        await waitFor(() =>
            expect(result.current.pullRequests?.map((pr) => pr.number)).toEqual(
                [9, 2, 1, 3],
            ),
        );
        expect(result.current.pullRequests?.[1].title).toBe('Renamed');
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith(
            '/url',
            expect.objectContaining({
                params: {
                    repository_id: 1,
                    state: 'all',
                    page: 1,
                    per_page: 100,
                },
            }),
        );
    });

    test('refreshFirstPage never grows the list past the limit, and ignores a failure', async () => {
        vi.mocked(axios.get).mockResolvedValueOnce(
            page([1, 2], false) as never,
        );
        const { result } = renderHook(() =>
            usePullRequestWindow('/url', params({ limit: 2 }), 'failed'),
        );
        await waitFor(() =>
            expect(result.current.pullRequests).toHaveLength(2),
        );

        vi.mocked(axios.get).mockResolvedValueOnce(page([9], false) as never);
        act(() => result.current.refreshFirstPage());
        await waitFor(() =>
            expect(result.current.pullRequests?.map((pr) => pr.number)).toEqual(
                [9, 1],
            ),
        );

        vi.mocked(axios.get).mockRejectedValueOnce(new Error('x'));
        act(() => result.current.refreshFirstPage());
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(result.current.pullRequests?.map((pr) => pr.number)).toEqual([
            9, 1,
        ]);
        expect(result.current.error).toBeNull();
    });

    test('refreshFirstPage does nothing without params', () => {
        const { result } = renderHook(() =>
            usePullRequestWindow('/url', null, 'failed'),
        );

        act(() => result.current.refreshFirstPage());

        expect(axios.get).not.toHaveBeenCalled();
    });
});
