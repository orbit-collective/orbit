import { AlertProvider } from '@/context/AlertContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsNotificationsTab from './AccountSettingsNotificationsTab';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

const { mockRouterPost } = vi.hoisted(() => ({
    mockRouterPost: vi.fn(
        (
            _url: string,
            _data?: unknown,
            opts?: { onSuccess?: () => void; onFinish?: () => void },
        ) => {
            opts?.onSuccess?.();
            opts?.onFinish?.();
        },
    ),
}));

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
        router: { ...actual.router, post: mockRouterPost },
    };
});

const renderTab = (
    notificationSettings?: Parameters<
        typeof AccountSettingsNotificationsTab
    >[0]['notificationSettings'],
) =>
    render(
        <AlertProvider>
            <AccountSettingsNotificationsTab
                notificationSettings={notificationSettings}
            />
        </AlertProvider>,
    );

describe('AccountSettingsNotificationsTab', () => {
    test('renders each notification type with its in-app and email toggles', () => {
        renderTab();

        expect(screen.getByText('Assigned issues')).toBeInTheDocument();
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Mentions')).toBeInTheDocument();
        expect(screen.getByText('Status changes')).toBeInTheDocument();
        expect(screen.getByText('Priority changes')).toBeInTheDocument();
        expect(screen.getByText('Label updates')).toBeInTheDocument();
        expect(screen.getByText('Schedule changes')).toBeInTheDocument();
        expect(screen.getByText('Other issue updates')).toBeInTheDocument();
        expect(screen.getByText('Project invitations')).toBeInTheDocument();
        expect(screen.getByText('Integration activity')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(20);
    });

    test('without a notificationSettings prop, defaults to in-app enabled and email disabled', () => {
        renderTab();

        const toggles = screen.getAllByRole('button');

        expect(toggles[0]).toHaveClass('bg-[var(--accent-color)]');
        expect(toggles[1]).toHaveClass('bg-[var(--bg-light-color)]');
    });

    test('hydrates toggles from the notificationSettings prop', () => {
        renderTab({
            issue_assigned: { in_app: false, email: true },
        });

        const toggles = screen.getAllByRole('button');

        expect(toggles[0]).toHaveClass('bg-[var(--bg-light-color)]');
        expect(toggles[1]).toHaveClass('bg-[var(--accent-color)]');
    });

    test('toggling a switch persists it immediately and shows a success alert', async () => {
        renderTab();

        const toggles = screen.getAllByRole('button');
        await userEvent.click(toggles[0]);

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/account.notification-settings.update',
            {
                settings: {
                    issue_assigned: { in_app: false, email: false },
                },
            },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.getByText('Notification settings updated successfully.'),
        ).toBeInTheDocument();
    });

    test('toggling a notification type flips only that row', async () => {
        renderTab();

        const toggles = screen.getAllByRole('button');
        const commentsInAppToggle = toggles[2];
        const otherToggle = toggles[0];

        expect(commentsInAppToggle).toHaveClass('bg-[var(--accent-color)]');

        await userEvent.click(commentsInAppToggle);

        expect(commentsInAppToggle).toHaveClass('bg-[var(--bg-light-color)]');
        expect(otherToggle).toHaveClass('bg-[var(--accent-color)]');
    });

    test('reverts the toggle and shows an error alert when the request fails', async () => {
        mockRouterPost.mockImplementationOnce(
            (
                _url: string,
                _data?: unknown,
                opts?: { onError?: () => void; onFinish?: () => void },
            ) => {
                opts?.onError?.();
                opts?.onFinish?.();
            },
        );
        renderTab();

        const toggles = screen.getAllByRole('button');
        await userEvent.click(toggles[0]);

        expect(toggles[0]).toHaveClass('bg-[var(--accent-color)]');
        expect(
            screen.getByText('Failed to update notification settings.'),
        ).toBeInTheDocument();
    });
});
