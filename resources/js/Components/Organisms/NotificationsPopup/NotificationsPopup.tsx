import NotificationHeader from '@/Components/Molecules/NotificationHeader/NotificationHeader';
import NotificationsList from '@/Components/Organisms/NotificationsList/NotificationsList';
import { PageProps } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function NotificationsPopup() {
    const { notifications } = usePage<PageProps>().props;
    const [onlyUnread, setOnlyUnread] = useState(false);

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

    const filteredNotifications = onlyUnread
        ? notifications.filter((item) => !item.read)
        : notifications;

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="fixed right-2 top-16 z-[9999] w-[calc(100vw-1rem)] max-w-[420px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark-color)] p-4 text-[var(--text-color)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:right-4 sm:top-24 sm:w-[420px] sm:p-5">
            <NotificationHeader
                unreadCount={unreadCount}
                onlyUnread={onlyUnread}
                onToggleOnlyUnread={setOnlyUnread}
                onMarkAllAsRead={handleMarkAllAsRead}
            />
            <NotificationsList
                notifications={filteredNotifications}
                onMarkAsRead={handleMarkAsRead}
            />
        </div>
    );
}

export default NotificationsPopup;
