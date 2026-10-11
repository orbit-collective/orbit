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

    test('is a no-op when nothing is listening', () => {
        expect(() => requestOpenNotifications()).not.toThrow();
    });
});
