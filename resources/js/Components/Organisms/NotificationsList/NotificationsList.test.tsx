import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Notification } from '@/types/Notification';
import NotificationsList from './NotificationsList';

describe('NotificationsList Component', () => {
    const makeNotification = (
        overrides: Partial<Notification> = {},
    ): Notification => ({
        id: 1,
        user_id: 1,
        type: 'info',
        title: 'Notification title',
        message: 'Notification message',
        read: false,
        action_url: '',
        created_at: '2026-04-14T10:00:00.000Z',
        ...overrides,
    });

    test('renders the empty state when there are no notifications', () => {
        render(
            <NotificationsList
                notifications={[]}
                onMarkAsRead={() => {}}
                onRemove={() => {}}
            />,
        );

        expect(
            screen.getByText('No notifications to display'),
        ).toBeInTheDocument();
    });

    test('renders a NotificationItem for each notification', () => {
        const notifications = [
            makeNotification({ id: 1, title: 'First notification' }),
            makeNotification({ id: 2, title: 'Second notification' }),
            makeNotification({ id: 3, title: 'Third notification' }),
        ];
        render(
            <NotificationsList
                notifications={notifications}
                onMarkAsRead={() => {}}
                onRemove={() => {}}
            />,
        );

        expect(screen.getByText('First notification')).toBeInTheDocument();
        expect(screen.getByText('Second notification')).toBeInTheDocument();
        expect(screen.getByText('Third notification')).toBeInTheDocument();
        expect(
            screen.queryByText('No notifications to display'),
        ).not.toBeInTheDocument();
    });

    test('propagates onMarkAsRead with the correct id from a rendered item', async () => {
        const user = userEvent.setup();
        const onMarkAsRead = vi.fn();
        const notifications = [
            makeNotification({ id: 1, title: 'First', read: false }),
            makeNotification({ id: 2, title: 'Second', read: false }),
        ];
        render(
            <NotificationsList
                notifications={notifications}
                onMarkAsRead={onMarkAsRead}
                onRemove={() => {}}
            />,
        );

        const unreadControls = screen.getAllByText('Unread');
        expect(unreadControls).toHaveLength(2);
        await user.click(unreadControls[1]);

        expect(onMarkAsRead).toHaveBeenCalledWith(2);
    });

    test('propagates onRemove with the correct id from a rendered item', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        const notifications = [
            makeNotification({ id: 1, title: 'First' }),
            makeNotification({ id: 2, title: 'Second' }),
        ];
        render(
            <NotificationsList
                notifications={notifications}
                onMarkAsRead={() => {}}
                onRemove={onRemove}
            />,
        );

        const deleteButtons = screen.getAllByRole('button', {
            name: 'Delete notification',
        });
        expect(deleteButtons).toHaveLength(2);
        await user.click(deleteButtons[1]);

        expect(onRemove).toHaveBeenCalledWith(2);
    });
});

describe('NotificationsList paging and states', () => {
    const items = [
        {
            id: 1,
            user_id: 1,
            type: 'info',
            title: 'Only one',
            message: 'm',
            read: false,
            action_url: '',
            created_at: '2026-04-14T10:00:00.000Z',
        } as Notification,
    ];
    const base = { onMarkAsRead: () => {}, onRemove: () => {} };

    afterEach(() => vi.unstubAllGlobals());

    test('shows a loading placeholder instead of the list', () => {
        render(<NotificationsList {...base} notifications={items} isLoading />);

        expect(screen.getByText('Loading notifications…')).toBeInTheDocument();
        expect(screen.queryByText('Only one')).not.toBeInTheDocument();
    });

    test('offers a Load more button while pages remain', async () => {
        const user = userEvent.setup();
        const onLoadMore = vi.fn();
        render(
            <NotificationsList
                {...base}
                notifications={items}
                hasMore
                onLoadMore={onLoadMore}
            />,
        );

        await user.click(screen.getByText('Load more'));

        expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    test('shows progress while the next page loads', () => {
        render(
            <NotificationsList
                {...base}
                notifications={items}
                hasMore
                isLoadingMore
            />,
        );

        expect(screen.getByText('Loading more…')).toBeInTheDocument();
    });

    test('loads the next page when the end of the list scrolls into view', () => {
        let trigger: (
            entries: { isIntersecting: boolean }[],
        ) => void = () => {};
        const disconnect = vi.fn();
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                constructor(callback: typeof trigger) {
                    trigger = callback;
                }
                observe() {}
                disconnect = disconnect;
            },
        );
        const onLoadMore = vi.fn();
        const { unmount } = render(
            <NotificationsList
                {...base}
                notifications={items}
                hasMore
                onLoadMore={onLoadMore}
            />,
        );

        trigger([{ isIntersecting: false }]);
        expect(onLoadMore).not.toHaveBeenCalled();

        trigger([{ isIntersecting: true }]);
        expect(onLoadMore).toHaveBeenCalledTimes(1);

        unmount();
        expect(disconnect).toHaveBeenCalled();
    });

    test('shows a retry control when loading failed', async () => {
        const user = userEvent.setup();
        const onRetry = vi.fn();
        render(
            <NotificationsList
                {...base}
                notifications={items}
                hasError
                onRetry={onRetry}
            />,
        );

        await user.click(screen.getByText('Retry'));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not load notifications.',
        );
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    test('shows the failure above the empty state when nothing loaded', () => {
        render(<NotificationsList {...base} notifications={[]} hasError />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
            screen.getByText('No notifications to display'),
        ).toBeInTheDocument();
    });

    test('marks the selected rows in selection mode', () => {
        render(
            <NotificationsList
                {...base}
                notifications={items}
                selectable
                selectedIds={new Set([1])}
                onToggleSelect={() => {}}
            />,
        );

        expect(screen.getByRole('checkbox')).toBeChecked();
    });
});
