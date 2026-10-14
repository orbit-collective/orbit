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
});
