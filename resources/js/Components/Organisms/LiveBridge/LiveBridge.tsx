import { router, usePage } from '@inertiajs/react';
import { announceNotificationsChanged } from '@/live/notificationsEvent';
import { requestLiveReload } from '@/live/reloadQueue';
import { useLiveChannel } from '@/live/useLiveChannel';
import {
    AccessChangedPayload,
    NotificationsChangedPayload,
} from '@/types/Live';
import { showBrowserNotification } from '@/utils/browserNotifications';

/**
 * Mounted once for the whole app. Listens on the signed-in user's private
 * channel: a new, read or deleted notification refreshes the bell and popup
 * (and raises a system notification while the tab is in the background), and
 * a change to the user's membership or role re-reads the page so abilities
 * and the project list are never stale. Renders nothing.
 */
export default function LiveBridge() {
    const userId = usePage().props.auth?.user?.id;

    useLiveChannel<{
        'notifications.changed': NotificationsChangedPayload;
        'access.changed': AccessChangedPayload;
    }>(userId ? `user.${userId}` : null, {
        'notifications.changed': ({ created }) => {
            requestLiveReload({
                only: ['notifications', 'notificationUnreadCount'],
            });
            announceNotificationsChanged();

            if (created) {
                showBrowserNotification(
                    {
                        id: created.id,
                        title: created.title,
                        message: created.message,
                        actionUrl: created.action_url,
                    },
                    (url) => router.visit(url),
                );
            }
        },
        'access.changed': () => requestLiveReload({}),
    });

    return null;
}
