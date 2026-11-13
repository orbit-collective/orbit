import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';

interface NotificationHeaderProps {
    unreadCount: number;
    onlyUnread: boolean;
    onToggleOnlyUnread: (value: boolean) => void;
    onMarkAllAsRead: () => void;
    /** Selection mode for bulk actions; the toggle is hidden when not wired. */
    isSelecting?: boolean;
    onToggleSelecting?: () => void;
}

function NotificationHeader({
    unreadCount,
    onlyUnread,
    onToggleOnlyUnread,
    onMarkAllAsRead,
    isSelecting = false,
    onToggleSelecting,
}: NotificationHeaderProps) {
    const { t } = useLaravelReactI18n();
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--bg-light-color)">
                    <Icon
                        name="Bell"
                        size={18}
                        className="text-(--text-color)"
                    />
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold tracking-tight text-(--text-color)">
                        {t('notification_header.title')}
                    </h1>
                    {unreadCount > 0 && (
                        <p className="truncate text-xs font-medium text-(--text-gray-color)">
                            {t('notification_header.unread', {
                                count: unreadCount,
                            })}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {onToggleSelecting && (
                    <button
                        type="button"
                        onClick={onToggleSelecting}
                        aria-pressed={isSelecting}
                        aria-label={t('notification_header.select')}
                        title={t('notification_header.select')}
                        className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                            isSelecting
                                ? 'bg-(--text-color) text-(--bg-dark-color)'
                                : 'bg-(--bg-light-color) text-(--text-gray-color) hover:bg-(--bg-light-color-hover) hover:text-(--text-color)',
                        )}
                    >
                        <Icon name="ListChecks" size={16} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    aria-label={t('notification_header.mark_all')}
                    title={t('notification_header.mark_all')}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--bg-light-color) text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color-hover) hover:text-(--text-color) disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Icon name="CheckCheck" size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => onToggleOnlyUnread(!onlyUnread)}
                    aria-pressed={onlyUnread}
                    aria-label={t('notification_header.only_unread')}
                    title={t('notification_header.only_unread')}
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                        onlyUnread
                            ? 'bg-(--text-color) text-(--bg-dark-color)'
                            : 'bg-(--bg-light-color) text-(--text-gray-color) hover:bg-(--bg-light-color-hover) hover:text-(--text-color)',
                    )}
                >
                    <Icon name="ListFilter" size={16} />
                </button>
            </div>
        </div>
    );
}

export default NotificationHeader;
