import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import AccountSettingsIntegrationsTab from './AccountSettingsIntegrationsTab';

describe('AccountSettingsIntegrationsTab', () => {
    test('renders a card for every integration', () => {
        render(<AccountSettingsIntegrationsTab />);

        expect(screen.getByText('Discord')).toBeInTheDocument();
        expect(screen.getByText('Slack')).toBeInTheDocument();
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.getByText('Google Drive')).toBeInTheDocument();
        expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    });

    test('opens the detail modal when a card is clicked', async () => {
        render(<AccountSettingsIntegrationsTab />);

        await userEvent.click(screen.getByText('Discord'));

        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Close' }),
        ).toBeInTheDocument();
    });

    test('closing the modal removes it from the document', async () => {
        render(<AccountSettingsIntegrationsTab />);

        await userEvent.click(screen.getByText('Discord'));
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });

    test('toggling an available integration from the card updates the modal state too', async () => {
        render(<AccountSettingsIntegrationsTab />);

        const toggles = screen.getAllByRole('button', { name: '' });
        await userEvent.click(toggles[0]);
        await userEvent.click(screen.getByText('Discord'));

        expect(screen.getByText('Connected')).toBeInTheDocument();
    });
});
