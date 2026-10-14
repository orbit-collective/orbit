import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Notification } from '@/types/Notification';
import {
    NOTIFICATIONS_PAGE_SIZE,
    useNotificationsFeed,
} from './useNotificationsFeed';

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('axios', () => ({ default: { get: mocks.get } }));
vi.mock('@inertiajs/react', () => ({
    router: { post: mocks.post, delete: mocks.delete },
}));

const make = (id: number, overrides: Partial<Notification> = {}) =>
    ({
        id,
        user_id: 1,
        type: 'info',
        title: `Title ${id}`,
        message: 'Message',
        read: false,
        action_url: '',
        created_at: '2026-04-14T10:00:00.000Z',
        ...overrides,
    }) as Notification;

const fullPage = () =>
    Array.from({ length: NOTIFICATIONS_PAGE_SIZE }, (_, i) => make(100 - i));

describe('useNotificationsFeed', () => {
    beforeEach(() => {
        mocks.get.mockReset();
        mocks.post.mockReset();
        mocks.delete.mockReset();
    });

    test('starts from the shared first page without fetching', () => {
        const { result } = renderHook(() =>
            useNotificationsFeed([make(1), make(2)], 2),
        );

        expect(result.current.items).toHaveLength(2);
        expect(result.current.hasMore).toBe(false);
        expect(result.current.unreadCount).toBe(2);
        expect(mocks.get).not.toHaveBeenCalled();
    });

    test('only offers more when the first page was full', () => {
        const { result } = renderHook(() =>
            useNotificationsFeed(fullPage(), 20),
        );

        expect(result.current.hasMore).toBe(true);
    });

    test('loadMore appends the next page after the cursor and skips duplicates', async () => {
        mocks.get.mockResolvedValue({
            data: {
                data: [make(81), make(80)],
                next_cursor: null,
                unread_count: 20,
            },
        });
        const { result } = renderHook(() =>
            useNotificationsFeed(fullPage(), 20),
        );

        await act(async () => {
            await result.current.loadMore();
        });

        expect(mocks.get).toHaveBeenCalledWith('/notifications', {
            params: {
                per_page: NOTIFICATIONS_PAGE_SIZE,
                before: 81,
                unread: undefined,
                type: undefined,
            },
        });
        expect(result.current.items.map((item) => item.id).slice(-2)).toEqual([
            81, 80,
        ]);
        expect(result.current.items).toHaveLength(21);
        expect(result.current.hasMore).toBe(false);
    });

    test('changing a filter refetches the first page with that filter', async () => {
        mocks.get.mockResolvedValue({
            data: {
                data: [make(7, { type: 'error' })],
                next_cursor: null,
                unread_count: 3,
            },
        });
        const { result } = renderHook(() => useNotificationsFeed([make(1)], 1));

        act(() => result.current.setQuery({ onlyUnread: true, type: 'error' }));

        await waitFor(() => expect(result.current.items[0].id).toBe(7));
        expect(mocks.get).toHaveBeenCalledWith('/notifications', {
            params: {
                per_page: NOTIFICATIONS_PAGE_SIZE,
                before: undefined,
                unread: 1,
                type: 'error',
            },
        });
        expect(result.current.unreadCount).toBe(3);
        expect(result.current.isLoading).toBe(false);
    });

    test('a failed fetch flags the error and keeps the list', async () => {
        mocks.get.mockRejectedValue(new Error('offline'));
        const { result } = renderHook(() => useNotificationsFeed([make(1)], 1));

        act(() => result.current.setQuery({ onlyUnread: true, type: 'all' }));

        await waitFor(() => expect(result.current.hasError).toBe(true));
        expect(result.current.items).toHaveLength(1);
    });

    test('marking as read updates locally and posts only the unread ids', () => {
        const { result } = renderHook(() =>
            useNotificationsFeed([make(1), make(2, { read: true })], 1),
        );

        act(() => result.current.markAsRead([1, 2]));

        expect(result.current.items.every((item) => item.read)).toBe(true);
        expect(result.current.unreadCount).toBe(0);
        expect(mocks.post).toHaveBeenCalledWith(
            '/notifications/bulk-read',
            { ids: [1] },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('marking as read does nothing when everything is already read', () => {
        const { result } = renderHook(() =>
            useNotificationsFeed([make(1, { read: true })], 0),
        );

        act(() => result.current.markAsRead([1]));

        expect(mocks.post).not.toHaveBeenCalled();
    });

    test('marking all as read empties the unread-only view', async () => {
        mocks.get.mockResolvedValue({
            data: { data: [make(1)], next_cursor: null, unread_count: 1 },
        });
        const { result } = renderHook(() => useNotificationsFeed([make(1)], 1));
        act(() => result.current.setQuery({ onlyUnread: true, type: 'all' }));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.markAllAsRead());

        expect(result.current.items).toEqual([]);
        expect(mocks.post).toHaveBeenCalledWith(
            '/notifications/mark-all-read',
            {},
            expect.any(Object),
        );
    });

    test('removing one notification uses the single delete route', () => {
        const { result } = renderHook(() =>
            useNotificationsFeed([make(1), make(2)], 2),
        );

        act(() => result.current.remove([1]));

        expect(result.current.items.map((item) => item.id)).toEqual([2]);
        expect(result.current.unreadCount).toBe(1);
        expect(mocks.delete).toHaveBeenCalledWith(
            '/notifications/1',
            expect.any(Object),
        );
    });

    test('removing several notifications uses the bulk route', () => {
        const { result } = renderHook(() =>
            useNotificationsFeed(
                [make(1), make(2, { read: true }), make(3)],
                2,
            ),
        );

        act(() => result.current.remove([1, 2, 99]));

        expect(result.current.items.map((item) => item.id)).toEqual([3]);
        expect(result.current.unreadCount).toBe(1);
        expect(mocks.post).toHaveBeenCalledWith(
            '/notifications/bulk-delete',
            { ids: [1, 2] },
            expect.any(Object),
        );
    });

    test('deleting read notifications keeps the unread ones', () => {
        const { result } = renderHook(() =>
            useNotificationsFeed([make(1), make(2, { read: true })], 1),
        );

        act(() => result.current.deleteRead());

        expect(result.current.items.map((item) => item.id)).toEqual([1]);
        expect(mocks.delete).toHaveBeenCalledWith(
            '/notifications/read',
            expect.any(Object),
        );
    });

    test('a rejected mutation refetches the list', async () => {
        mocks.get.mockResolvedValue({
            data: { data: [make(1)], next_cursor: null, unread_count: 1 },
        });
        const { result } = renderHook(() => useNotificationsFeed([make(1)], 1));
        act(() => result.current.remove([1]));
        const options = mocks.delete.mock.calls[0][1];

        act(() => options.onError());

        await waitFor(() => expect(result.current.items).toHaveLength(1));
        expect(mocks.get).toHaveBeenCalledTimes(1);
    });

    describe('races and reconciliation', () => {
        const deferred = <T>() => {
            let resolve!: (value: T) => void;
            const promise = new Promise<T>((res) => {
                resolve = res;
            });
            return { promise, resolve };
        };
        const page = (
            ids: number[],
            unread = 1,
            next: number | null = null,
        ) => ({
            data: {
                data: ids.map((id) => make(id)),
                next_cursor: next,
                unread_count: unread,
            },
        });

        test('a superseded filter response neither shows nor clears the loading state', async () => {
            const slow = deferred<ReturnType<typeof page>>();
            const fast = deferred<ReturnType<typeof page>>();
            mocks.get
                .mockReturnValueOnce(slow.promise)
                .mockReturnValueOnce(fast.promise);
            const { result } = renderHook(() =>
                useNotificationsFeed([make(1)], 1),
            );

            act(() =>
                result.current.setQuery({ onlyUnread: true, type: 'all' }),
            );
            act(() =>
                result.current.setQuery({ onlyUnread: true, type: 'error' }),
            );

            await act(async () => slow.resolve(page([50])));
            expect(result.current.isLoading).toBe(true);
            expect(result.current.items.map((i) => i.id)).toEqual([1]);

            await act(async () => fast.resolve(page([70])));
            expect(result.current.isLoading).toBe(false);
            expect(result.current.items.map((i) => i.id)).toEqual([70]);
        });

        test('an emptied list with older pages behind it loads the next page by itself', async () => {
            mocks.delete.mockImplementation((_url, options) =>
                options.onFinish(),
            );
            mocks.get.mockResolvedValue(page([30], 1, null));
            const rows = Array.from(
                { length: NOTIFICATIONS_PAGE_SIZE },
                (_, i) => make(100 - i, { read: true }),
            );
            const { result } = renderHook(() => useNotificationsFeed(rows, 0));

            act(() => result.current.deleteRead());

            await waitFor(() =>
                expect(result.current.items.map((i) => i.id)).toEqual([30]),
            );
            expect(mocks.get).toHaveBeenCalledWith(
                '/notifications',
                expect.objectContaining({
                    params: expect.objectContaining({ before: 81 }),
                }),
            );
        });

        test('does not fetch the next page while the write that emptied the list is in flight', () => {
            const rows = Array.from(
                { length: NOTIFICATIONS_PAGE_SIZE },
                (_, i) => make(100 - i, { read: true }),
            );
            const { result } = renderHook(() => useNotificationsFeed(rows, 0));

            act(() => result.current.deleteRead());

            expect(result.current.items).toEqual([]);
            expect(mocks.get).not.toHaveBeenCalled();
        });

        test('a page still loading when something is marked read is dropped', async () => {
            const more = deferred<ReturnType<typeof page>>();
            mocks.get.mockReturnValueOnce(more.promise);
            const rows = Array.from(
                { length: NOTIFICATIONS_PAGE_SIZE },
                (_, i) => make(100 - i),
            );
            const { result } = renderHook(() => useNotificationsFeed(rows, 20));

            act(() => void result.current.loadMore());
            expect(result.current.isLoadingMore).toBe(true);

            act(() => result.current.markAllAsRead());
            await act(async () => more.resolve(page([50, 49], 22, null)));

            expect(result.current.isLoadingMore).toBe(false);
            expect(result.current.items).toHaveLength(NOTIFICATIONS_PAGE_SIZE);
            expect(result.current.items.every((item) => item.read)).toBe(true);
            expect(result.current.unreadCount).toBe(0);
        });

        test('a first page dropped by a write is refetched once the write finishes', async () => {
            const first = deferred<ReturnType<typeof page>>();
            mocks.get
                .mockReturnValueOnce(first.promise)
                .mockResolvedValueOnce(page([9], 0, null));
            const { result } = renderHook(() =>
                useNotificationsFeed([make(1)], 1),
            );
            act(() =>
                result.current.setQuery({ onlyUnread: true, type: 'all' }),
            );

            act(() => result.current.markAllAsRead());
            await act(async () => first.resolve(page([5])));
            expect(result.current.isLoading).toBe(true);

            act(() => mocks.post.mock.calls.at(-1)?.[2].onFinish());

            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.items.map((i) => i.id)).toEqual([9]);
        });

        test('picks up a refreshed shared page, keeping older pages already loaded', async () => {
            mocks.get.mockResolvedValue(page([79], 20, null));
            const rows = (read: boolean) =>
                Array.from({ length: NOTIFICATIONS_PAGE_SIZE }, (_, i) =>
                    make(100 - i, { read }),
                );
            const { result, rerender } = renderHook(
                ({ shared, unread }) => useNotificationsFeed(shared, unread),
                { initialProps: { shared: rows(false), unread: 20 } },
            );
            await act(async () => {
                await result.current.loadMore();
            });
            expect(result.current.items).toHaveLength(21);

            // e.g. the "Mark all notifications as read" command ran elsewhere.
            rerender({ shared: rows(true), unread: 0 });

            expect(result.current.unreadCount).toBe(0);
            expect(result.current.items).toHaveLength(21);
            expect(result.current.items.slice(0, 20).every((i) => i.read)).toBe(
                true,
            );
            expect(result.current.items[20].id).toBe(79);
        });

        test('a short shared page replaces the list outright', () => {
            const { result, rerender } = renderHook(
                ({ shared }) => useNotificationsFeed(shared, 1),
                { initialProps: { shared: [make(1), make(2)] } },
            );

            rerender({ shared: [make(2)] });

            expect(result.current.items.map((i) => i.id)).toEqual([2]);
            expect(result.current.hasMore).toBe(false);
        });

        test('a filtered view refetches when the unread count changed from outside', async () => {
            mocks.get.mockResolvedValue(page([2], 1, null));
            const { result, rerender } = renderHook(
                ({ unread }) => useNotificationsFeed([make(1)], unread),
                { initialProps: { unread: 1 } },
            );
            act(() =>
                result.current.setQuery({ onlyUnread: true, type: 'all' }),
            );
            await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));

            rerender({ unread: 0 });

            await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
        });
    });
});
