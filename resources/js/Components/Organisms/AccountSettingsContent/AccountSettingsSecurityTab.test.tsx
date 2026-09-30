import { AlertProvider } from '@/context/AlertContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import AccountSettingsSecurityTab from './AccountSettingsSecurityTab';

vi.stubGlobal(
    'route',
    vi.fn((name: string, params?: unknown) => `/${name}/${params ?? ''}`),
);

const { mockRouterPost, mockRouterDelete, mockUser } = vi.hoisted(() => ({
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
    mockRouterDelete: vi.fn(
        (
            _url: string,
            opts?: { onSuccess?: () => void; onFinish?: () => void },
        ) => {
            opts?.onSuccess?.();
            opts?.onFinish?.();
        },
    ),
    mockUser: {
        session_lifetime: 480,
        github_username: null as string | null,
        has_password: true,
    },
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
                auth: { user: mockUser },
            },
        }),
        router: {
            ...actual.router,
            post: mockRouterPost,
            delete: mockRouterDelete,
        },
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
        mockUser.session_lifetime = 480;
        mockUser.github_username = null;
        mockUser.has_password = true;
    });

    test('highlights the session expiry option matching the current user setting', () => {
        mockUser.session_lifetime = 1440;
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

    test('offers to link GitHub when no account is linked', () => {
        renderTab();

        const link = screen.getByText('Link GitHub').closest('a');
        expect(link).toHaveAttribute('href', '/auth.github.redirect/');
    });

    test('shows the linked GitHub username and allows unlinking', async () => {
        mockUser.github_username = 'octocat';
        renderTab();
        const user = userEvent.setup();

        expect(screen.getByText(/Linked as @octocat/)).toBeInTheDocument();

        await user.click(screen.getByText('Unlink'));

        expect(mockRouterDelete).toHaveBeenCalledWith(
            '/auth.github.unlink/',
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.getByText('GitHub account unlinked.'),
        ).toBeInTheDocument();
    });

    test('disables unlinking when the account has no password set', () => {
        mockUser.github_username = 'octocat';
        mockUser.has_password = false;
        renderTab();

        expect(screen.getByText('Unlink').closest('button')).toBeDisabled();
    });
});
