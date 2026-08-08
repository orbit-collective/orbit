import Badge from '@/Components/Atoms/Badge/Badge';
import Button from '@/Components/Atoms/Button/Button';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';

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
        <div className="flex flex-col gap-3 border-b border-[var(--border-color)] pb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold tracking-tight text-[var(--text-color)]">
                        Notifications
                    </h1>
                    {unreadCount > 0 && (
                        <Badge
                            color={'closed'}
                            tooltip={true}
                            tooltipText={`You have ${unreadCount} unread notifications`}
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </div>

                {unreadCount > 0 && (
                    <Button
                        type="button"
                        onClick={onMarkAllAsRead}
                        className="bg-transparent text-xs font-medium text-[var(--accent-color)] transition-opacity hover:bg-transparent hover:opacity-80"
                    >
                        Mark all as read
                    </Button>
                )}
            </div>

            <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-[var(--text-gray-color)]">
                    Only show unread
                </span>
                <ToggleSwitch
                    checked={onlyUnread}
                    onChange={onToggleOnlyUnread}
                />
            </div>
        </div>
    );
}

export default NotificationHeader;
