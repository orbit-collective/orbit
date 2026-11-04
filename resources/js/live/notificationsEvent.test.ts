import { describe, expect, test, vi } from 'vitest';
import {
    announceNotificationsChanged,
    NOTIFICATIONS_CHANGED_EVENT,
} from './notificationsEvent';

describe('announceNotificationsChanged', () => {
    test('fires the window event the notification feed listens for', () => {
        const listener = vi.fn();
        window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);

        announceNotificationsChanged();

        expect(listener).toHaveBeenCalledTimes(1);
        window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
    });
});
