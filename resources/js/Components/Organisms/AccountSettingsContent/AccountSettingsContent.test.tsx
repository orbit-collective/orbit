import { AccentProvider } from '@/context/AccentContext';
import { AlertProvider } from '@/context/AlertContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsContent from './AccountSettingsContent';

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

describe('AccountSettingsContent', () => {
    test('renders preferences content', () => {
        render(
            <ThemeProvider>
                <AccentProvider>
                    <AccountSettingsContent tabId="preferences" />
                </AccentProvider>
            </ThemeProvider>,
        );

        expect(screen.getByText('Default issue view')).toBeInTheDocument();
        expect(screen.getByText('Board')).toBeInTheDocument();
        expect(screen.getByText('Interface theme')).toBeInTheDocument();
        expect(screen.getByText('System sync')).toBeInTheDocument();
    });

    test('renders profile content', () => {
        render(
            <AlertProvider>
                <AccountSettingsContent tabId="profile" />
            </AlertProvider>,
        );

        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Live preview')).toBeInTheDocument();
    });

    test('profile: shows initials when no photo is set, and disables the reset control', () => {
        render(
            <AlertProvider>
                <AccountSettingsContent tabId="profile" />
            </AlertProvider>,
        );

        expect(screen.getAllByText('JD').length).toBeGreaterThan(0);
        expect(
            screen.getByRole('button', { name: 'Reset to default' }),
        ).toBeDisabled();
    });

    test('profile: editing the username updates the live preview and initials', async () => {
        render(
            <AlertProvider>
                <AccountSettingsContent tabId="profile" />
            </AlertProvider>,
        );
        const user = userEvent.setup();

        const usernameInput = screen.getByPlaceholderText('Your name');
        await user.clear(usernameInput);
        await user.type(usernameInput, 'Ada Lovelace');

        expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
        expect(screen.getAllByText('AL').length).toBeGreaterThan(0);
    });

    test('renders notifications content', () => {
        render(<AccountSettingsContent tabId="notifications" />);

        expect(screen.getByText('Activity notifications')).toBeInTheDocument();
        expect(screen.getByText('Digest frequency')).toBeInTheDocument();
    });

    test('renders security and access content', () => {
        render(
            <AlertProvider>
                <AccountSettingsContent tabId="security-access" />
            </AlertProvider>,
        );

        expect(screen.getByText('Password')).toBeInTheDocument();
        expect(screen.getByText('Active sessions')).toBeInTheDocument();
        expect(screen.getByText('Session expiry')).toBeInTheDocument();
        expect(screen.getAllByText('Delete account').length).toBeGreaterThan(0);
    });

    test('renders integrations content', () => {
        render(<AccountSettingsContent tabId="integrations" />);

        expect(screen.getByText('Connected services')).toBeInTheDocument();
        expect(screen.getByText('Developer access')).toBeInTheDocument();
    });

    test('renders export content', () => {
        render(<AccountSettingsContent tabId="export" />);

        expect(screen.getByText('Export data')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Delete account' }),
        ).toBeInTheDocument();
    });
});
