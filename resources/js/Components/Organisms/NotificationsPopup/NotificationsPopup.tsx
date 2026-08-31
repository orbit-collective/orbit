import NotificationFilterTabs from '@/Components/Molecules/NotificationFilterTabs/NotificationFilterTabs';
import NotificationHeader from '@/Components/Molecules/NotificationHeader/NotificationHeader';
import NotificationsList from '@/Components/Organisms/NotificationsList/NotificationsList';
import { PageProps } from '@/types';
import { NotificationFilter } from '@/types/Notification';
import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function NotificationsPopup() {
    const { notifications } = usePage<PageProps>().props;
    const [onlyUnread, setOnlyUnread] = useState(false);
    const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

    const { post, transform } = useForm();

    const handleMarkAllAsRead = () => {
        post('/notifications/mark-all-read', { preserveScroll: true });
    };

    const handleMarkAsRead = (id: number) => {
        const notification = notifications.find((item) => item.id === id);
        if (!notification) return;

        transform(() => ({ ...notification, read: true }));

        post(`/notifications/${id}`, { preserveScroll: true });
    };

    const filteredNotifications = notifications
        .filter((item) => !onlyUnread || !item.read)
        .filter((item) => activeFilter === 'all' || item.type === activeFilter);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="fixed right-2 top-16 z-[9999] w-[calc(100vw-1rem)] max-w-[420px] rounded-2xl bg-[var(--bg-dark-color)] p-4 text-[var(--text-color)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:right-4 sm:top-24 sm:w-[420px] sm:p-5">
            <NotificationHeader
                unreadCount={unreadCount}
                onlyUnread={onlyUnread}
                onToggleOnlyUnread={setOnlyUnread}
                onMarkAllAsRead={handleMarkAllAsRead}
            />

            <div className="mt-4">
                <NotificationFilterTabs
                    activeFilter={activeFilter}
                    onChange={setActiveFilter}
                />
            </div>

            <NotificationsList
                notifications={filteredNotifications}
                onMarkAsRead={handleMarkAsRead}
            />
        </div>
    );
}

export default NotificationsPopup;
