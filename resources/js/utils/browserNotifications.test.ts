import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    browserNotificationPermission,
    browserNotificationsEnabled,
    browserNotificationsSupported,
    disableBrowserNotifications,
    enableBrowserNotifications,
    showBrowserNotification,
} from './browserNotifications';

const created: Array<{
    title: string;
    options: NotificationOptions;
    onclick: (() => void) | null;
    close: ReturnType<typeof vi.fn>;
}> = [];

function stubNotification(permission: NotificationPermission) {
    class FakeNotification {
        static permission = permission;
        static requestPermission = vi.fn(
            async () => FakeNotification.permission,
        );
        onclick: (() => void) | null = null;
        close = vi.fn();
        constructor(
            public title: string,
            public options: NotificationOptions,
        ) {
            created.push(this);
        }
    }
    vi.stubGlobal('Notification', FakeNotification);
    return FakeNotification;
}

const setHidden = (hidden: boolean) =>
    Object.defineProperty(document, 'hidden', {
        value: hidden,
        configurable: true,
    });

const content = {
    id: 4,
    title: 'Assigned',
    message: 'You were assigned',
    actionUrl: '/issues/4',
};

describe('browserNotifications', () => {
    beforeEach(() => {
        created.length = 0;
        localStorage.clear();
        setHidden(false);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('reports an unsupported browser', async () => {
        vi.stubGlobal('Notification', undefined);
        delete (window as unknown as Record<string, unknown>).Notification;

        expect(browserNotificationsSupported()).toBe(false);
        expect(browserNotificationPermission()).toBe('unsupported');
        expect(await enableBrowserNotifications()).toBe(false);
    });

    test('is enabled only with both the permission and the opt-in', async () => {
        stubNotification('granted');
        expect(browserNotificationsEnabled()).toBe(false);

        expect(await enableBrowserNotifications()).toBe(true);
        expect(browserNotificationsEnabled()).toBe(true);

        disableBrowserNotifications();
        expect(browserNotificationsEnabled()).toBe(false);
    });

    test('asks for permission once and respects a refusal', async () => {
        const fake = stubNotification('default');
        fake.requestPermission.mockImplementation(async () => {
            fake.permission = 'denied';
            return 'denied';
        });

        expect(await enableBrowserNotifications()).toBe(false);
        expect(fake.requestPermission).toHaveBeenCalledTimes(1);
        expect(browserNotificationsEnabled()).toBe(false);
    });

    test('never opts in without a permission', async () => {
        stubNotification('denied');

        expect(await enableBrowserNotifications()).toBe(false);
        expect(localStorage.getItem('orbit.browserNotifications')).toBeNull();
    });

    test('still works when storage is unavailable', async () => {
        stubNotification('granted');
        const blocked = () => {
            throw new Error('blocked');
        };
        vi.stubGlobal('localStorage', {
            getItem: blocked,
            setItem: blocked,
            removeItem: blocked,
        });

        expect(await enableBrowserNotifications()).toBe(true);
        expect(browserNotificationsEnabled()).toBe(false);
        expect(() => disableBrowserNotifications()).not.toThrow();
    });

    test('shows a system notification only for a background tab', async () => {
        stubNotification('granted');
        await enableBrowserNotifications();

        showBrowserNotification(content, vi.fn());
        expect(created).toHaveLength(0);

        setHidden(true);
        showBrowserNotification(content, vi.fn());

        expect(created).toHaveLength(1);
        expect(created[0].title).toBe('Assigned');
        expect(created[0].options).toEqual({
            body: 'You were assigned',
            tag: 'orbit-notification-4',
        });
    });

    test('shows nothing without the opt-in', () => {
        stubNotification('granted');
        setHidden(true);

        showBrowserNotification(content, vi.fn());

        expect(created).toHaveLength(0);
    });

    test('clicking it focuses the tab and opens the link', async () => {
        stubNotification('granted');
        await enableBrowserNotifications();
        setHidden(true);
        const open = vi.fn();
        const focus = vi.spyOn(window, 'focus').mockImplementation(() => {});

        showBrowserNotification(content, open);
        created[0].onclick?.();

        expect(focus).toHaveBeenCalled();
        expect(open).toHaveBeenCalledWith('/issues/4');
        expect(created[0].close).toHaveBeenCalled();
    });

    test('clicking one without a link only focuses the tab', async () => {
        stubNotification('granted');
        await enableBrowserNotifications();
        setHidden(true);
        const open = vi.fn();
        vi.spyOn(window, 'focus').mockImplementation(() => {});

        showBrowserNotification({ ...content, actionUrl: null }, open);
        created[0].onclick?.();

        expect(open).not.toHaveBeenCalled();
    });
});
