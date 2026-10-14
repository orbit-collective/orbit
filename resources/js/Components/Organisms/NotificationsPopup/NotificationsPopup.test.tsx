import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Notification } from '@/types/Notification';
import NotificationsPopup from './NotificationsPopup';

const pageState = vi.hoisted(() => ({
    notifications: [] as Notification[],
    unread: 0,
}));
const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('axios', () => ({ default: { get: mocks.get } }));
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'John Doe', email: 'john@acme.com' } },
            notifications: pageState.notifications,
            notificationUnreadCount: pageState.unread,
        },
    }),
    router: { post: mocks.post, delete: mocks.delete },
}));

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

describe('NotificationsPopup Component', () => {
    beforeEach(() => {
        pageState.notifications = [];
        pageState.unread = 0;
        mocks.get.mockReset();
        mocks.post.mockReset();
        mocks.delete.mockReset();
    });

    test('renders the empty state when there are no notifications', () => {
        render(<NotificationsPopup />);

        expect(
            screen.getByText('No notifications to display'),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Mark all as read')).toBeDisabled();
    });

    test('renders the shared notifications and the server-side unread count', () => {
        pageState.notifications = [
            makeNotification({ id: 1, title: 'First', read: false }),
            makeNotification({ id: 2, title: 'Second', read: true }),
        ];
        pageState.unread = 42;
        render(<NotificationsPopup />);

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('42 unread')).toBeInTheDocument();
    });

    test('fetches the unread view from the server when the toggle is switched on', async () => {
        const user = userEvent.setup();
        pageState.notifications = [
            makeNotification({ id: 1, title: 'Read one', read: true }),
            makeNotification({ id: 2, title: 'Unread one', read: false }),
        ];
        mocks.get.mockResolvedValue({
            data: {
                data: [makeNotification({ id: 2, title: 'Unread one' })],
                next_cursor: null,
                unread_count: 1,
            },
        });
        render(<NotificationsPopup />);

        await user.click(screen.getByLabelText('Only show unread'));

        await waitFor(() =>
            expect(screen.queryByText('Read one')).not.toBeInTheDocument(),
        );
        expect(screen.getByText('Unread one')).toBeInTheDocument();
        expect(mocks.get).toHaveBeenCalledWith(
            '/notifications',
            expect.objectContaining({
                params: expect.objectContaining({ unread: 1 }),
            }),
        );
    });

    test('fetches by type when a filter tab is clicked and says when nothing matches', async () => {
        const user = userEvent.setup();
        pageState.notifications = [
            makeNotification({ id: 1, title: 'Info one' }),
        ];
        mocks.get.mockResolvedValue({
            data: { data: [], next_cursor: null, unread_count: 1 },
        });
        render(<NotificationsPopup />);

        await user.click(screen.getByText('Error'));

        expect(
            await screen.findByText('No notifications match these filters'),
        ).toBeInTheDocument();
        expect(mocks.get).toHaveBeenCalledWith(
            '/notifications',
            expect.objectContaining({
                params: expect.objectContaining({ type: 'error' }),
            }),
        );
    });

    test('loads older notifications on demand', async () => {
        const user = userEvent.setup();
        pageState.notifications = Array.from({ length: 20 }, (_, i) =>
            makeNotification({ id: 100 - i, title: `Item ${100 - i}` }),
        );
        mocks.get.mockResolvedValue({
            data: {
                data: [makeNotification({ id: 80, title: 'Older item' })],
                next_cursor: null,
                unread_count: 21,
            },
        });
        render(<NotificationsPopup />);

        await user.click(screen.getByText('Load more'));

        expect(await screen.findByText('Older item')).toBeInTheDocument();
        expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    });

    test('marks everything as read via the header button', async () => {
        const user = userEvent.setup();
        pageState.notifications = [makeNotification({ id: 1, read: false })];
        pageState.unread = 1;
        render(<NotificationsPopup />);

        await user.click(screen.getByLabelText('Mark all as read'));

        expect(mocks.post).toHaveBeenCalledWith(
            '/notifications/mark-all-read',
            {},
            expect.any(Object),
        );
        expect(screen.queryByText('1 unread')).not.toBeInTheDocument();
    });

    test('marks a single notification as read via the "Unread" status control', async () => {
        const user = userEvent.setup();
        pageState.notifications = [makeNotification({ id: 9, read: false })];
        pageState.unread = 1;
        render(<NotificationsPopup />);

        await user.click(screen.getByText('Unread'));

        expect(mocks.post).toHaveBeenCalledWith(
            '/notifications/bulk-read',
            { ids: [9] },
            expect.any(Object),
        );
        expect(screen.getByText('Read')).toBeInTheDocument();
    });

    test('deletes a single notification', async () => {
        const user = userEvent.setup();
        pageState.notifications = [makeNotification({ id: 5, title: 'Bye' })];
        render(<NotificationsPopup />);

        await user.click(screen.getByLabelText('Delete notification'));

        expect(mocks.delete).toHaveBeenCalledWith(
            '/notifications/5',
            expect.any(Object),
        );
        expect(screen.queryByText('Bye')).not.toBeInTheDocument();
    });

    describe('selection mode', () => {
        const setup = async () => {
            const user = userEvent.setup();
            pageState.notifications = [
                makeNotification({ id: 1, title: 'One', read: false }),
                makeNotification({ id: 2, title: 'Two', read: false }),
                makeNotification({ id: 3, title: 'Three', read: true }),
            ];
            pageState.unread = 2;
            render(<NotificationsPopup />);
            await user.click(screen.getByLabelText('Select notifications'));
            return user;
        };

        test('selects several notifications and deletes them in one request', async () => {
            const user = await setup();

            const boxes = screen.getAllByRole('checkbox');
            await user.click(boxes[0]);
            await user.click(boxes[2]);
            expect(screen.getByText('2 selected')).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: /^delete$/i }));

            expect(mocks.post).toHaveBeenCalledWith(
                '/notifications/bulk-delete',
                { ids: [1, 3] },
                expect.any(Object),
            );
            expect(screen.queryByText('One')).not.toBeInTheDocument();
            expect(screen.queryByText('Three')).not.toBeInTheDocument();
            expect(screen.getByText('Two')).toBeInTheDocument();
            expect(screen.getByText('0 selected')).toBeInTheDocument();
        });

        test('marks the selection as read', async () => {
            const user = await setup();

            await user.click(screen.getByText('Select all'));
            await user.click(
                screen.getByRole('button', { name: /mark read/i }),
            );

            expect(mocks.post).toHaveBeenCalledWith(
                '/notifications/bulk-read',
                { ids: [1, 2] },
                expect.any(Object),
            );
        });

        test('cancelling leaves selection mode and clears the selection', async () => {
            const user = await setup();

            await user.click(screen.getAllByRole('checkbox')[0]);
            await user.click(screen.getByLabelText('Cancel selection'));

            expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
            expect(
                screen.queryByRole('toolbar', { name: 'Selection actions' }),
            ).not.toBeInTheDocument();
        });

        test('the header toggle also leaves selection mode', async () => {
            const user = await setup();

            await user.click(screen.getByLabelText('Select notifications'));

            expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        });
    });

    test('deletes all read notifications after a confirmation', async () => {
        const user = userEvent.setup();
        pageState.notifications = [
            makeNotification({ id: 1, title: 'Fresh one', read: false }),
            makeNotification({ id: 2, title: 'Done', read: true }),
        ];
        render(<NotificationsPopup />);

        await user.click(screen.getByText('Delete all read'));
        await user.click(
            within(
                screen.getByText('Delete every read notification?')
                    .parentElement!,
            ).getByText('Delete'),
        );

        expect(mocks.delete).toHaveBeenCalledWith(
            '/notifications/read',
            expect.any(Object),
        );
        expect(screen.queryByText('Done')).not.toBeInTheDocument();
        expect(screen.getByText('Fresh one')).toBeInTheDocument();
    });

    test('does not offer to delete read notifications when none are loaded', () => {
        pageState.notifications = [makeNotification({ id: 1, read: false })];
        render(<NotificationsPopup />);

        expect(screen.queryByText('Delete all read')).not.toBeInTheDocument();
    });
});
