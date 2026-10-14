import { Fragment, useEffect, useRef } from 'react';
import NotificationEmptyState from '@/Components/Molecules/NotificationEmptyState/NotificationEmptyState';
import NotificationItem from '@/Components/Molecules/NotificationItem/NotificationItem';
import { Notification } from '@/types/Notification';

interface NotificationsListProps {
    notifications: Notification[];
    onMarkAsRead: (id: number) => void;
    onRemove: (id: number) => void;
    /** A filter is on, so an empty list reads "no matches". */
    isFiltered?: boolean;
    /** The first page of a (re)filtered view is on its way. */
    isLoading?: boolean;
    hasError?: boolean;
    onRetry?: () => void;
    /** Infinite scroll: more pages exist and the sentinel asks for them. */
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    selectable?: boolean;
    selectedIds?: ReadonlySet<number>;
    onToggleSelect?: (id: number) => void;
}

function NotificationsList({
    notifications,
    onMarkAsRead,
    onRemove,
    isFiltered = false,
    isLoading = false,
    hasError = false,
    onRetry,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    selectable = false,
    selectedIds,
    onToggleSelect,
}: NotificationsListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Ask for the next page as soon as the end of the list scrolls into view.
    // Environments without IntersectionObserver fall back to the button below.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (
            !sentinel ||
            !hasMore ||
            !onLoadMore ||
            typeof IntersectionObserver === 'undefined'
        ) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    onLoadMore();
                }
            },
            { root: containerRef.current, rootMargin: '0px 0px 120px 0px' },
        );
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [hasMore, onLoadMore, notifications.length]);

    if (isLoading) {
        return (
            <p className="py-14 text-center text-xs font-medium text-[var(--text-muted-color)]">
                Loading notifications…
            </p>
        );
    }

    if (notifications.length === 0) {
        return (
            <>
                {hasError && <ErrorRow onRetry={onRetry} />}
                <NotificationEmptyState filtered={isFiltered} />
            </>
        );
    }

    return (
        <div
            ref={containerRef}
            className="no-scrollbar mt-2 max-h-[calc(85vh-260px)] overflow-y-auto sm:max-h-[400px]"
        >
            {notifications.map((item, index) => (
                <Fragment key={item.id}>
                    {index > 0 && (
                        <span className="block h-px w-full bg-[var(--bg-light-color)]" />
                    )}
                    <NotificationItem
                        notification={item}
                        onMarkAsRead={onMarkAsRead}
                        onRemove={onRemove}
                        selectable={selectable}
                        selected={selectedIds?.has(item.id) ?? false}
                        onToggleSelect={onToggleSelect}
                    />
                </Fragment>
            ))}

            {hasError && <ErrorRow onRetry={onRetry} />}

            {hasMore && (
                <div
                    ref={sentinelRef}
                    className="flex justify-center py-3 text-xs text-[var(--text-muted-color)]"
                >
                    {isLoadingMore ? (
                        'Loading more…'
                    ) : (
                        <button
                            type="button"
                            onClick={onLoadMore}
                            className="font-medium hover:text-[var(--text-color)] hover:underline"
                        >
                            Load more
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function ErrorRow({ onRetry }: { onRetry?: () => void }) {
    return (
        <p
            role="alert"
            className="flex items-center justify-center gap-2 py-3 text-xs text-[var(--error-color)]"
        >
            Could not load notifications.
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="font-semibold hover:underline"
                >
                    Retry
                </button>
            )}
        </p>
    );
}

export default NotificationsList;
