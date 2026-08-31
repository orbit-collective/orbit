import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';

interface NotificationHeaderProps {
    unreadCount: number;
    onlyUnread: boolean;
    onToggleOnlyUnread: (value: boolean) => void;
    onMarkAllAsRead: () => void;
}

function NotificationHeader({
    unreadCount,
    onlyUnread,
    onToggleOnlyUnread,
    onMarkAllAsRead,
}: NotificationHeaderProps) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-light-color)]">
                    <Icon
                        name="Bell"
                        size={18}
                        className="text-[var(--text-color)]"
                    />
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold tracking-tight text-[var(--text-color)]">
                        Notifications
                    </h1>
                    {unreadCount > 0 && (
                        <p className="truncate text-xs font-medium text-[var(--text-gray-color)]">
                            {unreadCount} unread
                        </p>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    aria-label="Mark all as read"
                    title="Mark all as read"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-light-color)] text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Icon name="CheckCheck" size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => onToggleOnlyUnread(!onlyUnread)}
                    aria-pressed={onlyUnread}
                    aria-label="Only show unread"
                    title="Only show unread"
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                        onlyUnread
                            ? 'bg-[var(--text-color)] text-[var(--bg-dark-color)]'
                            : 'bg-[var(--bg-light-color)] text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)]',
                    )}
                >
                    <Icon name="ListFilter" size={16} />
                </button>
            </div>
        </div>
    );
}

export default NotificationHeader;
