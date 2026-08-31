import { Notification } from '@/types/Notification';
import { formattedDate } from '@/utils/time';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import PageHeader from './PageHeader';

const { reload } = vi.hoisted(() => ({
    reload: vi.fn(),
}));
const pageState = vi.hoisted(() => ({
    notifications: [] as Notification[],
}));

vi.mock('@/Components/Organisms/NotificationsPopup/NotificationsPopup', () => ({
    default: () => <div data-testid="notifications-popup" />,
}));

vi.mock('@inertiajs/react', () => ({
    router: {
        reload: reload,
    },
    usePage: () => ({
        props: { notifications: pageState.notifications },
    }),
}));

describe('PageHeader Component', () => {
    beforeEach(() => {
        pageState.notifications = [];
    });

    test('renders the provided title', () => {
        render(<PageHeader title="Dashboard" />);

        expect(
            screen.getByRole('heading', { name: 'Dashboard' }),
        ).toBeInTheDocument();
    });

    test('renders the current formatted date', () => {
        render(<PageHeader title="Dashboard" />);

        expect(screen.getByText(formattedDate())).toBeInTheDocument();
    });

    test('renders bell and settings icon buttons', () => {
        const { container } = render(<PageHeader title="Dashboard" />);

        expect(container.querySelector('.lucide-bell')).toBeInTheDocument();
        expect(container.querySelector('.lucide-settings')).toBeInTheDocument();
    });

    test('renders children alongside the header actions', () => {
        render(
            <PageHeader title="Dashboard">
                <button>New Issue</button>
            </PageHeader>,
        );

        expect(
            screen.getByRole('button', { name: 'New Issue' }),
        ).toBeInTheDocument();
    });

    test('does not show the notifications popup by default', () => {
        render(<PageHeader title="Dashboard" />);

        expect(
            screen.queryByTestId('notifications-popup'),
        ).not.toBeInTheDocument();
    });

    test('toggles the notifications popup when the bell button is clicked', async () => {
        const user = userEvent.setup();
        const { container } = render(<PageHeader title="Dashboard" />);

        const bellButton = container
            .querySelector('.lucide-bell')
            ?.closest('button') as HTMLElement;

        await user.click(bellButton);
        expect(screen.getByTestId('notifications-popup')).toBeInTheDocument();

        await user.click(bellButton);
        expect(
            screen.queryByTestId('notifications-popup'),
        ).not.toBeInTheDocument();
    });

    test('closes the notifications popup when Escape is pressed', async () => {
        const user = userEvent.setup();
        const { container } = render(<PageHeader title="Dashboard" />);

        const bellButton = container
            .querySelector('.lucide-bell')
            ?.closest('button') as HTMLElement;
        await user.click(bellButton);
        expect(screen.getByTestId('notifications-popup')).toBeInTheDocument();

        await user.keyboard('{Escape}');

        expect(
            screen.queryByTestId('notifications-popup'),
        ).not.toBeInTheDocument();
    });

    test('closes the notifications popup when clicking outside of it', async () => {
        const user = userEvent.setup();
        const { container } = render(<PageHeader title="Dashboard" />);

        const bellButton = container
            .querySelector('.lucide-bell')
            ?.closest('button') as HTMLElement;
        await user.click(bellButton);
        expect(screen.getByTestId('notifications-popup')).toBeInTheDocument();

        await user.click(document.body);

        expect(
            screen.queryByTestId('notifications-popup'),
        ).not.toBeInTheDocument();
    });

    test('does not show an unread badge when there are no unread notifications', () => {
        pageState.notifications = [{ id: 1, read: true } as Notification];
        const { container } = render(<PageHeader title="Dashboard" />);

        const bellButton = container
            .querySelector('.lucide-bell')
            ?.closest('button') as HTMLElement;

        expect(bellButton.querySelector('span')).not.toBeInTheDocument();
    });

    test('shows the unread notifications count as a badge on the bell icon', () => {
        pageState.notifications = [
            { id: 1, read: false } as Notification,
            { id: 2, read: false } as Notification,
            { id: 3, read: true } as Notification,
        ];
        render(<PageHeader title="Dashboard" />);

        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('caps the unread badge at "9+"', () => {
        pageState.notifications = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            read: false,
        })) as Notification[];
        render(<PageHeader title="Dashboard" />);

        expect(screen.getByText('9+')).toBeInTheDocument();
    });

    test('reserves left space for the mobile sidebar toggle', () => {
        const { container } = render(<PageHeader title="Dashboard" />);

        expect(container.querySelector('header')).toHaveClass('pl-16');
    });

    test('truncates a long title instead of pushing actions off-screen', () => {
        render(<PageHeader title="A very long dashboard title" />);

        expect(
            screen.getByRole('heading', {
                name: 'A very long dashboard title',
            }),
        ).toHaveClass('truncate');
    });

    test('renders the title icon when provided', () => {
        const { container } = render(
            <PageHeader title="Dashboard" icon="LayoutDashboard" />,
        );

        expect(
            container.querySelector('.lucide-layout-dashboard'),
        ).toBeInTheDocument();
    });

    test('reloads the page when Refresh is clicked', async () => {
        const user = userEvent.setup();
        render(<PageHeader title="Dashboard" />);

        await user.click(screen.getByRole('button', { name: /refresh/i }));

        expect(reload).toHaveBeenCalled();
    });

    test('does not render a primary action button by default', () => {
        render(<PageHeader title="Dashboard" />);

        expect(
            screen.queryByRole('button', { name: /new project/i }),
        ).not.toBeInTheDocument();
    });

    test('renders and triggers the primary action when provided', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(
            <PageHeader
                title="Dashboard"
                primaryAction={{
                    label: 'New Project',
                    icon: 'Plus',
                    onClick,
                }}
            />,
        );

        await user.click(screen.getByRole('button', { name: /new project/i }));

        expect(onClick).toHaveBeenCalled();
    });
});
