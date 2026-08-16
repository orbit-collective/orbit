import { AlertProvider } from '@/context/AlertContext';
import { Session } from '@/types/Users';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsSessionsList from './AccountSettingsSessionsList';

vi.stubGlobal(
    'route',
    vi.fn((name: string, params?: unknown) => `/${name}/${params ?? ''}`),
);

const { mockRouterDelete } = vi.hoisted(() => ({
    mockRouterDelete: vi.fn(
        (
            _url: string,
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
        router: { ...actual.router, delete: mockRouterDelete },
    };
});

const mockSessions: Session[] = [
    {
        id: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome on macOS',
        lastActiveAt: new Date().toISOString(),
        isCurrent: true,
    },
    {
        id: 'session-2',
        ipAddress: '192.168.1.2',
        userAgent: 'Safari on iOS',
        lastActiveAt: new Date().toISOString(),
        isCurrent: false,
    },
    {
        id: 'session-3',
        ipAddress: '192.168.1.3',
        userAgent: 'Edge on Windows',
        lastActiveAt: new Date().toISOString(),
        isCurrent: false,
    },
];

const renderList = (sessions: Session[] = mockSessions) =>
    render(
        <AlertProvider>
            <AccountSettingsSessionsList sessions={sessions} />
        </AlertProvider>,
    );

describe('AccountSettingsSessionsList', () => {
    test('marks the current device and offers revoke on the others', () => {
        renderList();

        expect(screen.getByText('This device')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Revoke' }).length).toBe(
            2,
        );
    });

    test('revoking a session calls the revoke endpoint and shows a success alert', async () => {
        renderList();
        const user = userEvent.setup();

        await user.click(screen.getAllByRole('button', { name: 'Revoke' })[0]);

        expect(mockRouterDelete).toHaveBeenCalledWith(
            '/account.sessions.revoke/session-2',
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.getByText('Signed out of "192.168.1.2".'),
        ).toBeInTheDocument();
    });

    test('"Sign out of all other sessions" calls the bulk revoke endpoint', async () => {
        renderList();
        const user = userEvent.setup();

        await user.click(
            screen.getByRole('button', {
                name: 'Sign out of all other sessions',
            }),
        );

        expect(mockRouterDelete).toHaveBeenCalledWith(
            '/account.sessions.revoke-others/',
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.getByText('Signed out of all other sessions.'),
        ).toBeInTheDocument();
    });
});
