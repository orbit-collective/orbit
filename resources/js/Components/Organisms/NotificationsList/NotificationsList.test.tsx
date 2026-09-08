import { Notification } from '@/types/Notification';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
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
