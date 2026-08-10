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
        expect(screen.getAllByRole('button')).toHaveLength(8);
    });

    test('toggling a notification type in-app switch flips only that row', async () => {
        render(<AccountSettingsNotificationsTab />);

        // Rows render in order: assigned issues, issue updates, comments, project digest.
        // Comments is the third row, so its in-app toggle is the 5th button overall.
        const toggles = screen.getAllByRole('button');
        const commentsInAppToggle = toggles[4];
        const otherToggle = toggles[0];

        expect(commentsInAppToggle).toHaveClass('bg-[var(--accent-color)]');

        await userEvent.click(commentsInAppToggle);

        expect(commentsInAppToggle).toHaveClass('bg-[var(--bg-light-color)]');
        expect(otherToggle).toHaveClass('bg-[var(--accent-color)]');
    });

    test('toggling a notification type email switch does not affect other rows', async () => {
        render(<AccountSettingsNotificationsTab />);

        const toggles = screen.getAllByRole('button');
        const commentsEmailToggle = toggles[5];
        const digestEmailToggle = toggles[7];

        await userEvent.click(commentsEmailToggle);

        expect(commentsEmailToggle).toHaveClass('bg-[var(--accent-color)]');
        expect(digestEmailToggle).toHaveClass('bg-[var(--bg-light-color)]');
    });
});
