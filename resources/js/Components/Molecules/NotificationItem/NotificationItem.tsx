import Icon from '@/Components/Atoms/Icon/Icon';
import { Notification, NotificationTypes } from '@/types/Notification';
import { formatShortDate } from '@/utils/time';

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: number) => void;
}

const DOT_COLOR_CLASSES: Record<NotificationTypes, string> = {
    success: 'bg-[var(--success-color)]',
    info: 'bg-[var(--info-color)]',
    warning: 'bg-[var(--warning-color)]',
    error: 'bg-[var(--error-color)]',
};

function NotificationItem({
    notification,
    onMarkAsRead,
}: NotificationItemProps) {
    return (
        <div className="group px-1 py-3">
            <div className="flex items-center gap-2">
                <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-[3px] ${DOT_COLOR_CLASSES[notification.type]}`}
                />
                <h2 className="truncate text-sm text-[var(--text-gray-color)]">
                    {notification.title}
                </h2>
            </div>

            <div className="pl-3.5">
                {notification.message && (
                    <p className="mt-1.5 break-words text-sm font-medium leading-relaxed text-[var(--text-color)]">
                        {notification.message}
                    </p>
                )}

                <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted-color)]">
                    <Icon name="Calendar" size={12} />
                    <span>{formatShortDate(notification.created_at)}</span>
                    <span>&bull;</span>
                    {notification.read ? (
                        <span className="flex items-center gap-1 font-medium text-[var(--success-color)]">
                            <Icon name="CircleCheck" size={12} />
                            Read
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onMarkAsRead(notification.id)}
                            title="Mark as read"
                            className="flex cursor-pointer items-center gap-1 font-medium text-[var(--info-color)] hover:underline"
                        >
                            <Icon name="Clock" size={12} />
                            Unread
                        </button>
                    )}
                </div>

                {notification.action_url && (
                    <div className="mt-2.5">
                        <a
                            href={notification.action_url}
                            className="text-xs font-medium text-[var(--accent-color)] hover:underline"
                        >
                            View details
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotificationItem;
