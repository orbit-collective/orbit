import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    live: { enabled: true } as { enabled: boolean },
    addAlert: vi.fn(),
    permission: 'default' as string,
    enabled: false,
    enable: vi.fn(),
    disable: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { live: mocks.live } }),
}));
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: mocks.addAlert }),
}));
vi.mock('@/utils/browserNotifications', () => ({
    browserNotificationPermission: () => mocks.permission,
    browserNotificationsEnabled: () => mocks.enabled,
    enableBrowserNotifications: mocks.enable,
    disableBrowserNotifications: mocks.disable,
}));

import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
import AccountSettingsBrowserNotifications from './AccountSettingsBrowserNotifications';

const toggle = () =>
    screen.getByRole('switch', { name: 'Show browser notifications' });

describe('AccountSettingsBrowserNotifications', () => {
    beforeEach(() => {
        mocks.live = { enabled: true };
        mocks.permission = 'default';
        mocks.enabled = false;
        mocks.enable.mockReset();
        mocks.disable.mockReset();
        mocks.addAlert.mockReset();
    });

    test('is hidden while live updates are off', () => {
        mocks.live = { enabled: false };
        const { container } = render(<AccountSettingsBrowserNotifications />);

        expect(container).toBeEmptyDOMElement();
    });

    test('turns on after the browser grants permission', async () => {
        mocks.enable.mockResolvedValue(true);
        render(<AccountSettingsBrowserNotifications />);

        await userEvent.click(toggle());

        await waitFor(() => expect(toggle()).toBeChecked());
        expect(mocks.addAlert).not.toHaveBeenCalled();
    });

    test('stays off and explains when the browser refuses', async () => {
        mocks.enable.mockResolvedValue(false);
        render(<AccountSettingsBrowserNotifications />);

        await userEvent.click(toggle());

        await waitFor(() =>
            expect(mocks.addAlert).toHaveBeenCalledWith(
                expect.stringContaining('did not allow notifications'),
                'warning',
            ),
        );
        expect(toggle()).not.toBeChecked();
    });

    test('turns off without asking the browser anything', async () => {
        mocks.enabled = true;
        render(<AccountSettingsBrowserNotifications />);

        await userEvent.click(toggle());

        expect(mocks.disable).toHaveBeenCalled();
        expect(toggle()).not.toBeChecked();
        expect(mocks.enable).not.toHaveBeenCalled();
    });

    test('is disabled and says why when the site is blocked', () => {
        mocks.permission = 'denied';
        render(<AccountSettingsBrowserNotifications />);

        expect(toggle()).toBeDisabled();
        expect(screen.getByText(/blocked for this site/)).toBeInTheDocument();
    });

    test('is disabled in a browser without notifications', () => {
        mocks.permission = 'unsupported';
        render(<AccountSettingsBrowserNotifications />);

        expect(toggle()).toBeDisabled();
        expect(screen.getByText(/does not support/)).toBeInTheDocument();
    });

    test('folds from its header and a folded panel says whether notifications are on', () => {
        render(
            inSettingsPage(
                <AccountSettingsBrowserNotifications />,
                'notifications',
            ),
        );

        expectPanelsToFold([/Browser notifications/]);

        fireEvent.click(
            screen.getByRole('button', { name: /Browser notifications/ }),
        );
        expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
            'Off',
        );
    });
});
