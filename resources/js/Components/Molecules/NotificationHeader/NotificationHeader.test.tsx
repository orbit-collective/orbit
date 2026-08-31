import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import NotificationHeader from './NotificationHeader';

describe('NotificationHeader Component', () => {
    test('renders the title without an unread count or disables mark-all when unreadCount is 0', () => {
        render(
            <NotificationHeader
                unreadCount={0}
                onlyUnread={false}
                onToggleOnlyUnread={() => {}}
                onMarkAllAsRead={() => {}}
            />,
        );

        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
        expect(screen.getByLabelText('Mark all as read')).toBeDisabled();
    });

    test('shows the unread count and enables mark-all when there are unread notifications', () => {
        render(
            <NotificationHeader
                unreadCount={5}
                onlyUnread={false}
                onToggleOnlyUnread={() => {}}
                onMarkAllAsRead={() => {}}
            />,
        );

        expect(screen.getByText('5 unread')).toBeInTheDocument();
        expect(screen.getByLabelText('Mark all as read')).toBeEnabled();
    });

    test('calls onMarkAllAsRead when the mark all as read button is clicked', async () => {
        const user = userEvent.setup();
        const onMarkAllAsRead = vi.fn();
        render(
            <NotificationHeader
                unreadCount={3}
                onlyUnread={false}
                onToggleOnlyUnread={() => {}}
                onMarkAllAsRead={onMarkAllAsRead}
            />,
        );

        await user.click(screen.getByLabelText('Mark all as read'));

        expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
    });

    test('calls onToggleOnlyUnread with the inverted value when the toggle is clicked', async () => {
        const user = userEvent.setup();
        const onToggleOnlyUnread = vi.fn();
        render(
            <NotificationHeader
                unreadCount={0}
                onlyUnread={false}
                onToggleOnlyUnread={onToggleOnlyUnread}
                onMarkAllAsRead={() => {}}
            />,
        );

        await user.click(screen.getByLabelText('Only show unread'));

        expect(onToggleOnlyUnread).toHaveBeenCalledWith(true);
    });

    test('reflects the onlyUnread state on the filter toggle', () => {
        const { rerender } = render(
            <NotificationHeader
                unreadCount={0}
                onlyUnread={false}
                onToggleOnlyUnread={() => {}}
                onMarkAllAsRead={() => {}}
            />,
        );

        const toggle = screen.getByLabelText('Only show unread');
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        rerender(
            <NotificationHeader
                unreadCount={0}
                onlyUnread={true}
                onToggleOnlyUnread={() => {}}
                onMarkAllAsRead={() => {}}
            />,
        );

        expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });
});
