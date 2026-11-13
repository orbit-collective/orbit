import { AnimatePresence, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useRef } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import NotificationEmptyState from '@/Components/Molecules/NotificationEmptyState/NotificationEmptyState';
import NotificationItem from '@/Components/Molecules/NotificationItem/NotificationItem';
import { Notification } from '@/types/Notification';
import { DURATION, EASE, riseIn, rowDelay } from '@/utils/motion';

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
    const { t } = useLaravelReactI18n();
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
            <div
                role="status"
                aria-label={t('notifications_list.loading')}
                className="mt-2 space-y-1"
            >
                {[0, 1, 2, 3].map((index) => (
                    <motion.div
                        key={index}
                        variants={riseIn}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: rowDelay(index) }}
                        className="space-y-2.5 px-1 py-3"
                    >
                        <div className="flex items-center gap-2">
                            <Skeleton index={index} className="h-1.5 w-1.5" />
                            <Skeleton index={index} className="h-3 w-2/5" />
                        </div>
                        <div className="space-y-2 pl-3.5">
                            <Skeleton index={index} className="h-3 w-full" />
                            <Skeleton index={index} className="h-2.5 w-1/3" />
                        </div>
                    </motion.div>
                ))}
                <span className="sr-only">
                    {t('notifications_list.loading_status')}
                </span>
            </div>
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
            <AnimatePresence initial>
                {notifications.map((item, index) => (
                    <motion.div
                        key={item.id}
                        layout="position"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            transition: {
                                duration: DURATION.base,
                                ease: EASE,
                                delay: rowDelay(index),
                            },
                        }}
                        exit={{
                            opacity: 0,
                            x: 28,
                            height: 0,
                            transition: { duration: DURATION.fast },
                        }}
                        className="overflow-hidden"
                    >
                        {index > 0 && (
                            <span className="block h-px w-full bg-(--bg-light-color)" />
                        )}
                        <NotificationItem
                            notification={item}
                            onMarkAsRead={onMarkAsRead}
                            onRemove={onRemove}
                            selectable={selectable}
                            selected={selectedIds?.has(item.id) ?? false}
                            onToggleSelect={onToggleSelect}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>

            {hasError && <ErrorRow onRetry={onRetry} />}

            {hasMore && (
                <div
                    ref={sentinelRef}
                    className="flex justify-center py-3 text-xs text-(--text-muted-color)"
                >
                    {isLoadingMore ? (
                        <span role="status" className="flex items-center gap-2">
                            <Icon
                                name="LoaderCircle"
                                size={13}
                                className="animate-spin"
                            />
                            {t('notifications_list.loading_more')}
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={onLoadMore}
                            className="font-medium hover:text-(--text-color) hover:underline"
                        >
                            {t('notifications_list.load_more')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function ErrorRow({ onRetry }: { onRetry?: () => void }) {
    const { t } = useLaravelReactI18n();

    return (
        <p
            role="alert"
            className="flex items-center justify-center gap-2 py-3 text-xs text-(--error-color)"
        >
            {t('notifications_list.error')}
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="font-semibold hover:underline"
                >
                    {t('notifications_list.retry')}
                </button>
            )}
        </p>
    );
}

export default NotificationsList;
