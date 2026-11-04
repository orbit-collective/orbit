/**
 * Fired on `window` when the signed-in user's inbox changed somewhere else.
 * The popup's feed listens: reloading the shared first page does not touch the
 * older rows it has already loaded, so it re-fetches its own list.
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'orbit:notifications-changed';

export function announceNotificationsChanged(): void {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
