import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    useLiveFallback: vi.fn(),
    useLiveChannel: vi.fn(),
    requestLiveReload: vi.fn(),
    showBrowserNotification: vi.fn(),
    announce: vi.fn(),
    visit: vi.fn(),
    userId: 7 as number | undefined,
}));

vi.mock('@inertiajs/react', () => ({
    router: { visit: mocks.visit },
    usePage: () => ({
        props: { auth: { user: mocks.userId ? { id: mocks.userId } : null } },
    }),
}));
vi.mock('@/live/useLiveFallback', () => ({
    useLiveFallback: mocks.useLiveFallback,
}));
vi.mock('@/live/useLiveChannel', () => ({
    useLiveChannel: mocks.useLiveChannel,
}));
vi.mock('@/live/notificationsEvent', () => ({
    announceNotificationsChanged: mocks.announce,
}));
vi.mock('@/live/reloadQueue', () => ({
    requestLiveReload: mocks.requestLiveReload,
}));
vi.mock('@/utils/browserNotifications', () => ({
    showBrowserNotification: mocks.showBrowserNotification,
}));

import LiveBridge from './LiveBridge';

const handlers = () => mocks.useLiveChannel.mock.calls.at(-1)![1];

describe('LiveBridge', () => {
    test('without a socket the bell polls at half the page pace', () => {
        render(<LiveBridge />);

        const [reloads, scale] = mocks.useLiveFallback.mock.calls[0];

        expect(reloads()).toEqual([
            { only: ['notifications', 'notificationUnreadCount'] },
        ]);
        expect(scale).toBe(2);
    });

    beforeEach(() => {
        Object.values(mocks).forEach((mock) => {
            if (typeof mock === 'function' && 'mockReset' in mock)
                mock.mockReset();
        });
        mocks.userId = 7;
    });

    test("renders nothing and listens on the signed-in user's channel", () => {
        const { container } = render(<LiveBridge />);

        expect(container).toBeEmptyDOMElement();
        expect(mocks.useLiveChannel.mock.calls[0][0]).toBe('user.7');
    });

    test('listens to nothing for a guest', () => {
        mocks.userId = undefined;
        render(<LiveBridge />);

        expect(mocks.useLiveChannel.mock.calls[0][0]).toBeNull();
    });

    test('a changed inbox refreshes the bell and the popup', () => {
        render(<LiveBridge />);

        handlers()['notifications.changed']({ unread: 2, created: null });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({
            only: ['notifications', 'notificationUnreadCount'],
        });
        expect(mocks.announce).toHaveBeenCalledTimes(1);
        expect(mocks.showBrowserNotification).not.toHaveBeenCalled();
    });

    test('a new notification also raises a system notification that opens its link', () => {
        render(<LiveBridge />);

        handlers()['notifications.changed']({
            unread: 3,
            created: {
                id: 9,
                type: 'info',
                title: 'Assigned',
                message: 'You were assigned',
                action_url: '/issues/9',
            },
        });

        expect(mocks.showBrowserNotification).toHaveBeenCalledWith(
            {
                id: 9,
                title: 'Assigned',
                message: 'You were assigned',
                actionUrl: '/issues/9',
            },
            expect.any(Function),
        );

        mocks.showBrowserNotification.mock.calls[0][1]('/issues/9');
        expect(mocks.visit).toHaveBeenCalledWith('/issues/9');
    });

    test('a change of access re-reads the whole page', () => {
        render(<LiveBridge />);

        handlers()['access.changed']({ project: 3 });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({});
    });
});
