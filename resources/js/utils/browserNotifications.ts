const STORAGE_KEY = 'orbit.browserNotifications';

export const browserNotificationsSupported = (): boolean =>
    typeof window !== 'undefined' && 'Notification' in window;

export const browserNotificationPermission = ():
    | NotificationPermission
    | 'unsupported' =>
    browserNotificationsSupported() ? Notification.permission : 'unsupported';

/** The user opted in on this browser and the browser still allows it. */
export function browserNotificationsEnabled(): boolean {
    if (browserNotificationPermission() !== 'granted') return false;

    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

/** Ask the browser for permission (must run from a click) and remember the opt-in. */
export async function enableBrowserNotifications(): Promise<boolean> {
    if (!browserNotificationsSupported()) return false;

    const permission =
        Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;

    if (permission !== 'granted') return false;

    try {
        localStorage.setItem(STORAGE_KEY, '1');
    } catch {
        // Without storage the opt-in cannot be remembered; the permission stands.
    }

    return true;
}

export function disableBrowserNotifications(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing stored, nothing to remove.
    }
}

interface BrowserNotificationContent {
    id: number;
    title: string;
    message: string;
    actionUrl: string | null;
}

/**
 * Show a system notification, but only when the tab is in the background: a
 * visible tab already shows the new notification in the app. Clicking it
 * focuses the tab and opens the notification's link.
 */
export function showBrowserNotification(
    { id, title, message, actionUrl }: BrowserNotificationContent,
    open: (url: string) => void,
): void {
    if (!browserNotificationsEnabled() || !document.hidden) return;

    const notification = new Notification(title, {
        body: message,
        tag: `orbit-notification-${id}`,
    });

    notification.onclick = () => {
        window.focus();
        if (actionUrl) open(actionUrl);
        notification.close();
    };
}
