import { router, VisitOptions } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Notification,
    NotificationPage,
    NotificationQuery,
} from '@/types/Notification';

/** Matches NotificationRepository::PER_PAGE, the size of the shared first page. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

const DEFAULT_QUERY: NotificationQuery = { onlyUnread: false, type: 'all' };

const queryKey = (query: NotificationQuery): string =>
    `${query.onlyUnread}:${query.type}`;

/** Only the shared props the popup shows change, so only those are re-fetched. */
const MUTATION_OPTIONS: VisitOptions = {
    preserveScroll: true,
    preserveState: true,
    only: ['notifications', 'notificationUnreadCount'],
};

/**
 * The notification inbox behind the popup: the first page comes from the
 * shared Inertia props, everything older (and every filtered view) is pulled
 * page by page from `GET /notifications`. Mutations update the local list
 * straight away and are sent through Inertia; a failure refetches the list so
 * it never keeps showing something the server rejected.
 */
export function useNotificationsFeed(
    initialNotifications: Notification[],
    initialUnreadCount: number,
) {
    const [items, setItems] = useState(initialNotifications);
    const [cursor, setCursor] = useState<number | null>(
        initialNotifications.length >= NOTIFICATIONS_PAGE_SIZE
            ? initialNotifications[initialNotifications.length - 1].id
            : null,
    );
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [query, setQuery] = useState(DEFAULT_QUERY);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Which query the list currently shows, and the latest request's number, so
    // a slow response for a filter the user already left cannot overwrite it.
    const loadedKey = useRef(`${queryKey(DEFAULT_QUERY)}:0`);
    const requestId = useRef(0);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        setUnreadCount(initialUnreadCount);
    }, [initialUnreadCount]);

    const fetchPage = useCallback(
        async (
            target: NotificationQuery,
            before: number | null,
        ): Promise<NotificationPage | null> => {
            const id = ++requestId.current;
            try {
                const { data } = await axios.get<NotificationPage>(
                    '/notifications',
                    {
                        params: {
                            per_page: NOTIFICATIONS_PAGE_SIZE,
                            before: before ?? undefined,
                            unread: target.onlyUnread ? 1 : undefined,
                            type:
                                target.type === 'all' ? undefined : target.type,
                        },
                    },
                );
                return id === requestId.current ? data : null;
            } catch {
                if (id === requestId.current) setHasError(true);
                return null;
            }
        },
        [],
    );

    // (Re)load the first page whenever the filters change or a refresh is asked for.
    useEffect(() => {
        const key = `${queryKey(query)}:${reloadToken}`;
        if (key === loadedKey.current) return;
        loadedKey.current = key;

        setIsLoading(true);
        setHasError(false);
        void fetchPage(query, null).then((page) => {
            if (page) {
                setItems(page.data);
                setCursor(page.next_cursor);
                setUnreadCount(page.unread_count);
            }
            setIsLoading(false);
        });
    }, [query, reloadToken, fetchPage]);

    const loadMore = useCallback(async () => {
        if (cursor === null || isLoading || isLoadingMore) return;

        setIsLoadingMore(true);
        const page = await fetchPage(query, cursor);
        if (page) {
            setItems((current) => {
                const seen = new Set(current.map((item) => item.id));
                return [
                    ...current,
                    ...page.data.filter((item) => !seen.has(item.id)),
                ];
            });
            setCursor(page.next_cursor);
            setUnreadCount(page.unread_count);
        }
        setIsLoadingMore(false);
    }, [cursor, isLoading, isLoadingMore, fetchPage, query]);

    const refresh = useCallback(() => {
        setReloadToken((token) => token + 1);
    }, []);

    const mutationOptions: VisitOptions = {
        ...MUTATION_OPTIONS,
        onError: refresh,
    };

    const markAsRead = (ids: number[]) => {
        const unreadIds = items
            .filter((item) => ids.includes(item.id) && !item.read)
            .map((item) => item.id);
        if (unreadIds.length === 0) return;

        setItems((current) =>
            query.onlyUnread
                ? current.filter((item) => !unreadIds.includes(item.id))
                : current.map((item) =>
                      unreadIds.includes(item.id)
                          ? { ...item, read: true }
                          : item,
                  ),
        );
        setUnreadCount((count) => Math.max(0, count - unreadIds.length));

        router.post(
            '/notifications/bulk-read',
            { ids: unreadIds },
            mutationOptions,
        );
    };

    const markAllAsRead = () => {
        setItems((current) =>
            query.onlyUnread
                ? []
                : current.map((item) => ({ ...item, read: true })),
        );
        setCursor((current) => (query.onlyUnread ? null : current));
        setUnreadCount(0);

        router.post('/notifications/mark-all-read', {}, mutationOptions);
    };

    const remove = (ids: number[]) => {
        const removed = items.filter((item) => ids.includes(item.id));
        if (removed.length === 0) return;

        setItems((current) => current.filter((item) => !ids.includes(item.id)));
        setUnreadCount((count) =>
            Math.max(0, count - removed.filter((item) => !item.read).length),
        );

        if (removed.length === 1) {
            router.delete(`/notifications/${removed[0].id}`, mutationOptions);
            return;
        }

        router.post(
            '/notifications/bulk-delete',
            { ids: removed.map((item) => item.id) },
            mutationOptions,
        );
    };

    const deleteRead = () => {
        setItems((current) => current.filter((item) => !item.read));

        router.delete('/notifications/read', mutationOptions);
    };

    return {
        items,
        unreadCount,
        query,
        setQuery,
        hasMore: cursor !== null,
        isLoading,
        isLoadingMore,
        hasError,
        loadMore,
        refresh,
        markAsRead,
        markAllAsRead,
        remove,
        deleteRead,
    };
}
