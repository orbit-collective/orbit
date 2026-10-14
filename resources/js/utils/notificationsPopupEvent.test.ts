import { describe, expect, test, vi } from 'vitest';
import {
    OPEN_NOTIFICATIONS_EVENT,
    requestOpenNotifications,
} from './notificationsPopupEvent';

describe('requestOpenNotifications', () => {
    test('dispatches the open event on window', () => {
        const listener = vi.fn();
        window.addEventListener(OPEN_NOTIFICATIONS_EVENT, listener);

        requestOpenNotifications();

        expect(listener).toHaveBeenCalledTimes(1);
        window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, listener);
    });

    test('carries the open options in the event detail', () => {
        const listener = vi.fn();
        window.addEventListener(OPEN_NOTIFICATIONS_EVENT, listener);

        requestOpenNotifications({ onlyUnread: true, selecting: true });

        expect(listener.mock.calls[0][0].detail).toEqual({
            onlyUnread: true,
            selecting: true,
        });
        window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, listener);
    });

    test('is a no-op when nothing is listening', () => {
        expect(() => requestOpenNotifications()).not.toThrow();
    });
});
