import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import AccountSettingsNotificationsTab from './AccountSettingsNotificationsTab';

describe('AccountSettingsNotificationsTab', () => {
    test('renders each notification type with its in-app and email toggles', () => {
        render(<AccountSettingsNotificationsTab />);

        expect(screen.getByText('Assigned issues')).toBeInTheDocument();
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Mentions')).toBeInTheDocument();
        expect(screen.getByText('Status changes')).toBeInTheDocument();
        expect(screen.getByText('Project invitations')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(10);
    });

    test('without a notificationSettings prop, defaults to in-app enabled and email disabled', () => {
        render(<AccountSettingsNotificationsTab />);

        const toggles = screen.getAllByRole('button');

        expect(toggles[0]).toHaveClass('bg-[var(--accent-color)]');
        expect(toggles[1]).toHaveClass('bg-[var(--bg-light-color)]');
    });

    test('hydrates toggles from the notificationSettings prop', () => {
        render(
            <AccountSettingsNotificationsTab
                notificationSettings={{
                    issue_assigned: { in_app: false, email: true },
                }}
            />,
        );

        // Assigned issues is the first row: in-app toggle then email toggle.
        const toggles = screen.getAllByRole('button');

        expect(toggles[0]).toHaveClass('bg-[var(--bg-light-color)]');
        expect(toggles[1]).toHaveClass('bg-[var(--accent-color)]');
    });

    test('toggling a notification type in-app switch flips only that row', async () => {
        render(<AccountSettingsNotificationsTab />);

        // Rows render in order: assigned issues, comments, mentions, status changes, project invitations.
        // Comments is the second row, so its in-app toggle is the 3rd button overall.
        const toggles = screen.getAllByRole('button');
        const commentsInAppToggle = toggles[2];
        const otherToggle = toggles[0];

        expect(commentsInAppToggle).toHaveClass('bg-[var(--accent-color)]');

        await userEvent.click(commentsInAppToggle);

        expect(commentsInAppToggle).toHaveClass('bg-[var(--bg-light-color)]');
        expect(otherToggle).toHaveClass('bg-[var(--accent-color)]');
    });

    test('toggling a notification type email switch does not affect other rows', async () => {
        render(<AccountSettingsNotificationsTab />);

        const toggles = screen.getAllByRole('button');
        const commentsEmailToggle = toggles[3];
        const invitationsEmailToggle = toggles[9];

        await userEvent.click(commentsEmailToggle);

        expect(commentsEmailToggle).toHaveClass('bg-[var(--accent-color)]');
        expect(invitationsEmailToggle).toHaveClass(
            'bg-[var(--bg-light-color)]',
        );
    });
});
