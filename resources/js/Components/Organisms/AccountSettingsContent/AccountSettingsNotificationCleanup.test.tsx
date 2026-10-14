import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { NotificationRetention } from '@/types/Notification';
import AccountSettingsNotificationCleanup from './AccountSettingsNotificationCleanup';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { flash: {} } }),
    router: { post: mocks.post },
}));

type Options = {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
    onFinish?: () => void;
};

const succeed = (_url: string, _data: unknown, options?: Options) => {
    options?.onSuccess?.();
    options?.onFinish?.();
};

const retention = (
    overrides: Partial<NotificationRetention> = {},
): NotificationRetention => ({
    enabled: false,
    frequency: 'weekly',
    notifications_older_than_days: null,
    notifications_only_read: true,
    activity_older_than_days: null,
    last_run_at: null,
    ...overrides,
});

const renderCleanup = (value?: NotificationRetention) =>
    render(
        <AlertProvider>
            <AccountSettingsNotificationCleanup retention={value} />
        </AlertProvider>,
    );

const pick = async (
    user: ReturnType<typeof userEvent.setup>,
    triggerName: string,
    optionName: string,
) => {
    await user.click(screen.getByRole('button', { name: triggerName }));
    await user.click(screen.getByRole('option', { name: optionName }));
};

describe('AccountSettingsNotificationCleanup', () => {
    beforeEach(() => {
        mocks.post.mockReset();
        mocks.post.mockImplementation(succeed);
    });

    test('starts switched off with nothing to save', () => {
        renderCleanup(retention());

        expect(screen.getByText('Automatic clean-up')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Save schedule' }),
        ).toBeDisabled();
    });

    test('shows when the schedule last ran', () => {
        renderCleanup(
            retention({
                enabled: true,
                last_run_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
            }),
        );

        expect(screen.getByText('Last ran 3h ago.')).toBeInTheDocument();
    });

    test('says a schedule that never ran has not run yet', () => {
        renderCleanup(retention({ enabled: true }));

        expect(screen.getByText('Has not run yet.')).toBeInTheDocument();
    });

    test('saves the edited schedule', async () => {
        const user = userEvent.setup();
        renderCleanup(retention());

        await user.click(
            screen.getByRole('switch', { name: 'Run clean-up automatically' }),
        );
        await pick(user, 'Frequency', 'Every month');
        await pick(user, 'Notification age', '30 days');
        await pick(user, 'Activity age', '90 days');
        await user.click(screen.getByRole('button', { name: 'Save schedule' }));

        expect(mocks.post).toHaveBeenCalledWith(
            '/account.notification-retention.update',
            {
                enabled: true,
                frequency: 'monthly',
                notifications_older_than_days: 30,
                notifications_only_read: true,
                activity_older_than_days: 90,
            },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.getByRole('button', { name: 'Save schedule' }),
        ).toBeDisabled();
    });

    test('can switch an age back to not deleting', async () => {
        const user = userEvent.setup();
        renderCleanup(retention({ notifications_older_than_days: 60 }));

        await pick(user, 'Notification age', "Don't delete");
        await user.click(screen.getByRole('button', { name: 'Save schedule' }));

        expect(mocks.post).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ notifications_older_than_days: null }),
            expect.any(Object),
        );
    });

    test('shows the server error and keeps the form dirty', async () => {
        const user = userEvent.setup();
        mocks.post.mockImplementation(
            (_url: string, _data: unknown, options?: Options) => {
                options?.onError?.({ enabled: 'Choose what to clean up.' });
                options?.onFinish?.();
            },
        );
        renderCleanup(retention());

        await user.click(
            screen.getByRole('switch', { name: 'Run clean-up automatically' }),
        );
        await user.click(screen.getByRole('button', { name: 'Save schedule' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Choose what to clean up.',
        );
        expect(
            screen.getByRole('button', { name: 'Save schedule' }),
        ).toBeEnabled();
    });

    test('purges notifications only after a confirmation, honouring keep-unread', async () => {
        const user = userEvent.setup();
        renderCleanup(retention());
        const row = screen
            .getByText('Delete old notifications')
            .closest('div.flex-col') as HTMLElement;

        await user.click(within(row).getByRole('button', { name: 'Delete' }));
        expect(mocks.post).not.toHaveBeenCalled();

        await user.click(within(row).getByRole('button', { name: 'Confirm' }));

        expect(mocks.post).toHaveBeenCalledWith(
            '/account.notification-retention.purge',
            { target: 'notifications', days: 30, only_read: true },
            expect.any(Object),
        );
        expect(
            within(row).getByRole('button', { name: 'Delete' }),
        ).toBeInTheDocument();
    });

    test('purges activity history with the chosen age', async () => {
        const user = userEvent.setup();
        renderCleanup(retention());
        const row = screen
            .getByText('Delete old activity history')
            .closest('div.flex-col') as HTMLElement;

        await user.click(
            within(row).getByRole('button', { name: 'Older than' }),
        );
        await user.click(screen.getByRole('option', { name: '14 days' }));
        await user.click(within(row).getByRole('button', { name: 'Delete' }));
        await user.click(within(row).getByRole('button', { name: 'Confirm' }));

        expect(mocks.post).toHaveBeenCalledWith(
            '/account.notification-retention.purge',
            { target: 'activity', days: 14, only_read: true },
            expect.any(Object),
        );
    });

    test('cancelling a purge confirmation sends nothing', async () => {
        const user = userEvent.setup();
        renderCleanup(retention());
        const row = screen
            .getByText('Delete old notifications')
            .closest('div.flex-col') as HTMLElement;

        await user.click(within(row).getByRole('button', { name: 'Delete' }));
        await user.click(within(row).getByRole('button', { name: 'Cancel' }));

        expect(mocks.post).not.toHaveBeenCalled();
    });

    test('warns that unread notifications go too when keep-unread is off', () => {
        renderCleanup(retention({ notifications_only_read: false }));

        expect(
            screen.getByText('Unread notifications are deleted too.'),
        ).toBeInTheDocument();
    });

    test('names both switches for assistive technology', () => {
        renderCleanup(retention({ enabled: true }));

        expect(
            screen.getByRole('switch', { name: 'Run clean-up automatically' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(
            screen.getByRole('switch', { name: 'Keep unread notifications' }),
        ).toHaveAttribute('aria-checked', 'true');
    });
});
