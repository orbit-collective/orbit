import { AlertProvider } from '@/context/AlertContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import AccountSettingsSecurityTab from './AccountSettingsSecurityTab';

vi.stubGlobal(
    'route',
    vi.fn((name: string, params?: unknown) => `/${name}/${params ?? ''}`),
);

const { mockRouterPost, mockSessionLifetime } = vi.hoisted(() => ({
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
    mockSessionLifetime: { value: 480 },
}));

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({
            props: {
                flash: {},
                auth: {
                    user: { session_lifetime: mockSessionLifetime.value },
                },
            },
        }),
        router: { ...actual.router, post: mockRouterPost },
    };
});

const renderTab = () =>
    render(
        <AlertProvider>
            <AccountSettingsSecurityTab />
        </AlertProvider>,
    );

describe('AccountSettingsSecurityTab', () => {
    afterEach(() => {
        mockSessionLifetime.value = 480;
    });

    test('highlights the session expiry option matching the current user setting', () => {
        mockSessionLifetime.value = 1440;
        renderTab();

        const selected = screen.getByText('24 hours').closest('button');
        expect(selected).toHaveClass('border-[var(--accent-color)]');
    });

    test('selecting a different session expiry persists it and shows a success alert', async () => {
        renderTab();
        const user = userEvent.setup();

        await user.click(screen.getByText('7 days').closest('button')!);

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/account.session-lifetime.update/10080',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.getByText('Session expiry has been updated.'),
        ).toBeInTheDocument();
    });

    test('selecting the already-active option does not send a request', async () => {
        renderTab();
        const user = userEvent.setup();

        await user.click(screen.getByText('8 hours').closest('button')!);

        expect(mockRouterPost).not.toHaveBeenCalled();
    });
});
