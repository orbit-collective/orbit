/**
 * Notifications are not a page: the bell in PageHeader owns a popup, and
 * `GET /notifications` only returns raw JSON, so visiting it breaks Inertia.
 * This tiny event bus lets the command palette ask whichever PageHeader is
 * mounted to open that popup, without prop-drilling. A no-op when none is.
 */
export const OPEN_NOTIFICATIONS_EVENT = 'orbit:open-notifications';

export const requestOpenNotifications = (): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_NOTIFICATIONS_EVENT));
};
