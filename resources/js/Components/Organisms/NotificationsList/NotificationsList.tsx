import NotificationEmptyState from '@/Components/Molecules/NotificationEmptyState/NotificationEmptyState';
import NotificationItem from '@/Components/Molecules/NotificationItem/NotificationItem';
import { Notification } from '@/types/Notification';
import { Fragment } from 'react';

interface NotificationsListProps {
    notifications: Notification[];
    onMarkAsRead: (id: number) => void;
}

function NotificationsList({
    notifications,
    onMarkAsRead,
}: NotificationsListProps) {
    if (notifications.length === 0) {
        return <NotificationEmptyState />;
    }

    return (
        <div className="no-scrollbar mt-2 max-h-[calc(85vh-200px)] overflow-y-auto sm:max-h-[400px]">
            {notifications.map((item, index) => (
                <Fragment key={item.id}>
                    {index > 0 && (
                        <span className="block h-px w-full bg-[var(--bg-light-color)]" />
                    )}
                    <NotificationItem
                        notification={item}
                        onMarkAsRead={onMarkAsRead}
                    />
                </Fragment>
            ))}
        </div>
    );
}

export default NotificationsList;
