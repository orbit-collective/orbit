import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import AccountSettingsIntegrationsTab from './AccountSettingsIntegrationsTab';

describe('AccountSettingsIntegrationsTab', () => {
    test('renders a card for every integration', () => {
        render(<AccountSettingsIntegrationsTab />);

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Slack' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'GitHub' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Google Drive' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Google Calendar' }),
        ).toBeInTheDocument();
    });

    test('opens the detail modal when a card is clicked', async () => {
        render(<AccountSettingsIntegrationsTab />);

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));

        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Close' }),
        ).toBeInTheDocument();
    });

    test('closing the modal removes it from the document', async () => {
        render(<AccountSettingsIntegrationsTab />);

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });

    test('toggling an available integration from the card updates the modal state too', async () => {
        render(<AccountSettingsIntegrationsTab />);

        const toggles = screen.getAllByRole('button', { name: '' });
        await userEvent.click(toggles[0]);
        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));

        expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    test('filters the grid down to the selected category', async () => {
        render(<AccountSettingsIntegrationsTab />);

        expect(
            screen.getByRole('heading', { name: 'Google Drive' }),
        ).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: /^Communication/ }),
        );

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Google Drive' }),
        ).not.toBeInTheDocument();
    });

    test('the "All" filter is selected by default and shows every integration', () => {
        render(<AccountSettingsIntegrationsTab />);

        expect(screen.getByRole('button', { name: /^All/ })).toHaveClass(
            'bg-[var(--accent-color)]',
        );
    });

    test('switching back to "All" restores every integration', async () => {
        render(<AccountSettingsIntegrationsTab />);

        await userEvent.click(screen.getByRole('button', { name: /^Storage/ }));
        await userEvent.click(screen.getByRole('button', { name: /^All/ }));

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Google Drive' }),
        ).toBeInTheDocument();
    });
});
