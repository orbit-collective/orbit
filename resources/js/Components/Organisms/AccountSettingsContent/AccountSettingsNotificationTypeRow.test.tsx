import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsNotificationTypeRow from './AccountSettingsNotificationTypeRow';

describe('AccountSettingsNotificationTypeRow', () => {
    test('renders the title and description', () => {
        render(
            <AccountSettingsNotificationTypeRow
                icon="Bell"
                title="Assigned issues"
                description="When an issue is assigned to you."
                inAppChecked
                onInAppChange={() => {}}
                emailChecked={false}
                onEmailChange={() => {}}
            />,
        );

        expect(screen.getByText('Assigned issues')).toBeInTheDocument();
        expect(
            screen.getByText('When an issue is assigned to you.'),
        ).toBeInTheDocument();
    });

    test('toggling the in-app switch calls onInAppChange with the opposite value', async () => {
        const onInAppChange = vi.fn();
        render(
            <AccountSettingsNotificationTypeRow
                icon="Bell"
                title="Assigned issues"
                description="When an issue is assigned to you."
                inAppChecked
                onInAppChange={onInAppChange}
                emailChecked={false}
                onEmailChange={() => {}}
            />,
        );

        await userEvent.click(screen.getAllByRole('button')[0]);

        expect(onInAppChange).toHaveBeenCalledWith(false);
    });

    test('toggling the email switch calls onEmailChange with the opposite value', async () => {
        const onEmailChange = vi.fn();
        render(
            <AccountSettingsNotificationTypeRow
                icon="Bell"
                title="Assigned issues"
                description="When an issue is assigned to you."
                inAppChecked
                onInAppChange={() => {}}
                emailChecked={false}
                onEmailChange={onEmailChange}
            />,
        );

        await userEvent.click(screen.getAllByRole('button')[1]);

        expect(onEmailChange).toHaveBeenCalledWith(true);
    });
});
