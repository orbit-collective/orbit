import type { VisitHelperOptions } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Notification,
    NotificationPage,
    NotificationQuery,
} from '@/types/Notification';

/** Matches NotificationRepository::PER_PAGE, the size of the shared first page. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** Matches NotificationRepository::MAX_BULK_IDS, the most ids one bulk request takes. */
export const NOTIFICATIONS_BULK_LIMIT = 200;

type FetchResult =
    | { status: 'ok'; page: NotificationPage }
    | { status: 'error' }
    // A newer request (or a write) superseded this one; its answer is dropped.
    | { status: 'stale' };

const DEFAULT_QUERY: NotificationQuery = { onlyUnread: false, type: 'all' };

/**
 * Fold a fresh shared first page into what the feed already shows: the newest
 * rows come from the server, older pages that were loaded on demand stay.
 */
const mergeShared = (
    current: Notification[],
    shared: Notification[],
): Notification[] => {
    // A short shared page is the whole inbox.
    if (shared.length < NOTIFICATIONS_PAGE_SIZE) return shared;

    const floor = shared[shared.length - 1].id;
    return [...shared, ...current.filter((item) => item.id < floor)];
};

const sameRows = (a: Notification[], b: Notification[]): boolean =>
    a.length === b.length &&
    a.every((item, i) => item.id === b[i].id && item.read === b[i].read);

const queryKey = (query: NotificationQuery): string =>
    `${query.onlyUnread}:${query.type}`;

/** Only the shared props the popup shows change, so only those are re-fetched. */
const MUTATION_OPTIONS: VisitHelperOptions = {
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
    initialQuery: NotificationQuery = DEFAULT_QUERY,
) {
    // Opened already filtered (e.g. from the command palette): the shared first
    // page is the wrong list, so the first fetch happens straight away.
    const startsFiltered = queryKey(initialQuery) !== queryKey(DEFAULT_QUERY);
    const [items, setItems] = useState(initialNotifications);
    const [cursor, setCursor] = useState<number | null>(
        initialNotifications.length >= NOTIFICATIONS_PAGE_SIZE
            ? initialNotifications[initialNotifications.length - 1].id
            : null,
    );
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [query, setQuery] = useState(initialQuery);
    const [isLoading, setIsLoading] = useState(startsFiltered);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [pendingWrites, setPendingWrites] = useState(0);

    // Which query the list currently shows, and the latest request's number, so
    // a slow response for a filter the user already left cannot overwrite it.
    const loadedKey = useRef(
        startsFiltered ? '' : `${queryKey(DEFAULT_QUERY)}:0`,
    );
    const requestId = useRef(0);
    const [reloadToken, setReloadToken] = useState(0);
    const needsRefreshAfterWrite = useRef(false);
    const unreadRef = useRef(unreadCount);
    unreadRef.current = unreadCount;
    const isDefaultQuery = queryKey(query) === queryKey(DEFAULT_QUERY);
    // Keyed on content, not identity: a re-render that hands over an equal page
    // must not overwrite what a mutation just changed locally.
    const sharedRows = useRef(initialNotifications);
    sharedRows.current = initialNotifications;
    const sharedSignature = initialNotifications
        .map((item) => `${item.id}:${item.read ? 1 : 0}`)
        .join(',');

    const refresh = useCallback(() => {
        setReloadToken((token) => token + 1);
    }, []);

    // The shared props changed (a write finished, or something outside the
    // popup such as the "mark all as read" command ran): reconcile the rows.
    useEffect(() => {
        const shared = sharedRows.current;
        if (isDefaultQuery) {
            setItems((current) => {
                const merged = mergeShared(current, shared);
                // Same rows: keep the array, so an unchanged page cannot loop.
                return sameRows(current, merged) ? current : merged;
            });
            setCursor((current) =>
                shared.length < NOTIFICATIONS_PAGE_SIZE
                    ? null
                    : (current ?? shared[shared.length - 1].id),
            );
        } else if (initialUnreadCount !== unreadRef.current) {
            // A filtered view cannot be patched from the unfiltered page.
            refresh();
        }
        setUnreadCount(initialUnreadCount);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sharedSignature, initialUnreadCount]);

    const fetchPage = useCallback(
        async (
            target: NotificationQuery,
            before: number | null,
        ): Promise<FetchResult> => {
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
                return id === requestId.current
                    ? { status: 'ok', page: data }
                    : { status: 'stale' };
            } catch {
                if (id !== requestId.current) return { status: 'stale' };
                setHasError(true);
                return { status: 'error' };
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
        void fetchPage(query, null).then((result) => {
            // Only the latest request may touch the list or the loading flag.
            if (result.status === 'stale') return;
            if (result.status === 'ok') {
                setItems(result.page.data);
                setCursor(result.page.next_cursor);
                setUnreadCount(result.page.unread_count);
            }
            setIsLoading(false);
        });
    }, [query, reloadToken, fetchPage]);

    const loadMore = useCallback(async () => {
        if (cursor === null || isLoading || isLoadingMore) return;

        setIsLoadingMore(true);
        const result = await fetchPage(query, cursor);
        if (result.status === 'ok') {
            const { page } = result;
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
        // Stale or not, this request is over; whatever replaced it owns the rest.
        setIsLoadingMore(false);
    }, [cursor, isLoading, isLoadingMore, fetchPage, query]);

    // Deleting or reading the whole loaded page can leave an empty list with
    // older notifications still behind the cursor; fetch them rather than
    // showing an empty state nothing can scroll out of. Held back while a
    // write is in flight so the page is not fetched before the write lands.
    useEffect(() => {
        if (
            items.length === 0 &&
            cursor !== null &&
            pendingWrites === 0 &&
            !isLoading &&
            !isLoadingMore &&
            !hasError
        ) {
            void loadMore();
        }
    }, [
        items.length,
        cursor,
        pendingWrites,
        isLoading,
        isLoadingMore,
        hasError,
        loadMore,
    ]);

    /**
     * Send a mutation. A read still in flight would answer with the state from
     * before this write (rows unread again, the old count), so it is dropped;
     * a dropped first page is refetched once the write has finished.
     */
    const send = (
        method: 'post' | 'delete',
        url: string,
        data: Record<string, number[]> = {},
    ) => {
        if (isLoading || isLoadingMore) {
            requestId.current++;
            setIsLoadingMore(false);
            if (isLoading) needsRefreshAfterWrite.current = true;
        }

        setPendingWrites((count) => count + 1);
        const options: VisitHelperOptions = {
            ...MUTATION_OPTIONS,
            onError: refresh,
            onFinish: () => {
                setPendingWrites((count) => Math.max(0, count - 1));
                if (needsRefreshAfterWrite.current) {
                    needsRefreshAfterWrite.current = false;
                    refresh();
                }
            },
        };

        if (method === 'post') {
            router.post(url, data, options);
        } else {
            router.delete(url, options);
        }
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

        send('post', '/notifications/bulk-read', { ids: unreadIds });
    };

    const markAllAsRead = () => {
        setItems((current) =>
            query.onlyUnread
                ? []
                : current.map((item) => ({ ...item, read: true })),
        );
        setCursor((current) => (query.onlyUnread ? null : current));
        setUnreadCount(0);

        send('post', '/notifications/mark-all-read');
    };

    const remove = (ids: number[]) => {
        const removed = items.filter((item) => ids.includes(item.id));
        if (removed.length === 0) return;

        setItems((current) => current.filter((item) => !ids.includes(item.id)));
        setUnreadCount((count) =>
            Math.max(0, count - removed.filter((item) => !item.read).length),
        );

        if (removed.length === 1) {
            send('delete', `/notifications/${removed[0].id}`);
            return;
        }

        send('post', '/notifications/bulk-delete', {
            ids: removed.map((item) => item.id),
        });
    };

    const deleteRead = () => {
        setItems((current) => current.filter((item) => !item.read));

        send('delete', '/notifications/read');
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
