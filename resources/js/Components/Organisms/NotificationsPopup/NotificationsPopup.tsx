import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import NotificationClearRead from '@/Components/Molecules/NotificationClearRead/NotificationClearRead';
import NotificationFilterTabs from '@/Components/Molecules/NotificationFilterTabs/NotificationFilterTabs';
import NotificationHeader from '@/Components/Molecules/NotificationHeader/NotificationHeader';
import NotificationSelectionBar from '@/Components/Molecules/NotificationSelectionBar/NotificationSelectionBar';
import NotificationsList from '@/Components/Organisms/NotificationsList/NotificationsList';
import {
    NOTIFICATIONS_BULK_LIMIT,
    useNotificationsFeed,
} from '@/hooks/useNotificationsFeed';
import { PageProps } from '@/types';
import { NotificationFilter } from '@/types/Notification';
import { DURATION, EASE } from '@/utils/motion';

interface NotificationsPopupProps {
    /** Open on the unread view (the command palette's "Show unread"). */
    initialOnlyUnread?: boolean;
    /** Open already in selection mode. */
    initialSelecting?: boolean;
}

function NotificationsPopup({
    initialOnlyUnread = false,
    initialSelecting = false,
}: NotificationsPopupProps) {
    const { notifications, notificationUnreadCount } =
        usePage<PageProps>().props;
    const feed = useNotificationsFeed(
        notifications,
        notificationUnreadCount ?? 0,
        { onlyUnread: initialOnlyUnread, type: 'all' },
    );
    const { items, query, setQuery } = feed;

    const [isSelecting, setIsSelecting] = useState(initialSelecting);
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
        new Set(),
    );

    // Anything that left the list (deleted, filtered out) cannot stay selected.
    useEffect(() => {
        setSelectedIds((current) => {
            const visible = new Set(items.map((item) => item.id));
            const kept = [...current].filter((id) => visible.has(id));
            return kept.length === current.size ? current : new Set(kept);
        });
    }, [items]);

    // Selecting beyond the bulk limit would make the request fail server-side.
    const selectableCount = Math.min(items.length, NOTIFICATIONS_BULK_LIMIT);

    const stopSelecting = () => {
        setIsSelecting(false);
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.delete(id)) return next;
            // One bulk request takes a bounded number of ids (server limit).
            if (next.size >= NOTIFICATIONS_BULK_LIMIT) return current;
            next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds(
            selectedIds.size === selectableCount
                ? new Set()
                : new Set(
                      items.slice(0, selectableCount).map((item) => item.id),
                  ),
        );
    };

    const handleBulk = (action: (ids: number[]) => void) => {
        action([...selectedIds]);
        setSelectedIds(new Set());
    };

    const handleTypeChange = (type: NotificationFilter) => {
        setQuery({ ...query, type });
    };

    const isFiltered = query.onlyUnread || query.type !== 'all';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
                opacity: 0,
                y: -6,
                scale: 0.98,
                transition: { duration: DURATION.fast },
            }}
            transition={{ duration: DURATION.base, ease: EASE }}
            style={{ transformOrigin: 'top right' }}
            className="fixed top-16 right-2 z-9999 w-[calc(100vw-1rem)] max-w-[420px] rounded-2xl bg-(--bg-dark-color) p-4 text-(--text-color) shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:top-24 sm:right-4 sm:w-[420px] sm:p-5"
        >
            <NotificationHeader
                unreadCount={feed.unreadCount}
                onlyUnread={query.onlyUnread}
                onToggleOnlyUnread={(onlyUnread) =>
                    setQuery({ ...query, onlyUnread })
                }
                onMarkAllAsRead={feed.markAllAsRead}
                isSelecting={isSelecting}
                onToggleSelecting={() =>
                    isSelecting ? stopSelecting() : setIsSelecting(true)
                }
            />

            <div className="mt-4">
                <NotificationFilterTabs
                    activeFilter={query.type}
                    onChange={handleTypeChange}
                />
            </div>

            <AnimatePresence initial={false}>
                {isSelecting && (
                    <NotificationSelectionBar
                        key="selection-bar"
                        selectedCount={selectedIds.size}
                        totalCount={selectableCount}
                        limit={NOTIFICATIONS_BULK_LIMIT}
                        onToggleAll={toggleAll}
                        onMarkAsRead={() => handleBulk(feed.markAsRead)}
                        onDelete={() => handleBulk(feed.remove)}
                        onCancel={stopSelecting}
                    />
                )}
            </AnimatePresence>

            <NotificationsList
                notifications={items}
                onMarkAsRead={(id) => feed.markAsRead([id])}
                onRemove={(id) => feed.remove([id])}
                isFiltered={isFiltered}
                isLoading={feed.isLoading}
                hasError={feed.hasError}
                onRetry={feed.refresh}
                hasMore={feed.hasMore}
                isLoadingMore={feed.isLoadingMore}
                onLoadMore={feed.loadMore}
                selectable={isSelecting}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
            />

            {!isSelecting && items.some((item) => item.read) && (
                <div className="mt-3 flex justify-end border-t border-(--bg-light-color) pt-3">
                    <NotificationClearRead onConfirm={feed.deleteRead} />
                </div>
            )}
        </motion.div>
    );
}

export default NotificationsPopup;
