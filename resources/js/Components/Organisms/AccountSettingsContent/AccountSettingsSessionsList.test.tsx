import { AlertProvider } from '@/context/AlertContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsSessionsList from './AccountSettingsSessionsList';

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
    };
});

const renderList = () =>
    render(
        <AlertProvider>
            <AccountSettingsSessionsList />
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

    test('revoking a session removes it from the list', async () => {
        renderList();
        const user = userEvent.setup();

        expect(screen.getByText('iPhone 15 · Safari')).toBeInTheDocument();

        await user.click(screen.getAllByRole('button', { name: 'Revoke' })[0]);

        expect(
            screen.queryByText('iPhone 15 · Safari'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('Signed out of "iPhone 15 · Safari".'),
        ).toBeInTheDocument();
    });

    test('"Sign out of all other sessions" clears every non-current session', async () => {
        renderList();
        const user = userEvent.setup();

        await user.click(
            screen.getByRole('button', {
                name: 'Sign out of all other sessions',
            }),
        );

        expect(screen.queryAllByRole('button', { name: 'Revoke' }).length).toBe(
            0,
        );
        expect(screen.getByText('This device')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', {
                name: 'Sign out of all other sessions',
            }),
        ).not.toBeInTheDocument();
    });
});
