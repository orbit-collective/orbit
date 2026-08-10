import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import AccountSettingsNotificationsTab from './AccountSettingsNotificationsTab';

describe('AccountSettingsNotificationsTab', () => {
    test('renders each notification type with its in-app and email toggles', () => {
        render(<AccountSettingsNotificationsTab />);

        expect(screen.getByText('Assigned issues')).toBeInTheDocument();
        expect(screen.getByText('Issue updates')).toBeInTheDocument();
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Project digest')).toBeInTheDocument();
    });

    test('toggling a notification type in-app switch flips only that row', async () => {
        render(<AccountSettingsNotificationsTab />);

        const commentsRow = screen
            .getByText('Comments')
            .closest('div.flex.flex-col')!;
        const inAppToggle = commentsRow.querySelectorAll(
            'button[type="button"]',
        )[0];

        expect(inAppToggle).toHaveClass('bg-[var(--accent-color)]');

        await userEvent.click(inAppToggle);

        expect(inAppToggle).toHaveClass('bg-[var(--bg-light-color)]');
    });

    test('toggling a notification type email switch does not affect other rows', async () => {
        render(<AccountSettingsNotificationsTab />);

        const commentsRow = screen
            .getByText('Comments')
            .closest('div.flex.flex-col')!;
        const emailToggle = commentsRow.querySelectorAll(
            'button[type="button"]',
        )[1];
        const digestRow = screen
            .getByText('Project digest')
            .closest('div.flex.flex-col')!;
        const digestEmailToggle = digestRow.querySelectorAll(
            'button[type="button"]',
        )[1];

        await userEvent.click(emailToggle);

        expect(emailToggle).toHaveClass('bg-[var(--accent-color)]');
        expect(digestEmailToggle).toHaveClass('bg-[var(--bg-light-color)]');
    });
});
